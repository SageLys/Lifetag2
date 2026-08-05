// 操作即时反馈页（迁移自 game.html drawActionResult）。背景复用 Scene。
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { AREA_BOTTOM, BUTTONS } from '../CanvasLayout';
import { drawButton, roundRect, wrapText } from '../components/Primitives';
import { drawScene } from './Scene';

export function drawActionResult(rc: Rc): void {
  const { ctx, state, view } = rc;
  drawScene(rc);
  const res = state.lastActionResult;
  if (!res) return;
  const bx = 210, bw = 724, bh = 70, by = AREA_BOTTOM - bh - 6;
  ctx.fillStyle = 'rgba(30,22,12,0.96)'; roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 1.5; ctx.stroke();
  let accent = COLORS.gold as string;
  if (res.actionId === 'shipCase') accent = '#90CAF9';
  ctx.fillStyle = accent; ctx.font = '12px "ZCOOL KuaiLe"'; ctx.textAlign = 'left';
  const titleMap: Record<string, string> = { inspectCase: '扒底 · 底细', revealHiddenTag: '揭标 · 底标', shipCase: '出货 · 即时反馈', returnCase: '退货 · 回执' };
  ctx.fillText(titleMap[res.actionId as string] || '操作结果', bx + 18, by + 22);
  ctx.fillStyle = '#EDE5D4'; ctx.font = '12px "Noto Sans SC"';
  wrapText(ctx, res.message, bx + 18, by + 42, bw - 200, 18, 2);
  ctx.fillStyle = 'rgba(237,229,212,0.6)'; ctx.font = '10px "Courier New"';
  if (res.detailText) ctx.fillText(res.detailText, bx + 18, by + bh - 10);
  const b = BUTTONS.actionResultContinue;
  drawButton(ctx, view, '按任意键继续', b.x, b.y, b.w, b.h, { color: COLORS.gold, hotColor: '#F57F17', font: '13px "ZCOOL KuaiLe"' });
}
