// 桌面背景与分区（迁移自 game.html drawDesktop）
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { AREA_TOP, AREA_H, AREA_BOTTOM } from '../CanvasLayout';

export function drawDesktop(rc: Rc): void {
  const { ctx } = rc;
  ctx.fillStyle = COLORS.desk; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = COLORS.stackBg; ctx.fillRect(0, AREA_TOP, 196, AREA_H);
  ctx.fillStyle = COLORS.deskBg; ctx.fillRect(196, AREA_TOP, 752, AREA_H);
  ctx.fillStyle = COLORS.trackBg; ctx.fillRect(948, AREA_TOP, 332, AREA_H);
  ctx.strokeStyle = COLORS.divider; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(196, AREA_TOP); ctx.lineTo(196, AREA_BOTTOM);
  ctx.moveTo(948, AREA_TOP); ctx.lineTo(948, AREA_BOTTOM);
  ctx.moveTo(0, AREA_BOTTOM); ctx.lineTo(1280, AREA_BOTTOM);
  ctx.stroke();
}
