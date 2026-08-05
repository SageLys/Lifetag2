// 新局与状态机：初始状态、合法转移、非法转移拒绝。
import { describe, it, expect } from 'vitest';
import { makeEngine, startShift1, A01 } from './helpers';
import { TENDENCY_IDS, zeroTendencies } from '../../src/core/model/TendencyState';

describe('新局初始状态', () => {
  it('startRun 后押金/tendency/统计为初始值，进入第一班 SHIFT_START', () => {
    const e = makeEngine();
    e.dispatch({ type: 'startRun' });
    const s = e.state;
    expect(s.phase).toBe('SHIFT_START');
    expect(s.runStatus).toBe('active');
    expect(s.currentShiftOrder).toBe(1);
    expect(s.depositTags).toEqual({ current: 5, max: 5 });
    expect(s.tendencies).toEqual(zeroTendencies());
    for (const id of TENDENCY_IDS) expect(s.tendencies[id]).toBe(0);
    expect(s.stats.casesShipped).toBe(0);
    expect(s.completedShiftIds).toEqual([]);
    expect(s.pendingCallbacks).toEqual([]);
  });

  it('beginShiftWork（无回单）→ SHIFT_ACTIVE', () => {
    const e = makeEngine();
    startShift1(e);
    expect(e.state.phase).toBe('SHIFT_ACTIVE');
  });
});

describe('合法相位转移', () => {
  it('SHIFT_ACTIVE → 选案 → 揭标(ACTION_RESULT) → close → SHIFT_ACTIVE', () => {
    const e = makeEngine();
    startShift1(e);
    expect(e.dispatch({ type: 'selectCase', caseId: A01 }).ok).toBe(true);
    expect(e.dispatch({ type: 'revealHiddenTag', caseId: A01 }).ok).toBe(true);
    expect(e.state.phase).toBe('ACTION_RESULT');
    e.dispatch({ type: 'closeActionResult' });
    expect(e.state.phase).toBe('SHIFT_ACTIVE');
  });
});

describe('非法相位转移返回明确拒绝原因', () => {
  it('SHIFT_START 阶段选案被拒', () => {
    const e = makeEngine();
    e.dispatch({ type: 'startRun' });
    const r = e.dispatch({ type: 'selectCase', caseId: A01 });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('当前不可选择案件');
    expect(r.events.some((ev) => ev.type === 'commandRejected')).toBe(true);
  });

  it('非 SHIFT_ACTIVE 扒底被拒', () => {
    const e = makeEngine();
    e.dispatch({ type: 'startRun' });
    const r = e.dispatch({ type: 'inspectCase', caseId: A01 });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('当前不可扒底');
  });

  it('非 SHIFT_ACTIVE 收班被拒', () => {
    const e = makeEngine();
    e.dispatch({ type: 'startRun' });
    const r = e.dispatch({ type: 'endShift' });
    expect(r.ok).toBe(false);
    expect(r.rejection?.reason).toBe('当前不可收班');
  });

  it('非回单相位 acknowledgeCallback 无副作用（不抛错）', () => {
    const e = makeEngine();
    startShift1(e);
    const before = e.state.turnIndex;
    const r = e.dispatch({ type: 'acknowledgeCallback' });
    expect(r.ok).toBe(true);
    expect(e.state.turnIndex).toBe(before);
  });
});
