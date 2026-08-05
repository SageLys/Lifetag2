// ============================================================
//  ViewState —— 纯表现状态（独立于 PlayerState / 规则）
//  仅包含：卡牌位置/翻转/旋转、拖拽视觉、悬停流向、各类动画进度、
//  Toast、标宝气泡、行情滚动偏移、确认弹窗开关、标宝触发标志等。
//  禁止包含任何规则状态（押金 / tendency / 案件结果 / 相位）。
// ============================================================

/** 展开案件卡的表现状态 */
export interface ActiveCardView {
  caseId: string;
  w: number; h: number;
  x: number; y: number;
  targetX: number; targetY: number;
  rotation: number; rotTarget: number;
  flip: number; flipTarget: number;
  slideT: number;
}

export interface FlowZoneView { id: string; x: number; y: number; w: number; h: number; available: boolean }

export interface ViewState {
  activeCard: ActiveCardView | null;
  /** 是否正在拖拽活动卡（视觉用） */
  dragging: boolean;
  /** 当前悬停的投放目标（流向 id 或 'return'），仅拖拽时有意义 */
  hoveredZone: string | null;
  stamp: any | null;
  returnAnim: any | null;
  depositAnim: any | null;
  revealPop: any | null;
  toast: { text: string; t: number } | null;
  mascotBubble: { text: string; t: number } | null;
  confirmEndShift: boolean;
  flowZones: FlowZoneView[];
  /** 指针在基准坐标系中的位置（输入层写入，渲染用于按钮 hover） */
  pointer: { x: number; y: number };
  /** 来货堆顶 hover（输入层写入） */
  stackHover: boolean;
  elapsed: number;
  tickerOffset: number;
  // §6.4 标宝/押金气泡触发标志（由 PresentationController 依事件设置）
  _mascotPending: boolean;
  _depositBubblePending: boolean;
  _depositBubbleShown: boolean;
}

export function createViewState(): ViewState {
  return {
    activeCard: null,
    dragging: false,
    hoveredZone: null,
    stamp: null,
    returnAnim: null,
    depositAnim: null,
    revealPop: null,
    toast: null,
    mascotBubble: null,
    confirmEndShift: false,
    flowZones: [],
    pointer: { x: 0, y: 0 },
    stackHover: false,
    elapsed: 0,
    tickerOffset: 0,
    _mascotPending: false,
    _depositBubblePending: false,
    _depositBubbleShown: false
  };
}
