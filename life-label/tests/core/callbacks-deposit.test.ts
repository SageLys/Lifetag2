// 回单与押金：即时/延迟一班/延迟两班/final、成功/失败、押金扣除/归零/失败中断。
import { describe, it, expect } from 'vitest';
import { makeEngine, cloneData, startShift1, A01 } from './helpers';
import type { CallbackDelay, Outcome } from '../../src/core/model/GameEnums';

function engineWithA01Startup(opts: { delay: CallbackDelay; outcome: Outcome; depositDelta: number }) {
  const data = cloneData();
  const a01 = data.cases.find((c) => c.id === A01)!;
  a01.flowResults['flow_startup'] = {
    ...a01.flowResults['flow_startup'],
    callbackDelay: opts.delay, outcome: opts.outcome, depositDelta: opts.depositDelta,
    callbackText: '测试回单', immediateText: '即时反馈'
  };
  const e = makeEngine(data); startShift1(e);
  return e;
}

describe('回单延迟', () => {
  it('即时(delay 0)：出货后关闭反馈即进入 CALLBACK_REVIEW，确认即结算', () => {
    const e = engineWithA01Startup({ delay: 0, outcome: 'success', depositDelta: 0 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(e.state.pendingCallbacks[0].status).toBe('ready');
    expect(e.state.pendingCallbacks[0].dueShiftOrder).toBe(1);
    e.dispatch({ type: 'closeActionResult' });
    expect(e.state.phase).toBe('CALLBACK_REVIEW');
    e.dispatch({ type: 'acknowledgeCallback' });
    expect(e.state.stats.callbacksResolved).toBe(1);
    expect(e.state.runtimeCases[A01].status).toBe('CALLBACK_RESOLVED');
  });

  it('延迟一班(delay 1)：到期序号为下一班，当班不结算', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_big_company' }); // 真实数据：delay1 失败 -1
    const cb = e.state.pendingCallbacks[0];
    expect(cb.dueShiftOrder).toBe(2);
    expect(cb.status).toBe('pending');
  });

  it('延迟两班(delay 2)：到期序号为当前班 +2', () => {
    const e = engineWithA01Startup({ delay: 2, outcome: 'success', depositDelta: 0 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(e.state.pendingCallbacks[0].dueShiftOrder).toBe(3);
    expect(e.state.pendingCallbacks[0].status).toBe('pending');
  });

  it('final：到期序号为 final，终审时清算', () => {
    const e = engineWithA01Startup({ delay: 'final', outcome: 'success', depositDelta: 0 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(e.state.pendingCallbacks[0].dueShiftOrder).toBe('final');
  });
});

describe('回单结算与押金', () => {
  it('成功回单：押金按 delta 增加（不超过上限），不计失误', () => {
    const e = engineWithA01Startup({ delay: 0, outcome: 'success', depositDelta: 1 });
    e.state.depositTags.current = 3;
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    e.dispatch({ type: 'closeActionResult' });
    e.dispatch({ type: 'acknowledgeCallback' });
    expect(e.state.depositTags.current).toBe(4);
    expect(e.state.stats.failedShipments).toBe(0);
  });

  it('押金不超过上限', () => {
    const e = engineWithA01Startup({ delay: 0, outcome: 'success', depositDelta: 3 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    e.dispatch({ type: 'closeActionResult' });
    e.dispatch({ type: 'acknowledgeCallback' });
    expect(e.state.depositTags.current).toBe(5);
  });

  it('失败回单：押金扣除并计一次出货失误', () => {
    const e = engineWithA01Startup({ delay: 0, outcome: 'failure', depositDelta: -1 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    e.dispatch({ type: 'closeActionResult' });
    e.dispatch({ type: 'acknowledgeCallback' });
    expect(e.state.depositTags.current).toBe(4);
    expect(e.state.stats.failedShipments).toBe(1);
  });

  it('押金归零：runStatus=failed，phase=RUN_FAILED，失败中断', () => {
    const e = engineWithA01Startup({ delay: 0, outcome: 'failure', depositDelta: -5 });
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    e.dispatch({ type: 'closeActionResult' });
    const r = e.dispatch({ type: 'acknowledgeCallback' });
    expect(e.state.depositTags.current).toBe(0);
    expect(e.state.runStatus).toBe('failed');
    expect(e.state.phase).toBe('RUN_FAILED');
    expect(r.events.some((ev) => ev.type === 'runFailed')).toBe(true);
  });
});
