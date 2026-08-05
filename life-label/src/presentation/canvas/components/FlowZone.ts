// 流向柜台（迁移自 game.html drawFlowZone）
import type { Rc } from '../RenderContext';
import type { FlowZoneView } from '../../ViewState';
import { FLOW_VISUAL } from '../VisualTheme';
import { roundRect, darken, drawFlowIcon } from './Primitives';

export function drawFlowZone(rc: Rc, zone: FlowZoneView): void {
  const { ctx, view, data } = rc;
  const flow = data.flowsById[zone.id];
  const vis = FLOW_VISUAL[zone.id];
  const { x, y, w, h } = zone;
  const hovered = view.hoveredZone === zone.id && view.dragging;
  ctx.save();
  if (!zone.available) ctx.globalAlpha = 0.4;
  ctx.fillStyle = hovered ? vis.color : darken(vis.color, 0.4);
  roundRect(ctx, x, y, w, h, 6); ctx.fill();
  if (hovered) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y, w, 3);
  drawFlowIcon(ctx, vis.type, x + w / 2 - 10, y + 12, 20);
  ctx.fillStyle = '#FFFFFF'; ctx.font = '14px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText(flow.shortName, x + w / 2, y + 62);
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '8px "Noto Sans SC"';
  let sub = hovered ? ('放入 ' + flow.shortName) : (zone.available ? (flow.buyerName || '') : '柜台未就位');
  while (sub.length > 1 && ctx.measureText(sub).width > w - 10) sub = sub.slice(0, -1);
  ctx.fillText(sub, x + w / 2, y + 80);
  if (zone.available) { ctx.fillStyle = vis.color; ctx.fillRect(x + 8, y + h - 10, w - 16, 3); }
  ctx.textAlign = 'left'; ctx.restore();
}
