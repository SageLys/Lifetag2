// ============================================================
//  报告与结果数据（平台无关）
//  操作结果、班次结算、绩效、终局报告、事件日志。
//  均为纯数据（可序列化），不含任何渲染信息。
// ============================================================
import type { ActionId, GamePhase } from './GameEnums';
import type { Stats } from './Stats';
import type { ResourceDeltas } from '../../data/GameDataTypes';

/** 操作即时结果（lastActionResult，驱动 ACTION_RESULT 相位的反馈条） */
export interface ActionResult {
  ok: boolean;
  actionId?: ActionId;
  caseId?: string;
  flowId?: string;
  message: string;
  detailText?: string;
  /** 关闭反馈后应进入的相位 */
  nextPhaseAfterClose?: GamePhase;
  resourceDeltas?: ResourceDeltas;
}

/** 单条班次绩效结果 */
export interface PerfResult {
  pass: boolean;
  text: string;
}

/** 班次结算（SHIFT_SUMMARY） */
export interface ShiftSummary {
  shiftId: string;
  title: string;
  shipped: number;
  returned: number;
  autoReturned: number;
  perfResults: PerfResult[];
  depositRemaining: number;
  forcedByTimeout: boolean;
}

/** 终局报告（ENDING_DISPLAY） */
export interface FinalReport {
  endingId: string;
  title: string;
  reportHeader?: string;
  bodyText: string;
  depositTagsRemaining: number;
  completedShiftCount: number;
  stats: Stats;
  resultTags: string[];
}

/** 事件日志条目（eventLog） */
export interface EventLogEntry {
  id: string;
  turnIndex: number;
  phase: GamePhase;
  shiftId: string | null;
  caseId: string | null;
  actionId: ActionId | null;
  eventType: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
