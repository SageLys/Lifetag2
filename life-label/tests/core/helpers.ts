// 核心测试共享工具（无 Canvas / DOM）。
import gameConfig from '../../data/gameConfig.json';
import tags from '../../data/tags.json';
import flows from '../../data/flows.json';
import cases from '../../data/cases.json';
import shifts from '../../data/shifts.json';
import endings from '../../data/endings.json';
import mascot from '../../data/mascot.json';

import { createGameContext } from '../../src/core/GameContext';
import { GameEngine } from '../../src/core/GameEngine';
import type { GameData } from '../../src/data/GameDataTypes';

export const baseData = { config: gameConfig, tags, flows, cases, shifts, endings, mascot } as unknown as GameData;

export function cloneData(): GameData {
  return JSON.parse(JSON.stringify(baseData));
}

/** 用给定数据（默认真实数据）创建引擎 */
export function makeEngine(data: GameData = baseData): GameEngine {
  return new GameEngine(createGameContext(data));
}

/** 开局并进入第一班 SHIFT_ACTIVE（第一班无到期回单） */
export function startShift1(engine: GameEngine): void {
  engine.dispatch({ type: 'startRun' });
  engine.dispatch({ type: 'beginShiftWork' });
}

/** 终态快照（与 fixtures 期望同构） */
export function snapshot(s: any) {
  return {
    phase: s.phase, runStatus: s.runStatus, deposit: s.depositTags.current,
    investigationPoints: s.resources.investigationPoints,
    tendencies: s.tendencies,
    casesShipped: s.stats.casesShipped, casesReturned: s.stats.casesReturned, casesAutoReturned: s.stats.casesAutoReturned,
    failedShipments: s.stats.failedShipments, performancePenalties: s.stats.performancePenalties,
    callbacksResolved: s.stats.callbacksResolved, hiddenTagsRevealed: s.stats.hiddenTagsRevealed, casesInspected: s.stats.casesInspected,
    pendingCallbacks: s.pendingCallbacks.length,
    endingId: s.finalReport ? s.finalReport.endingId : null,
    forcedByTimeout: s.shiftSummary ? s.shiftSummary.forcedByTimeout : false
  };
}

export const A01 = 'case_a01_fresh_elite';
export const A02 = 'case_a02_middle_stable';
