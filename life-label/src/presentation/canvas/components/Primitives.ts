// ============================================================
//  绘制基元（components/Primitives）—— 通用图元，全部以 ctx 为首参，纯绘制。
//  迁移自 game.html roundRect/wrapText/darken/drawMascot/drawFlowIcon/
//  drawDepositIcon/drawPriceTagShape/drawLabel/drawLabelRow/button/panel。
// ============================================================
import { COLORS, LABEL_COLORS } from '../VisualTheme';
import { easeOut } from '../../animation/AnimationSystem';
import type { ViewState } from '../../ViewState';

type Ctx = CanvasRenderingContext2D;

export function roundRect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - amount)); g = Math.round(g * (1 - amount)); b = Math.round(b * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

export function wrapText(c: Ctx, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines?: number): number {
  const chars = Array.from(text);
  let line = '', lines = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (c.measureText(test).width > maxWidth && line !== '') {
      c.fillText(line, x, y);
      line = chars[i]; y += lineHeight; lines++;
      if (maxLines && lines >= maxLines - 1 && i < chars.length - 1) {
        let rest = chars.slice(i).join('');
        while (c.measureText(rest + '…').width > maxWidth && rest.length > 1) rest = rest.slice(0, -1);
        c.fillText(rest + '…', x, y);
        return y;
      }
    } else line = test;
  }
  c.fillText(line, x, y);
  return y;
}

