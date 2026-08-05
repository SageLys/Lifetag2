// 班次结算页（迁移自 game.html drawShiftSummary）。背景复用 Scene。
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, wrapText, roundRect } from '../components/Primitives';
import { drawScene } from './Scene';

export function drawShiftSummary(rc: Rc): void {
  const { ctx, state, view, data } = rc;
  drawScene(rc);
  ctx.fillStyle = 'rgba(20,14,8,0.78)'; ctx.fillRect(0, 0, BASE_W, 720);
  const s = state.shiftSummary!; const shift = data.shiftsById[state.currentShiftId as string];
  const px = 340, py = 130, pw = 600, ph = 440;
  drawPanel(ctx, px, py, pw, ph);
  ctx.fillStyle = COLORS.gold; ctx.font = '22px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText(s.title, BASE_W / 2, py + 48); ctx.textAlign = 'left';

  if (s.forcedByTimeout) {
    ctx.fillStyle = 'rgba(180,40,40,0.25)';
    roundRect(ctx, px + 30, py + 60, pw - 60, 28, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(220,80,80,0.55)'; ctx.lineWidth = 1;
    roundRect(ctx, px + 30, py + 60, pw - 60, 28, 4); ctx.stroke();
    ctx.fillStyle = '#E57373'; ctx.font = '12px "Noto Sans SC"'; ctx.textAlign = 'center';
    ctx.fillText('限时归零 · 系统强制收班　|　' + s.autoReturned + ' 件案件已自动退货', BASE_W / 2, py + 79);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#E8DCC8'; ctx.font = '14px "Courier New"';
  let yy = s.forcedByTimeout ? py + 108 : py + 96;
  const lines = [
    '出货案件：' + s.shipped,
    '手动退货：' + s.returned,
    s.forcedByTimeout ? '自动退货：' + s.autoReturned + '（含超时退货）' : '自动退货：' + s.autoReturned,
    '剩余押金标签：' + s.depositRemaining + ' / ' + state.depositTags.max
  ];
  for (const l of lines) { ctx.fillText(l, px + 50, yy); yy += 30; }
  yy += 6;
  ctx.fillStyle = COLORS.gold; ctx.font = '13px "Noto Sans SC"'; ctx.fillText('班次绩效', px + 50, yy); yy += 26;
  ctx.font = '12px "Noto Sans SC"';
  for (const pr of s.perfResults) {
    ctx.fillStyle = pr.pass ? '#7DC67D' : '#E57373';
    yy = wrapText(ctx, (pr.pass ? '✓ ' : '✕ ') + pr.text, px + 50, yy, pw - 100, 20, 2) + 14;
  }
  if (data.mascot && data.mascot.summaryNotes) {
    const note = data.mascot.summaryNotes[state.currentShiftId as string] || data.mascot.summaryNotes.default || '';
    if (note) { ctx.fillStyle = '#5A5247'; ctx.font = '10px "Courier New"'; wrapText(ctx, note, px + 50, py + ph - 100, pw - 100, 16, 2); }
  }
  const hasNext = !!shift.nextShiftId;
  const b = BUTTONS.summaryNext;
  drawButton(ctx, view, hasNext ? '进入下一班' : '进入试用期终审', b.x, b.y, b.w, b.h);
}
