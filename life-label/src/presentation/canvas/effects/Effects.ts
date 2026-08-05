// 表现特效层（迁移自 game.html drawStampLayer / drawReturnAnimLayer / drawMascotBubble / drawToast）
// 纯绘制；动画进度由 AnimationSystem 推进；标宝气泡的点击关闭命中由 HitMap 负责。
import type { Rc } from '../RenderContext';
import { COLORS, FLOW_VISUAL } from '../VisualTheme';
import { roundRect } from '../components/Primitives';
import { lerp, easeIn, easeOut } from '../../animation/AnimationSystem';
import { BASE_W, AREA_BOTTOM, CARD_W, CARD_H } from '../CanvasLayout';

export function drawStampLayer(rc: Rc): void {
  const { ctx, view, data } = rc;
  if (!view.stamp) return;
  const s = view.stamp; const t = s.t;
  const vis = FLOW_VISUAL[s.flowId];
  const cx = s.cardX + s.w / 2, cy = s.cardY + s.h / 2;
  let drawX = s.cardX, drawY = s.cardY, alpha = 1, rot = 0;
  const zone = view.flowZones.find((z) => z.id === s.flowId);
  if (t > 0.6) {
    const k = easeIn((t - 0.6) / 0.4);
    const tx = zone ? (zone.x + zone.w / 2 - cx) : 0;
    const ty = zone ? (zone.y - cy) : 200;
    drawX += tx * k; drawY += ty * k; alpha = 1 - k; rot = k * 0.5;
  }
  ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(drawX + s.w / 2, drawY + s.h / 2); ctx.rotate(rot);
  ctx.fillStyle = COLORS.paper; roundRect(ctx, -s.w / 2, -s.h / 2, s.w, s.h, 3); ctx.fill();
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, 28);
  ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 18px "Noto Sans SC"'; ctx.textAlign = 'left';
  ctx.fillText(s.caseName, -s.w / 2 + 14, -s.h / 2 + 56);
  if (t > 0.3) {
    const ink = Math.min(1, (t - 0.3) / 0.15);
    ctx.save(); ctx.globalAlpha = 0.5 * alpha; ctx.translate(0, 10); ctx.scale(ink, ink); ctx.rotate(-0.15);
    ctx.fillStyle = vis.color; roundRect(ctx, -90, -34, 180, 68, 10); ctx.fill();
    ctx.globalAlpha = alpha; ctx.fillStyle = '#FFFFFF'; ctx.font = '15px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
    ctx.fillText(data.flowsById[s.flowId].shortName + ' 已出货', 0, 6); ctx.textAlign = 'left'; ctx.restore();
  }
  ctx.restore();
  if (t >= 0.1 && t < 0.5) {
    const k = (t - 0.1) / 0.4;
    const stampY = lerp(cy - 140, cy, easeIn(Math.min(1, k * 1.2)));
    const sc = t > 0.33 ? lerp(1, 1.2, (t - 0.33) / 0.17) : 1;
    ctx.save(); ctx.globalAlpha = 0.7; ctx.translate(cx, stampY); ctx.scale(sc, sc); ctx.rotate(-0.15);
    ctx.fillStyle = vis.color; roundRect(ctx, -80, -30, 160, 60, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '13px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
    ctx.fillText('已接收', 0, 5); ctx.textAlign = 'left'; ctx.restore();
  }
}

export function drawReturnAnimLayer(rc: Rc): void {
  const { ctx, view } = rc;
  if (!view.returnAnim) return;
  const a = view.returnAnim; const t = a.t;
  const fromX = a.x + CARD_W / 2, fromY = a.y + CARD_H / 2;
  const toX = 98, toY = AREA_BOTTOM - 30;
  const e = easeIn(t);
  const cx = lerp(fromX, toX, e), cy = lerp(fromY, toY, e);
  const sc = lerp(1, 0.2, e);
  ctx.save(); ctx.globalAlpha = 1 - e * 0.7; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(e * 0.6);
  ctx.fillStyle = COLORS.paper; roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 3); ctx.fill();
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 28);
  ctx.restore();
}

function bubbleWrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const chars = Array.from(text); let line = ''; const out: string[] = [];
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
    else line += ch;
  }
  if (line) out.push(line);
  return out;
}

export function drawMascotBubble(rc: Rc): void {
  const { ctx, view } = rc;
  if (!view.mascotBubble) return;
  const t = view.mascotBubble.t;
  const appear = easeOut(Math.min(1, t / 0.2));
  const alpha = t > 5.9 ? Math.max(0, 1 - (t - 5.9) / 0.6) : 1;
  ctx.font = '12px "ZCOOL KuaiLe"';
  const lines = bubbleWrapLines(ctx, view.mascotBubble.text, 240);
  let tw = 0; for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
  const padX = 12, padY = 10, lh = 18;
  const bw = tw + padX * 2, bh = lines.length * lh + padY * 2;
  const bx = 210, by = 58;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(bx, by); ctx.scale(appear, appear); ctx.translate(-bx, -by);
  ctx.fillStyle = '#FAF7F0';
  ctx.beginPath(); ctx.moveTo(bx + 16, by); ctx.lineTo(bx + 6, by - 11); ctx.lineTo(bx + 34, by); ctx.closePath(); ctx.fill();
  roundRect(ctx, bx, by, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = '#9E9E9E'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + 16, by); ctx.lineTo(bx + 6, by - 11); ctx.lineTo(bx + 34, by); ctx.stroke();
  ctx.fillStyle = '#1A1A1A'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], bx + padX, by + padY + 13 + i * lh);
  ctx.restore();
}

export function drawToast(rc: Rc): void {
  const { ctx, view } = rc;
  if (!view.toast) return;
  const t = view.toast.t;
  const alpha = t < 0.2 ? t / 0.2 : (t > 2.0 ? Math.max(0, 1 - (t - 2.0) / 0.4) : 1);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = '13px "Noto Sans SC"';
  const w = ctx.measureText(view.toast.text).width + 40;
  const x = BASE_W / 2 - w / 2, y = 460;
  ctx.fillStyle = '#1A1208'; roundRect(ctx, x, y, w, 38, 8); ctx.fill();
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#F9A825'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(view.toast.text, BASE_W / 2, y + 19);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.restore();
}
