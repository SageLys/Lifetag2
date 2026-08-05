// ============================================================
//  案件运行状态（平台无关）
//  game.html enterShift 中为每个案件初始化的运行时记录。
//  仅规则状态，不含任何渲染/动画信息。
// ============================================================
import type { RuntimeCaseStatus, Outcome } from './GameEnums';

export interface RuntimeCaseState {
  caseId: string;
  status: RuntimeCaseStatus;
  backgroundRevealed: boolean;
  revealedHiddenTagIds: string[];
  addedTagIds: string[];
  removedTagIds: string[];
  shippedToFlowId: string | null;
  shippedAtShiftId: string | null;
  shippedAtShiftOrder: number | null;
  outcome: Outcome | null;
  returnedAtShiftId: string | null;
  returnedAtShiftOrder: number | null;
  autoReturned: boolean;
  callbackResolvedAtShiftId: string | null;
}

/** 创建未触碰的初始案件运行记录（与 game.html enterShift 中的初始对象一致） */
export function createRuntimeCase(caseId: string): RuntimeCaseState {
  return {
    caseId,
    status: 'UNTOUCHED',
    backgroundRevealed: false,
    revealedHiddenTagIds: [],
    addedTagIds: [],
    removedTagIds: [],
    shippedToFlowId: null,
    shippedAtShiftId: null,
    shippedAtShiftOrder: null,
    outcome: null,
    returnedAtShiftId: null,
    returnedAtShiftOrder: null,
    autoReturned: false,
    callbackResolvedAtShiftId: null
  };
}
