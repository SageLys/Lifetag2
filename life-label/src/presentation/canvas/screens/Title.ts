// 标题页（迁移自 game.html drawTitle）
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BASE_H, BUTTONS } from '../CanvasLayout';
import { drawButton, drawMascot } from '../components/Primitives';

export function drawTitle(rc: Rc): void {
  const { ctx, view } = rc;
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 360, BASE_W, BASE_H - 360);
  drawMascot(ctx, BASE_W / 2 - 32, 150, 90, 'cheer');
  ctx.fillStyle = '#FFFFFF'; ctx.font = '40px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText('人生标签交易所', BASE_W / 2, 320);
  ctx.font = '20px "ZCOOL KuaiLe"'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('试 用 期', BASE_W / 2, 358);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px "Noto Sans SC"';
  ctx.fillText('你被分配到二楼批发区。保住押金标签，活过试用期。', BASE_W / 2, 410);
  ctx.textAlign = 'left';
  const b = BUTTONS.titleStart;
  drawButton(ctx, view, '开 始 上 工', b.x, b.y, b.w, b.h, { color: COLORS.gold, hotColor: '#F57F17' });
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('v0.3 MVP · 单文件 Canvas 实现', BASE_W / 2, 560); ctx.textAlign = 'left';
}
