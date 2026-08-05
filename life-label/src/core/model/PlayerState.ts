// ============================================================
//  PlayerState —— 玩家/局的完整规则状态（平台无关）
//
//  约束：仅包含规则状态。禁止包含 Canvas 坐标、旋转、动画进度、
//  鼠标位置、拖拽偏移、命中框、Toast、字体、颜色、DOM 对象。
//  本对象必须可独立序列化为 JSON。
// ============================================================
import type { GameConfig, ShiftDef, ShiftResources } from '../../data/GameDataTypes';
import { resolveShiftTimerConfig } from '../../data/schema';
import type { GamePhase, RunStatus, TimeoutPolicy } from './GameEnums';
import type { RuntimeCaseState } from './RuntimeCaseState';
import type { CallbackState } from './CallbackState';
import type { Stats, ShiftStats } from './Stats';
import type { TendencyTotals } from './TendencyState';
import type { ActionResult, ShiftSummary, FinalReport, EventLogEntry } from './GameReports';
import { zeroTendencies } from './TendencyState';
import { zeroStats, zeroShiftStats } from './Stats';

/** 班次资源（投入点 / 市场点 / 剩余时间），等同 data 层 ShiftResources */
export type Resources = ShiftResources;

/** 班次计时器（限时班次运行时状态） */
export interface ShiftTimer {
  enabled: boolean;
  totalSeconds: number | null;
  remainingSeconds: number | null;
  timeoutPolicy?: TimeoutPolicy | string;
  running: boolean;
  expired: boolean;
  hasStarted: boolean;
  warningThresholdSeconds: number[];
  warnedThresholdSeconds: number[];
}

/** 押金标签 */
export interface DepositTags {
  current: number;
  max: number;
}

export interface PlayerState {
  runId: string;
  runStatus: RunStatus;
  phase: GamePhase;
  currentShiftId: string | null;
  currentShiftOrder: number;
  completedShiftIds: string[];
  depositTags: DepositTags;
  resources: Resources;
  selectedCaseId: string | null;
  activeCaseIds: string[];
  runtimeCases: Record<string, RuntimeCaseState>;
  pendingCallbacks: CallbackState[];
  readyCallbackIds: string[];
  shiftStats: ShiftStats;
  shiftTimer: ShiftTimer;
  tendencies: TendencyTotals;
  stats: Stats;
  lastActionResult: ActionResult | null;
  finalReport: FinalReport | null;
  shiftSummary: ShiftSummary | null;
  reviewQueue: string[];
  eventLog: EventLogEntry[];
  turnIndex: number;
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/** 空的（未启用）计时器 */
function emptyTimer(): ShiftTimer {
  return {
    enabled: false, totalSeconds: null, remainingSeconds: null, running: false,
    expired: false, hasStarted: false, warningThresholdSeconds: [], warnedThresholdSeconds: []
  };
}

// 限时配置解析统一在 data/schema.resolveShiftTimerConfig（唯一权威实现），此处直接复用。
export { resolveShiftTimerConfig } from '../../data/schema';

/** 创建班次计时器（与 game.html createShiftTimer 一致） */
export function createShiftTimer(shift: ShiftDef): ShiftTimer {
  const cfg = resolveShiftTimerConfig(shift);
  if (!cfg.enabled) return emptyTimer();
  return {
    enabled: true,
    totalSeconds: cfg.durationSeconds,
    remainingSeconds: cfg.durationSeconds,
    timeoutPolicy: cfg.timeoutPolicy,
    running: false,
    expired: false,
    hasStarted: false,
    warningThresholdSeconds: cfg.warningThresholdSeconds,
    warnedThresholdSeconds: []
  };
}

/**
 * 创建新局的初始 PlayerState（与 game.html newPlayerState 一致）。
 * runId 使用 Date.now()（平台无关）。
 */
export function createPlayerState(config: GameConfig): PlayerState {
  return {
    runId: 'run_' + Date.now(),
    runStatus: 'active',
    phase: 'RUN_INIT',
    currentShiftId: null,
    currentShiftOrder: 0,
    completedShiftIds: [],
    depositTags: { current: config.initialDepositTags, max: config.maxDepositTags },
    resources: clone(config.defaultShiftResources),
    selectedCaseId: null,
    activeCaseIds: [],
    runtimeCases: {},
    pendingCallbacks: [],
    readyCallbackIds: [],
    shiftStats: zeroShiftStats(),
    shiftTimer: emptyTimer(),
    tendencies: zeroTendencies(),
    stats: zeroStats(),
    lastActionResult: null,
    finalReport: null,
    shiftSummary: null,
    reviewQueue: [],
    eventLog: [],
    turnIndex: 0
  };
}
