// 回单确认页（班前/终审，迁移自 game.html drawCallbackReview）
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, wrapText, roundRect } from '../components/Primitives';
import { drawDesktop } from '../components/Desktop';
import { drawFlowZone } from '../components/FlowZone';
import { drawTrackingBoard } from '../components/TrackingBoard';
import { drawStatusBar } from '../components/StatusBar';

export function drawCallbackReview(rc: Rc, isFinal: boolean): void {
  const { ctx, state, view, data } = rc;
  drawDesktop(rc);
  for (const z of view.flowZones) drawFlowZone(rc, z);
  drawTrackingBoard(rc);
  drawStatusBar(rc);
  ctx.fillStyle = 'rgba(20,14,8,0.78)'; ctx.fillRect(0, 0, BASE_W, 720);
  const id = state.reviewQueue[0];
  const cb = id ? state.pendingCallbacks.find((c) => c.id === id) : null;
  const px = 330, py = 120, pw = 620, ph = 460;
  drawPanel(ctx, px, py, pw, ph, 'rgba(245,240,229,0.97)');
  ctx.fillStyle = COLORS.brandRed; roundRect(ctx, px, py, pw, 46, 10); ctx.fill();
  ctx.fillRect(px, py + 30, pw, 16);
  ctx.fillStyle = '#FFFFFF'; ctx.font = '16px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText(isFinal ? '终审 · 清算所有未确认回单' : '班前 · 买家回单到达', BASE_W / 2, py + 30); ctx.textAlign = 'left';
  if (cb) {
    const cs = data.casesById[cb.caseId]; const flow = data.flowsById[cb.flowId];
    ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 15px "Noto Sans SC"';
    ctx.fillText(cs.caseNo + '  →  ' + flow.displayName, px + 36, py + 86);
    ctx.strokeStyle = '#BDBDBD'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.strokeRect(px + 36, py + 104, pw - 72, 210); ctx.setLineDash([]);
    ctx.fillStyle = '#212121'; ctx.font = '13px "Noto Sans SC"';
    let yy = wrapText(ctx, cb.callbackText, px + 52, py + 132, pw - 104, 24, 5);
    if (cb.longTermText) { ctx.fillStyle = '#5D4037'; ctx.font = 'italic 12px "Noto Sans SC"'; yy = wrapText(ctx, '长期回响：' + cb.longTermText, px + 52, yy + 28, pw - 104, 22, 4); }
    const outMap: Record<string, [string, string]> = { success: ['出货成立', '#2E7D32'], failure: ['出货失误', '#C62828'], mixed: ['出货成立（有保留）', '#B26A00'], neutral: ['出货成立（低效）', '#616161'] };
    const om = outMap[cb.outcome] || ['', '#000'];
    ctx.fillStyle = om[1]; ctx.font = 'bold 14px "Noto Sans SC"'; ctx.fillText('结果：' + om[0], px + 52, py + 300);
    ctx.fillStyle = cb.depositDelta < 0 ? '#B71C1C' : '#2E7D32'; ctx.font = 'bold 14px "Press Start 2P"'; ctx.textAlign = 'right';
    ctx.fillText('押金 ' + (cb.depositDelta > 0 ? '+' : '') + cb.depositDelta, px + pw - 52, py + 300); ctx.textAlign = 'left';
    ctx.fillStyle = '#757575'; ctx.font = '11px "Courier New"';
    ctx.fillText('队列中剩余回单：' + state.reviewQueue.length, px + 52, py + 350);
    const b = BUTTONS.callbackConfirm;
    drawButton(ctx, view, '确 认 回 单', b.x, b.y, b.w, b.h);
  }
}