export function drawMascot(ctx: Ctx, x: number, y: number, h: number, mood?: string): void {
  const s = h / 40;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (mood === 'sad') { ctx.translate(18, 20); ctx.rotate(0.26); ctx.translate(-18, -20); }
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'cheer') { ctx.moveTo(2, 18); ctx.lineTo(-6, 6); } else { ctx.moveTo(2, 18); ctx.lineTo(-8, 26); }
  ctx.moveTo(34, 18); ctx.lineTo(44, 26); ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  [[mood === 'cheer' ? -6 : -8, mood === 'cheer' ? 6 : 26], [44, 26]].forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, Math.PI * 2); ctx.fill(); });
  ctx.beginPath(); ctx.moveTo(10, 40); ctx.lineTo(4, 50); ctx.moveTo(26, 40); ctx.lineTo(32, 50); ctx.stroke();
  [[4, 50], [32, 50]].forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = COLORS.brandRed; roundRect(ctx, 2, 0, 32, 40, 6); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = COLORS.brandRed; ctx.beginPath(); ctx.arc(18, 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(12, 16, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(24, 16, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.beginPath();
  if (mood === 'sad') { ctx.moveTo(11, 26); ctx.quadraticCurveTo(18, 20, 25, 26); }
  else { ctx.moveTo(11, 23); ctx.quadraticCurveTo(18, 32, 25, 23); }
  ctx.stroke();
  ctx.restore();
}

export function drawPriceTagShape(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x + w * 0.30, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.70);
  ctx.lineTo(x + w * 0.55, y + h); ctx.lineTo(x, y + h * 0.45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.brandRed; ctx.beginPath();
  ctx.arc(x + w * 0.30, y + h * 0.28, w * 0.10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function drawDepositIcon(ctx: Ctx, x: number, y: number, st: string): void {
  if (st === 'active') {
    ctx.fillStyle = COLORS.brandRed; roundRect(ctx, x, y, 30, 30, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    drawPriceTagShape(ctx, x + 5, y + 5, 20, 20, '#FFFFFF');
  } else {
    ctx.fillStyle = '#616161'; roundRect(ctx, x, y, 30, 30, 4); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 9, y + 9); ctx.lineTo(x + 21, y + 21);
    ctx.moveTo(x + 21, y + 9); ctx.lineTo(x + 9, y + 21); ctx.stroke();
  }
}

export function drawFlowIcon(ctx: Ctx, type: string, x: number, y: number, size: number): void {
  ctx.save(); ctx.strokeStyle = '#FFFFFF'; (ctx as any).fillStyle = 'none';
  ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = size;
  if (type === 'corp') {
    ctx.strokeRect(x + 2, y, s - 4, s);
    for (let r = 0; r < 2; r++) for (let cc = 0; cc < 3; cc++)
      ctx.strokeRect(x + 4 + cc * (s - 8) / 3, y + 3 + r * (s - 6) / 2, (s - 8) / 3 - 2, (s - 6) / 2 - 2);
  } else if (type === 'startup') {
    ctx.beginPath(); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s * 0.72, y + s * 0.7); ctx.lineTo(x + s * 0.28, y + s * 0.7); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.28, y + s * 0.55); ctx.lineTo(x + s * 0.12, y + s);
    ctx.moveTo(x + s * 0.72, y + s * 0.55); ctx.lineTo(x + s * 0.88, y + s); ctx.stroke();
  } else if (type === 'romance') {
    ctx.beginPath(); ctx.moveTo(x + s / 2, y + s * 0.85);
    ctx.bezierCurveTo(x - s * 0.05, y + s * 0.45, x + s * 0.2, y - s * 0.05, x + s / 2, y + s * 0.28);
    ctx.bezierCurveTo(x + s * 0.8, y - s * 0.05, x + s * 1.05, y + s * 0.45, x + s / 2, y + s * 0.85); ctx.stroke();
  } else if (type === 'viral') {
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x + s / 2, y + s * 0.85, i * s * 0.22, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x + s / 2, y + s * 0.85, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  } else if (type === 'system') {
    ctx.beginPath(); ctx.moveTo(x + s * 0.12, y + s * 0.35); ctx.lineTo(x + s / 2, y + s * 0.12); ctx.lineTo(x + s * 0.88, y + s * 0.35); ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 3; i++) { const cx = x + s * 0.24 + i * s * 0.26; ctx.beginPath(); ctx.moveTo(cx, y + s * 0.4); ctx.lineTo(cx, y + s * 0.82); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.9); ctx.lineTo(x + s * 0.9, y + s * 0.9); ctx.stroke();
  } else if (type === 'academia') {
    ctx.beginPath(); ctx.moveTo(x + s / 2, y + s * 0.18); ctx.lineTo(x + s * 0.95, y + s * 0.4); ctx.lineTo(x + s / 2, y + s * 0.62); ctx.lineTo(x + s * 0.05, y + s * 0.4); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.7, y + s * 0.48); ctx.lineTo(x + s * 0.7, y + s * 0.75); ctx.arc(x + s / 2, y + s * 0.75, s * 0.2, 0, Math.PI); ctx.stroke();
  } else if (type === 'overseas') {
    ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s / 2); ctx.lineTo(x + s * 0.9, y + s / 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + s / 2, y + s / 2, s * 0.16, s * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (type === 'downshift') {
    ctx.beginPath(); ctx.moveTo(x + s / 2, y + s * 0.12); ctx.lineTo(x + s / 2, y + s * 0.78);
    ctx.moveTo(x + s * 0.28, y + s * 0.52); ctx.lineTo(x + s / 2, y + s * 0.82); ctx.lineTo(x + s * 0.72, y + s * 0.52); ctx.stroke();
  } else if (type === 'indie') {
    ctx.beginPath(); ctx.arc(x + s / 2, y + s * 0.3, s * 0.16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.22, y + s * 0.85); ctx.quadraticCurveTo(x + s / 2, y + s * 0.5, x + s * 0.78, y + s * 0.85); ctx.stroke();
  } else if (type === 'knowledge') {
    ctx.beginPath(); ctx.moveTo(x + s / 2, y + s * 0.25); ctx.lineTo(x + s / 2, y + s * 0.82);
    ctx.moveTo(x + s / 2, y + s * 0.25); ctx.quadraticCurveTo(x + s * 0.25, y + s * 0.12, x + s * 0.08, y + s * 0.25); ctx.lineTo(x + s * 0.08, y + s * 0.78); ctx.quadraticCurveTo(x + s * 0.25, y + s * 0.66, x + s / 2, y + s * 0.82);
    ctx.moveTo(x + s / 2, y + s * 0.25); ctx.quadraticCurveTo(x + s * 0.75, y + s * 0.12, x + s * 0.92, y + s * 0.25); ctx.lineTo(x + s * 0.92, y + s * 0.78); ctx.quadraticCurveTo(x + s * 0.75, y + s * 0.66, x + s / 2, y + s * 0.82); ctx.stroke();
  }
  ctx.restore();
}

export function drawLabel(ctx: Ctx, text: string, x: number, y: number, type: string): number {
  const colors = LABEL_COLORS[type] || LABEL_COLORS.capability;
  ctx.font = 'bold 10px "Noto Sans SC"';
  const w = Math.min(ctx.measureText(text).width + 20, 130); const h = 22;
  ctx.fillStyle = colors.bg; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = colors.border; ctx.beginPath(); ctx.arc(x + w / 2, y, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + 15);
  ctx.textAlign = 'left'; return w;
}

export function drawLabelRow(ctx: Ctx, items: Array<{ text: string; type: string; pop?: number }>, x: number, y: number, maxW: number): number {
  let cx = x, cy = y; ctx.font = 'bold 10px "Noto Sans SC"';
  for (const it of items) {
    const w = Math.min(ctx.measureText(it.text).width + 20, 130);
    if (cx + w > x + maxW) { cx = x; cy += 30; }
    let scale = 1;
    if (it.pop != null) scale = easeOut(it.pop);
    if (scale < 1) {
      ctx.save(); ctx.translate(cx + w / 2, cy + 11); ctx.scale(scale, scale); ctx.translate(-(cx + w / 2), -(cy + 11));
      drawLabel(ctx, it.text, cx, cy, it.type); ctx.restore();
    } else drawLabel(ctx, it.text, cx, cy, it.type);
    cx += w + 8;
  }
  return cy + 30;
}

export interface ButtonOpts { color?: string; hotColor?: string; font?: string }

/** 绘制按钮（只读：仅依据 view.pointer 计算 hover；命中由 HitMap 负责，无 clickTargets） */
export function drawButton(ctx: Ctx, view: ViewState, label: string, x: number, y: number, w: number, h: number, opts: ButtonOpts = {}): void {
  const hot = view.pointer.x >= x && view.pointer.x <= x + w && view.pointer.y >= y && view.pointer.y <= y + h;
  ctx.fillStyle = hot ? (opts.hotColor || COLORS.brandRedDark) : (opts.color || COLORS.brandRed);
  roundRect(ctx, x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = (opts.font || '15px "ZCOOL KuaiLe"'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}

export function drawPanel(ctx: Ctx, x: number, y: number, w: number, h: number, fill?: string): void {
  ctx.fillStyle = fill || 'rgba(42,32,23,0.92)';
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.stroke();
}
