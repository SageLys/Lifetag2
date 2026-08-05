// 主桌面场景（SHIFT_ACTIVE / ACTION_RESULT 背景）。迁移自 game.html drawScene / drawConfirmEndShift。
// 只读渲染：标宝气泡的"触发"已移至 PresentationController.update，本处仅绘制既有 view 状态。
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, AREA_TOP, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, drawMascot } from '../components/Primitives';
import { drawDesktop } from '../components/Desktop';
import { drawFlowZone } from '../components/FlowZone';
import { drawTrackingBoard } from '../components/TrackingBoard';
import { drawCaseStack, drawReturnBox, drawActiveCard } from '../components/CaseCard';
import { drawStatusBar } from '../components/StatusBar';
import { drawStampLayer, drawReturnAnimLayer, drawMascotBubble } from '../effects/Effects';

export function drawScene(rc: Rc): void {
  const { ctx, state, view, q } = rc;
  drawDesktop(rc);
  for (const z of view.flowZones) drawFlowZone(rc, z);
  drawTrackingBoard(rc);
  drawCaseStack(rc);
  drawReturnBox(rc);
  if (view.activeCard && !view.dragging) drawActiveCard(rc, view.activeCard);
  drawReturnAnimLayer(rc);
  drawStampLayer(rc);
  if (view.activeCard && view.dragging) drawActiveCard(rc, view.activeCard);
  drawStatusBar(rc);

  if (!view.activeCard && !view.stamp && state.phase === 'SHIFT_ACTIVE') {
    drawMascot(ctx, BASE_W / 2 - 32 - 60, 250, 64);
    ctx.fillStyle = 'rgba(212,197,169,0.4)'; ctx.font = '13px "Noto Sans SC"'; ctx.textAlign = 'center';
    ctx.fillText(state.activeCaseIds.length > 0 ? '← 点击左侧来货堆，展开一个案件' : '所有案件已处理，可以收班了', BASE_W / 2, 340);
    ctx.textAlign = 'left';
  }

  if (state.phase === 'SHIFT_ACTIVE') {
    const can = q.canEndShift();
    const b = BUTTONS.sceneEndShift;
    drawButton(ctx, view, '收 班', b.x, b.y, b.w, b.h, { color: can ? COLORS.gold : '#7A6B52', hotColor: '#F57F17', font: '13px "ZCOOL KuaiLe"' });
    ctx.fillStyle = 'rgba(212,197,169,0.7)'; ctx.font = 'bold 14px "Noto Sans SC"'; ctx.textAlign = 'left';
    ctx.fillText('行动点:' + state.resources.investigationPoints, 206, AREA_TOP + 34);
  }

  if (state.phase === 'SHIFT_ACTIVE') {
    drawMascotBubble(rc);
    if (view.confirmEndShift) drawConfirmEndShift(rc);
  }
}

function drawConfirmEndShift(rc: Rc): void {
  const { ctx, state, view } = rc;
  const n = state.activeCaseIds.length;
  ctx.fillStyle = 'rgba(20,14,8,0.65)';
  ctx.fillRect(0, 0, BASE_W, 720);
  const pw = 460, ph = 200, px = (BASE_W - pw) / 2, py = (720 - ph) / 2;
  drawPanel(ctx, px, py, pw, ph);
  ctx.fillStyle = COLORS.gold; ctx.font = '18px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText('确认提前收班？', BASE_W / 2, py + 44);
  ctx.fillStyle = '#E8DCC8'; ctx.font = '13px "Noto Sans SC"'; ctx.textAlign = 'center';
  ctx.fillText('当前仍有 ' + n + ' 件案件未处理，', BASE_W / 2, py + 82);
  ctx.fillText('确认收班后将全部自动退货。', BASE_W / 2, py + 104);
  const ok = BUTTONS.confirmOk, cancel = BUTTONS.confirmCancel;
  drawButton(ctx, view, '确 认 收 班', ok.x, ok.y, ok.w, ok.h, { color: COLORS.brandRed, hotColor: COLORS.brandRedDark, font: '14px "ZCOOL KuaiLe"' });
  drawButton(ctx, view, '取 消', cancel.x, cancel.y, cancel.w, cancel.h, { color: '#5A4A32', hotColor: '#7A6040', font: '14px "ZCOOL KuaiLe"' });
  ctx.textAlign = 'left';
}
