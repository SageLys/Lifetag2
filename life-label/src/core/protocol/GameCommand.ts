// ============================================================
//  命令协议（GameCommand）—— 平台无关
//  外部（input/app 层）通过命令驱动核心引擎，引擎不直接感知鼠标/按钮。
// ============================================================

export type GameCommand =
  /** 开始新局（标题页"开始上工"） */
  | { type: 'startRun' }
  /** 开始班次处理（班前页"开始处理"） */
  | { type: 'beginShiftWork' }
  /** 选择案件（点击来货堆） */
  | { type: 'selectCase'; caseId: string }
  /** 扒底 */
  | { type: 'inspectCase'; caseId: string }
  /** 揭标 */
  | { type: 'revealHiddenTag'; caseId: string }
  /** 出货到指定流向 */
  | { type: 'shipCase'; caseId: string; flowId: string }
  /** 退货 */
  | { type: 'returnCase'; caseId: string }
  /** 确认当前回单（逐条） */
  | { type: 'acknowledgeCallback' }
  /** 收班（forceReturn：确认提前收班，自动退货剩余案件） */
  | { type: 'endShift'; forceReturn?: boolean }
  /** 关闭即时反馈条，推进相位（ACTION_RESULT → 下一相位） */
  | { type: 'closeActionResult' }
  /** 开始下一班（班次结算页，存在 nextShiftId 时） */
  | { type: 'startNextShift' }
  /** 第 7 班后进入终审/结局（班次结算页，无 nextShiftId 时） */
  | { type: 'enterFinalCallbacksOrEnding' }
  /** 更新时间（限时倒计时推进） */
  | { type: 'tick'; dt: number }
  /** 重新开始（结局页/失败页） */
  | { type: 'restartRun' };

export type CommandType = GameCommand['type'];
