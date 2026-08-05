// ============================================================
//  核心枚举（平台无关）
//  状态机相位、案件运行状态、操作、结果分类等的明确类型。
//  这些是规则层的运行时词汇；操作 id 词表复用 data/schema（唯一来源）。
// ============================================================
import { VALID_ACTION_IDS } from '../../data/schema';

/** 状态机相位（对应 game.html drawFrame 的 phase 分派） */
export type GamePhase =
  | 'TITLE'
  | 'RUN_INIT'
  | 'SHIFT_START'
  | 'CALLBACK_REVIEW'
  | 'SHIFT_ACTIVE'
  | 'ACTION_RESULT'
  | 'SHIFT_SUMMARY'
  | 'FINAL_CALLBACK_REVIEW'
  | 'ENDING_BUILD'
  | 'ENDING_DISPLAY'
  | 'RUN_FAILED';

/** 局状态 */
export type RunStatus = 'active' | 'completed' | 'failed';

/** 案件运行状态 */
export type RuntimeCaseStatus =
  | 'UNTOUCHED'
  | 'INSPECTED'
  | 'PARTIALLY_REVEALED'
  | 'FULLY_REVEALED'
  | 'SHIPPED_PENDING_CALLBACK'
  | 'CALLBACK_READY'
  | 'CALLBACK_RESOLVED'
  | 'RETURNED'
  | 'LOCKED';

/** 终态集合：处于这些状态的案件禁止再操作（与 game.html 多处复用一致） */
export const TERMINAL_CASE_STATUSES: readonly RuntimeCaseStatus[] = [
  'RETURNED', 'SHIPPED_PENDING_CALLBACK', 'CALLBACK_READY', 'CALLBACK_RESOLVED', 'LOCKED'
];

/** 操作 ID（类型与值均派生自 data/schema.VALID_ACTION_IDS，唯一来源） */
export type ActionId = (typeof VALID_ACTION_IDS)[number];
export const ACTION_IDS: readonly ActionId[] = VALID_ACTION_IDS;

/** 出货结果分类 */
export type Outcome = 'success' | 'failure' | 'mixed' | 'neutral';

/** 回单延迟 */
export type CallbackDelay = 0 | 1 | 2 | 'final';

/** 回单状态 */
export type CallbackStatus = 'pending' | 'ready' | 'resolved';

/** 超时策略 */
export type TimeoutPolicy = 'auto_return' | 'block_end' | 'ignore' | 'force_end';

/** 收班时未处理案件的处置策略 */
export type UnprocessedCasePolicy = 'block_end' | 'auto_return' | 'ignore' | 'force_end';
