// 案件操作：扒底 / 揭标 / 出货 / 退货 及其守卫。
import { describe, it, expect } from 'vitest';
import { makeEngine, cloneData, startShift1, A01, A02 } from './helpers';

describe('扒底 inspectCase', () => {
  it('成功：调查机会 -1，底细已揭，状态 INSPECTED', () => {
    const e = makeEngine(); startShift1(e);
    const before = e.state.resources.investigationPoints;
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'inspectCase', caseId: A01 });
    expect(r.ok).toBe(true);
    expect(e.state.resources.investigationPoints).toBe(before - 1);
    expect(e.state.runtimeCases[A01].backgroundRevealed).toBe(true);
    expect(e.state.runtimeCases[A01].status).toBe('INSPECTED');
    expect(r.events.some((ev) => ev.type === 'caseInspected')).toBe(true);
  });

  it('重复扒底被拒（已扒底后状态 INSPECTED 不在可扒底状态集）', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'inspectCase', caseId: A01 });
    const r = e.dispatch({ type: 'inspectCase', caseId: A01 });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('案件状态不允许');
  });

  it('调查机会不足被拒', () => {
    const e = makeEngine(); startShift1(e);
    e.state.resources.investigationPoints = 0;
    const r = e.dispatch({ type: 'inspectCase', caseId: A01 });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('调查机会不足');
  });
});

describe('揭标 revealHiddenTag', () => {
  it('单底标案：揭露后 FULLY_REVEALED，再揭被拒', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'revealHiddenTag', caseId: A01 });
    expect(r.ok).toBe(true);
    expect(e.state.runtimeCases[A01].revealedHiddenTagIds.length).toBe(1);
    expect(e.state.runtimeCases[A01].status).toBe('FULLY_REVEALED');
    e.dispatch({ type: 'closeActionResult' });
    const r2 = e.dispatch({ type: 'revealHiddenTag', caseId: A01 });
    expect(r2.ok).toBe(false);
    expect(r2.rejection?.reason).toBe('没有可揭露的底标');
  });

  it('多底标案：逐枚揭露，PARTIALLY → FULLY', () => {
    const data = cloneData();
    const a01 = data.cases.find((c) => c.id === A01)!;
    a01.hiddenTags = [
      { id: 'h1', tagId: a01.hiddenTags[0].tagId, order: 1, revealText: '第一枚' },
      { id: 'h2', tagId: a01.hiddenTags[0].tagId, order: 2, revealText: '第二枚' }
    ];
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'revealHiddenTag', caseId: A01 });
    expect(e.state.runtimeCases[A01].status).toBe('PARTIALLY_REVEALED');
    e.dispatch({ type: 'closeActionResult' });
    e.dispatch({ type: 'revealHiddenTag', caseId: A01 });
    expect(e.state.runtimeCases[A01].status).toBe('FULLY_REVEALED');
    expect(e.state.runtimeCases[A01].revealedHiddenTagIds).toEqual(['h1', 'h2']);
  });
});

describe('出货 shipCase 守卫', () => {
  it('成功：状态 SHIPPED_PENDING_CALLBACK，移出待处理区，生成回单', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(r.ok).toBe(true);
    expect(e.state.runtimeCases[A01].status).toBe('SHIPPED_PENDING_CALLBACK');
    expect(e.state.activeCaseIds.includes(A01)).toBe(false);
    expect(e.state.pendingCallbacks.length).toBe(1);
  });

  it('柜台本班未开放被拒', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_romance' });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('该柜台本班未开放');
  });

  it('流向不接收此案件被拒（克隆移除 a01 的 startup 受理）', () => {
    const data = cloneData();
    const a01 = data.cases.find((c) => c.id === A01)!;
    a01.availableFlowIds = a01.availableFlowIds.filter((f) => f !== 'flow_startup');
    delete a01.flowResults['flow_startup'];
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('该流向不接收此案件');
  });

  it('要求先扒底：未扒底出货被拒，扒底后可出货', () => {
    const data = cloneData();
    data.shifts.find((s) => s.order === 1)!.rules.requiresInspectionBeforeShipping = true;
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r1 = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(r1.ok).toBe(false);
    expect(r1.rejection?.reason).toBe('本班要求：出货前必须先扒底');
    e.dispatch({ type: 'inspectCase', caseId: A01 });
    expect(e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' }).ok).toBe(true);
  });

  it('要求先揭标：未揭标出货被拒', () => {
    const data = cloneData();
    data.shifts.find((s) => s.order === 1)!.rules.requiresRevealBeforeShipping = true;
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('本班要求：出货前必须先揭标');
  });
});

describe('退货 returnCase', () => {
  it('成功：状态 RETURNED，移出待处理区', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A02 });
    const r = e.dispatch({ type: 'returnCase', caseId: A02 });
    expect(r.ok).toBe(true);
    expect(e.state.runtimeCases[A02].status).toBe('RETURNED');
    expect(e.state.runtimeCases[A02].autoReturned).toBe(false);
    expect(e.state.activeCaseIds.includes(A02)).toBe(false);
    expect(r.events.some((ev) => ev.type === 'caseReturned')).toBe(true);
  });
});
