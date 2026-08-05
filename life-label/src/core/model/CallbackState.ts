// ============================================================
//  回单状态（平台无关）
//  出货时创建，进入 pendingCallbacks；到期后逐条确认。
// ============================================================
import type { Outcome, CallbackStatus } from './GameEnums';

export interface CallbackState {
  id: string;
  caseId: string;
  flowId: string;
  outcome: Outcome;
  callbackText: string;
  longTermText: string | null;
  depositDelta: number;
  resultTags: string[];
  createdAtShiftId: string;
  createdAtShiftOrder: number;
  /** 到期班次序号，或 'final'（终审清算） */
  dueShiftOrder: number | 'final';
  status: CallbackStatus;
  resolvedAtShiftOrder: number | 'final' | null;
}
