// ============================================================
//  CanvasRenderer —— 按相位分派整帧渲染（迁移自 game.html drawFrame）。
//  纯只读：所有绘制只读取 Rc（state/view/data/queries），不修改任何状态。
//  绝不在此推进动画或时间。
// ============================================================
import type { Rc } from './RenderContext';
import { COLORS } from './VisualTheme';
import { BASE_W, BASE_H } from './CanvasLayout';
import { drawTitle } from './screens/Title';
import { drawShiftStart } from './screens/ShiftStart';
import { drawCallbackReview } from './screens/CallbackReview';
import { drawScene } from './screens/Scene';
import { drawActionResult } from './screens/ActionResult';
import { drawShiftSummary } from './screens/ShiftSummary';
import { drawEnding } from './screens/Ending';
import { drawRunFailed } from './screens/RunFailed';
import { drawToast } from './effects/Effects';

export function renderFrame(rc: Rc): void {
  const state = rc.state as any;
  if (!state || state.phase === 'TITLE') { drawTitle(rc); drawToast(rc); return; }
  switch (state.phase) {
    case 'SHIFT_START': drawShiftStart(rc); break;
    case 'CALLBACK_REVIEW': drawCallbackReview(rc, false); break;
    case 'FINAL_CALLBACK_REVIEW': drawCallbackReview(rc, true); break;
    case 'SHIFT_ACTIVE': drawScene(rc); break;
    case 'ACTION_RESULT': drawActionResult(rc); break;
    case 'SHIFT_SUMMARY': drawShiftSummary(rc); break;
    case 'ENDING_DISPLAY': drawEnding(rc); break;
    case 'RUN_FAILED': drawRunFailed(rc); break;
    case 'ENDING_BUILD': case 'RUN_INIT': drawScene(rc); break;
    default: drawScene(rc);
  }
  drawToast(rc);
}

/** 加载/错误占位屏（boot 阶段，无 Rc 时使用） */
export function drawLoading(ctx: CanvasRenderingContext2D, msg: string): void {
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.fillStyle = '#FFFFFF'; ctx.font = '20px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(msg, BASE_W / 2, BASE_H / 2); ctx.textAlign = 'left';
}
