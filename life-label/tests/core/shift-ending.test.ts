// 班次与结局：绩效达标/未达标、处罚上限、超时强制收班、结局优先级/兜底/失败。
import { describe, it, expect } from 'vitest';
import { makeEngine, cloneData, startShift1, A01, A02 } from './helpers';
import { createGameContext } from '../../src/core/GameContext';
import { GameEngine } from '../../src/core/GameEngine';

const A03 = 'case_a03_migrant_worker';
const A04 = 'case_a04_reliable_tech';

/** 克隆数据：让第一班 a01/a02 受理 startup（成功、delay1、押金0），便于构造确定绩效 */
function shipFriendlyData() {
  const data = cloneData();
  for (const id of [A01, A02]) {
    const cs = data.cases.find((c) => c.id === id)!;
    if (!cs.availableFlowIds.includes('flow_startup')) cs.availableFlowIds.push('flow_startup');
    cs.flowResults['flow_startup'] = { outcome: 'success', immediateText: 'ok', callbackDelay: 1, callbackText: 'cb', depositDelta: 0, tendencyDeltas: {} };
  }
  return data;
}

describe('班次绩效', () => {
  it('达标：出货数达标，无处罚', () => {
    const e = makeEngine(shipFriendlyData()); startShift1(e);
    for (const id of [A01, A02]) { e.dispatch({ type: 'selectCase', caseId: id }); e.dispatch({ type: 'shipCase', caseId: id, flowId: 'flow_startup' }); e.dispatch({ type: 'closeActionResult' }); }
    for (const id of [A03, A04]) { e.dispatch({ type: 'selectCase', caseId: id }); e.dispatch({ type: 'returnCase', caseId: id }); e.dispatch({ type: 'closeActionResult' }); }
    expect(e.state.phase).toBe('SHIFT_SUMMARY');
    expect(e.state.shiftSummary?.perfResults[0].pass).toBe(true);
    expect(e.state.stats.performancePenalties).toBe(0);
  });

  it('未达标：出货不足，扣押金一次', () => {
    const e = makeEngine(shipFriendlyData()); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 }); e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' }); e.dispatch({ type: 'closeActionResult' });
    for (const id of [A02, A03, A04]) { e.dispatch({ type: 'selectCase', caseId: id }); e.dispatch({ type: 'returnCase', caseId: id }); e.dispatch({ type: 'closeActionResult' }); }
    expect(e.state.shiftSummary?.perfResults[0].pass).toBe(false);
    expect(e.state.stats.performancePenalties).toBe(1);
    expect(e.state.depositTags.current).toBe(4);
  });

  it('处罚上限：两条规则均未达标，但 cap=1 只扣一次', () => {
    const data = shipFriendlyData();
    const sh = data.shifts.find((s) => s.order === 1)!;
    sh.rules.performancePenaltyCap = 1;
    sh.performanceRules = [
      { id: 'r1', type: 'min_shipped_cases', target: 2, depositDelta: -1, failText: '出货不足' },
      { id: 'r2', type: 'max_returned_cases', target: 0, depositDelta: -1, failText: '退货过多' }
    ];
    const e = makeEngine(data); startShift1(e);
    // 全部退货：两条规则都失败
    for (const id of [A01, A02, A03, A04]) { e.dispatch({ type: 'selectCase', caseId: id }); e.dispatch({ type: 'returnCase', caseId: id }); e.dispatch({ type: 'closeActionResult' }); }
    expect(e.state.stats.performancePenalties).toBe(1);
    expect(e.state.depositTags.current).toBe(4);
  });
});

describe('超时强制收班', () => {
  it('限时归零 → 强制收班、未处理案件自动退货、forcedByTimeout', () => {
    const data = cloneData();
    data.shifts.find((s) => s.order === 1)!.resources.timeRemainingSeconds = 10;
    const e = makeEngine(data); startShift1(e);
    expect(e.state.shiftTimer.enabled).toBe(true);
    e.dispatch({ type: 'tick', dt: 999 });
    expect(e.state.phase).toBe('SHIFT_SUMMARY');
    expect(e.state.shiftSummary?.forcedByTimeout).toBe(true);
    expect(e.state.stats.casesAutoReturned).toBe(4);
  });
});

describe('结局判断与优先级', () => {
  function buildWith(mutate: (e: GameEngine) => void): string {
    const e = new GameEngine(createGameContext(cloneData()));
    e.state.runStatus = 'active';
    mutate(e);
    e.ending.build();
    return e.state.phase === 'RUN_FAILED' ? 'RUN_FAILED' : (e.state.finalReport!.endingId);
  }

  it('正常结局（优先级最高的 ace）', () => {
    expect(buildWith((e) => { e.state.depositTags.current = 5; e.state.completedShiftIds = ['s1','s2','s3','s4','s5','s6','s7']; e.state.stats.failedShipments = 0; })).toBe('ending_ace_operator');
  });
  it('优先级：失误超 ace 阈值则降为 qualified', () => {
    expect(buildWith((e) => { e.state.depositTags.current = 3; e.state.completedShiftIds = ['s1','s2','s3','s4','s5','s6','s7']; e.state.stats.failedShipments = 2; })).toBe('ending_qualified_operator');
  });
  it('兜底结局 probation_extended', () => {
    expect(buildWith((e) => { e.state.depositTags.current = 1; e.state.completedShiftIds = ['s1']; })).toBe('ending_probation_extended');
  });
  it('押金归零 → 失败（不进结局匹配）', () => {
    expect(buildWith((e) => { e.state.depositTags.current = 0; })).toBe('RUN_FAILED');
  });
});
