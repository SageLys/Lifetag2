// ============================================================
//  事件协议（GameEvent）—— 平台无关
//  引擎处理命令后产出的领域事件列表。presentation 层订阅这些事件触发
//  动画 / Toast / 标宝气泡等表现。
//
//  约束：事件只描述"发生了什么"（领域语义 + 必要数据），
//  不含任何 Canvas 坐标、动画进度、颜色、DOM 等表现实现。
//  不使用全局事件总线——事件随 CommandResult 返回给调用方。
// ============================================================
import type { Outcome } from './../model/GameEnums';
import type { TendencyDeltas, TendencyTotals } from './../model/TendencyState';
import type { ResourceDeltas } from '../../data/GameDataTypes';
import type { GameCommand } from './GameCommand';

export type GameEvent =
  /** 新局开始 */
  | { type: 'runStarted'; runId: string }
  /** 进入班次 */
  | { type: 'shiftEntered'; shiftId: string; shiftOrder: number; timed: boolean }
  /** 班次开始处理 */
  | { type: 'shiftStarted'; shiftId: string }
  /** 案件被选择 */
  | { type: 'caseSelected'; caseId: string }
  /** 扒底完成 */
  | { type: 'caseInspected'; caseId: string; backgroundText: string }
  /** 底标揭露 */
  | { type: 'hiddenTagRevealed'; caseId: string; hiddenTagId: string; tagId: string; revealText?: string }
  /** 案件出货 */
  | { type: 'caseShipped'; caseId: string; flowId: string; outcome: Outcome; immediateText: string }
  /** 案件退货（auto=true 为收班/超时自动退货） */
  | { type: 'caseReturned'; caseId: string; auto: boolean; immediateText?: string }
  /** 回单到期 */
  | { type: 'callbackReady'; callbackId: string; caseId: string }
  /** 回单结算 */
  | { type: 'callbackResolved'; callbackId: string; caseId: string; outcome: Outcome; depositDelta: number }
  /** 押金变化 */
  | { type: 'depositChanged'; delta: number; current: number; reason: string }
  /** tendency 变化（必产生，携带本次增量与累计快照） */
  | { type: 'tendencyChanged'; deltas: TendencyDeltas; totals: TendencyTotals; reason: string }
  /** 计时警告 */
  | { type: 'timerWarning'; thresholdSeconds: number; remainingSeconds: number }
  /** 计时结束（限时归零，强制收班） */
  | { type: 'timerExpired'; shiftId: string }
  /** 班次结束 */
  | { type: 'shiftEnded'; shiftId: string; forcedByTimeout: boolean }
  /** 绩效扣罚已应用 */
  | { type: 'performancePenaltyApplied'; ruleText: string; depositDelta: number }
  /** 结局生成 */
  | { type: 'endingBuilt'; endingId: string }
  /** 押金归零，本局失败 */
  | { type: 'runFailed'; reason: string }
  /** 命令被拒绝（非法操作） */
  | { type: 'commandRejected'; command: GameCommand; reason: string }
  /** 资源消耗（扒底/揭标等，便于表现层提示，可选订阅） */
  | { type: 'resourceChanged'; actionId: string; deltas: ResourceDeltas };

export type GameEventType = GameEvent['type'];
