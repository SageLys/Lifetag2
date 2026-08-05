// 跟单板（迁移自 game.html drawTrackingBoard）
import type { Rc } from '../RenderContext';
import { COLORS, FLOW_VISUAL } from '../VisualTheme';
import { roundRect } from './Primitives';
import { AREA_TOP, AREA_H, AREA_BOTTOM } from '../CanvasLayout';

export function drawTrackingBoard(rc: Rc): void {
  const { ctx, state, data } = rc;
  const x = 948, y = AREA_TOP, w = 332;
  ctx.fillStyle = '#1E1A0E'; ctx.fillRect(x + 8, y + 8, w - 16, AREA_H - 16);
  ctx.strokeStyle = '#0E0A04'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, AREA_H - 16);
  ctx.fillStyle = COLORS.gold; ctx.font = '12px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText('跟单板', x + w / 2, y + 32);
  ctx.fillStyle = 'rgba(212,197,169,0.4)'; ctx.font = '9px "Noto Sans SC"';
  ctx.fillText('— 出货案件在此跟踪买家回单 —', x + w / 2, y + 50);

  const items = state.pendingCallbacks.filter((c) => c.status !== 'resolved');
  if (items.length === 0) {
    ctx.fillStyle = 'rgba(212,197,169,0.25)'; ctx.font = '11px "Courier New"';
    ctx.fillText('暂无跟单中的案件', x + w / 2, y + 280); ctx.textAlign = 'left'; return;
  }
  ctx.textAlign = 'left';
  let iy = y + 70;
  for (const cb of items) {
    const cs = data.casesById[cb.caseId]; const flow = data.flowsById[cb.flowId];
    const vis = FLOW_VISUAL[cb.flowId];
    const ready = cb.status === 'ready';
    const itemX = x + 18, itemW = w - 36, itemH = 40;
    ctx.save(); ctx.translate(itemX + itemW / 2, iy + itemH / 2); ctx.rotate((cb.caseId.length % 2 ? 1 : -1) * 0.6 * Math.PI / 180);
    ctx.fillStyle = ready ? '#FFF9C4' : COLORS.paper; roundRect(ctx, -itemW / 2, -itemH / 2, itemW, itemH, 2); ctx.fill();
    ctx.fillStyle = vis ? vis.color : '#999'; ctx.fillRect(-itemW / 2, -itemH / 2, 3, itemH);
    ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, -itemH / 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(cs.caseNo + ' → ' + flow.shortName, 0, -3);
    ctx.fillStyle = ready ? '#C62828' : '#757575'; ctx.font = '9px "Courier New"';
    ctx.fillText(ready ? '⚡ 回单已达' : (flow.pendingText || '跟单中...'), 0, 12);
    ctx.textAlign = 'left'; ctx.restore();
    iy += itemH + 10;
    if (iy > AREA_BOTTOM - 30) break;
  }
}
