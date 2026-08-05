// tendency：出货/退货累加、多次累计、独立累计、主导判断、阈值、并列、结局条件、失败报告。
import { describe, it, expect } from 'vitest';
import { makeEngine, cloneData, startShift1, A01, A02 } from './helpers';
import {
  TENDENCY_IDS, TENDENCY_NAMES, TENDENCY_FAILURE_INFO,
  getDominantTendency, zeroTendencies
} from '../../src/core/model/TendencyState';
import { createGameContext } from '../../src/core/GameContext';
import { GameEngine } from '../../src/core/GameEngine';

describe('累计（出货 / 退货）', () => {
  it('出货按 flowResults.tendencyDeltas 累加并发 tendencyChanged 事件', () => {
    const e = makeEngine(); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    const r = e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    expect(e.state.tendencies.cold_precision).toBe(1);
    const tc = r.events.find((ev) => ev.type === 'tendencyChanged') as any;
    expect(tc.deltas.cold_precision).toBe(1);
    expect(tc.totals.cold_precision).toBe(1);
  });

  it('退货按 returnResult.tendencyDeltas 累加', () => {
    const data = cloneData();
    data.cases.find((c) => c.id === A02)!.returnResult.tendencyDeltas = { over_caution: 1 };
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A02 });
    e.dispatch({ type: 'returnCase', caseId: A02 });
    expect(e.state.tendencies.over_caution).toBe(1);
  });

  it('多次累计与独立累计：同一倾向相加、不同倾向各自独立', () => {
    const data = cloneData();
    data.cases.find((c) => c.id === A01)!.flowResults['flow_startup'].tendencyDeltas = { cold_precision: 1, gambler_tendency: 2 };
    data.cases.find((c) => c.id === A02)!.flowResults['flow_startup'].tendencyDeltas = { cold_precision: 1 };
    // 确保 a02 受理 startup
    const a02 = data.cases.find((c) => c.id === A02)!;
    if (!a02.availableFlowIds.includes('flow_startup')) a02.availableFlowIds.push('flow_startup');
    const e = makeEngine(data); startShift1(e);
    e.dispatch({ type: 'selectCase', caseId: A01 });
    e.dispatch({ type: 'shipCase', caseId: A01, flowId: 'flow_startup' });
    e.dispatch({ type: 'closeActionResult' });
    e.dispatch({ type: 'selectCase', caseId: A02 });
    e.dispatch({ type: 'shipCase', caseId: A02, flowId: 'flow_startup' });
    expect(e.state.tendencies.cold_precision).toBe(2);
    expect(e.state.tendencies.gambler_tendency).toBe(2);
    expect(e.state.tendencies.over_caution).toBe(0);
  });
});

describe('主导判断 getDominantTendency', () => {
  it('未达阈值（<3）返回 null', () => {
    const t = zeroTendencies(); t.cold_precision = 2;
    expect(getDominantTendency(t)).toBeNull();
  });
  it('≥3 取最高分', () => {
    const t = zeroTendencies(); t.cold_precision = 3; t.gambler_tendency = 5;
    expect(getDominantTendency(t)).toBe('gambler_tendency');
  });
  it('并列最高取 TENDENCY_IDS 顺序中靠前者', () => {
    const t = zeroTendencies(); t.cold_precision = 3; t.gambler_tendency = 3;
    expect(getDominantTendency(t)).toBe('cold_precision');
    expect(TENDENCY_IDS.indexOf('cold_precision')).toBeLessThan(TENDENCY_IDS.indexOf('gambler_tendency'));
  });
});

describe('结局条件（minTendency）', () => {
  it('cold_precision ≥6 触发倾向结局', () => {
    const data = cloneData();
    const e = new GameEngine(createGameContext(data));
    e.state.runStatus = 'active';
    e.state.depositTags.current = 3;
    e.state.completedShiftIds = ['s1', 's2'];
    e.state.tendencies.cold_precision = 6;
    e.ending.build();
    expect(e.state.finalReport?.endingId).toBe('ending_cold_precision');
  });
});

describe('失败报告数据（TENDENCY_FAILURE_INFO）', () => {
  it('每个倾向都有底标/建议流向，且有 _none 兜底', () => {
    for (const id of TENDENCY_IDS) {
      expect(TENDENCY_FAILURE_INFO[id]?.tag).toBeTruthy();
      expect(TENDENCY_FAILURE_INFO[id]?.flow).toBeTruthy();
      expect(TENDENCY_NAMES[id]).toBeTruthy();
    }
    expect(TENDENCY_FAILURE_INFO._none?.tag).toBeTruthy();
  });
  it('主导倾向映射到对应失败报告', () => {
    const t = zeroTendencies(); t.gambler_tendency = 4;
    const dom = getDominantTendency(t)!;
    expect(dom).toBe('gambler_tendency');
    expect(TENDENCY_FAILURE_INFO[dom]).toBe(TENDENCY_FAILURE_INFO.gambler_tendency);
  });
});
