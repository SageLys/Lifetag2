// ============================================================
//  数据层类型定义（平台无关）
//  对应 data/*.json 的结构。仅描述"磁盘上的游戏内容"，
//  不含任何运行时状态、Canvas / DOM 概念。
//
//  依赖方向：data 层不依赖 core。因此 tendency 相关字段在此
//  使用宽松的 Record<string, number>，由 core/model/TendencyState
//  负责收紧为强类型 TendencyId。
// ============================================================

/** 出货结果分类（与 cases.json flowResults[].outcome 一致） */
export type Outcome = 'success' | 'failure' | 'mixed' | 'neutral';

/** 回单延迟：0/1/2 班，或 'final'（终审时清算） */
export type CallbackDelay = 0 | 1 | 2 | 'final';

/** 倾向增量（磁盘形态，键为 tendency id 字符串） */
export type TendencyDeltaMap = Record<string, number>;

/** 班次资源（gameConfig.defaultShiftResources / shift.resources） */
export interface ShiftResources {
  investigationPoints: number;
  marketActionPoints: number;
  timeRemainingSeconds: number | null;
  [key: string]: number | null;
}

/** 资源增量（actionCosts，键为资源名，值为有符号增量） */
export type ResourceDeltas = Record<string, number>;

export interface GameConfig {
  id: string;
  version: string;
  title: string;
  firstShiftId: string;
  defaultEndingId: string;
  initialDepositTags: number;
  maxDepositTags: number;
  defaultShiftResources: ShiftResources;
  defaultActionCosts: Record<string, ResourceDeltas>;
  mvpFlags?: Record<string, boolean>;
}

export interface Tag {
  id: string;
  displayName: string;
  description?: string;
  category?: string;
  /** valuable / risk / strange / normal —— 决定卡面配色 */
  uiTone?: string;
}

export interface Flow {
  id: string;
  displayName: string;
  shortName: string;
  description?: string;
  buyerName?: string;
  pendingText?: string;
  uiTone?: string;
}

export interface HiddenTag {
  id: string;
  tagId: string;
  revealText?: string;
  order: number;
}

export interface FlowResult {
  outcome: Outcome;
  immediateText: string;
  callbackDelay: CallbackDelay;
  callbackText: string;
  longTermText?: string;
  depositDelta: number;
  resultTags?: string[];
  tendencyDeltas?: TendencyDeltaMap;
}

export interface ReturnResult {
  immediateText: string;
  depositDelta: number;
  tendencyDeltas?: TendencyDeltaMap;
}

export interface CaseDef {
  id: string;
  caseNo: string;
  displayName: string;
  summaryText: string;
  backgroundText: string;
  designedForShiftId?: string;
  difficulty?: number;
  visibleTagIds: string[];
  hiddenTags: HiddenTag[];
  availableFlowIds: string[];
  flowResults: Record<string, FlowResult>;
  returnResult: ReturnResult;
  authorNotes?: string;
}

export interface ShiftRules {
  unprocessedCasePolicy: string; // 'block_end' | 'auto_return' | ...
  hiddenTagRevealMode?: string;
  requiresInspectionBeforeShipping?: boolean;
  requiresRevealBeforeShipping?: boolean;
  performancePenaltyCap: number;
  allowEndShiftWhenCallbacksPending?: boolean;
}

export interface PerformanceRule {
  id: string;
  type: string; // 'min_shipped_cases' | 'max_returned_cases' | 'required_cases_processed'
  target: number;
  depositDelta: number;
  failText: string;
  passText?: string;
}

export interface ShiftDef {
  id: string;
  order: number;
  displayName: string;
  introText: string;
  objectiveText: string;
  summaryTitle?: string;
  tutorialText?: string;
  caseIds: string[];
  nextShiftId?: string | null;
  availableActionIds: string[];
  availableFlowIds: string[];
  resources: ShiftResources;
  actionCosts?: Record<string, ResourceDeltas>;
  rules: ShiftRules;
  performanceRules?: PerformanceRule[];
  ui?: Record<string, unknown>;
  /** 当前数据未使用，但 shiftTimerConfig 会读取作为限时来源之一 */
  timeLimit?: Record<string, unknown>;
  timer?: Record<string, unknown>;
}

export interface EndingConditions {
  requiredRunStatus?: string;
  minDepositTags?: number;
  maxDepositTags?: number;
  minCompletedShifts?: number;
  maxFailedShipments?: number;
  maxPerformancePenalties?: number;
  minTendency?: Record<string, number>;
  maxTendency?: Record<string, number>;
}

export interface EndingDef {
  id: string;
  priority: number;
  title: string;
  reportHeader?: string;
  bodyText: string;
  conditions?: EndingConditions;
  resultTags?: string[];
}

export interface MascotData {
  general?: string[];
  byShift?: Record<string, string[]>;
  summaryNotes?: Record<string, string>;
  failedNote?: string;
}

/** 完整游戏数据包（一次加载的全部 JSON） */
export interface GameData {
  config: GameConfig;
  tags: Tag[];
  flows: Flow[];
  cases: CaseDef[];
  shifts: ShiftDef[];
  endings: EndingDef[];
  mascot: MascotData;
}

/** 按 ID 建立的索引（只读引用，不复制内容） */
export interface GameDataIndex {
  tagsById: Record<string, Tag>;
  casesById: Record<string, CaseDef>;
  flowsById: Record<string, Flow>;
  shiftsById: Record<string, ShiftDef>;
}
