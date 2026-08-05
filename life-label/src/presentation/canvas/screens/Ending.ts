// 结局报告页（迁移自 game.html drawEnding）
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, wrapText } from '../components/Primitives';
import { getDominantTendency, TENDENCY_NAMES } from '../../../core/model/TendencyState';

export function drawEnding(rc: Rc): void {
  const { ctx, state, view } = rc;
  ctx.fillStyle = '#2A2017'; ctx.fillRect(0, 0, BASE_W, 720);
  const r = state.finalReport!;
  const px = 300, py = 80, pw = 680, ph = 580;
  drawPanel(ctx, px, py, pw, ph, 'rgba(245,240,229,0.97)');
  ctx.fillStyle = '#757575'; ctx.font = '11px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(r.reportHeader || '试用期归档报告', BASE_W / 2, py + 36);
  ctx.fillStyle = COLORS.brandRed; ctx.font = '26px "ZCOOL KuaiLe"';
  ctx.fillText(r.title, BASE_W / 2, py + 78); ctx.textAlign = 'left';
  ctx.strokeStyle = '#BDBDBD'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(px + 40, py + 100); ctx.lineTo(px + pw - 40, py + 100); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#212121'; ctx.font = '13px "Noto Sans SC"';
  let yy = wrapText(ctx, r.bodyText, px + 44, py + 132, pw - 88, 24, 6) + 24;
  ctx.fillStyle = '#1A1A1A'; ctx.font = '13px "Courier New"';
  const st = r.stats;
  const rows = [
    '剩余押金标签：' + r.depositTagsRemaining,
    '完成班次：' + r.completedShiftCount,
    '处理案件数：' + (st.casesShipped + st.casesReturned + st.casesAutoReturned),
    '出货案件：' + st.casesShipped + '　退货：' + (st.casesReturned + st.casesAutoReturned),
    '出货失误：' + st.failedShipments + '　绩效扣罚：' + st.performancePenalties
  ];
  for (const l of rows) { ctx.fillText(l, px + 44, yy); yy += 26; }
  yy += 8;
  ctx.strokeStyle = '#C0B090'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(px + 40, yy); ctx.lineTo(px + pw - 40, yy); ctx.stroke(); ctx.setLineDash([]);
  yy += 18;
  ctx.fillStyle = '#5A5247'; ctx.font = '11px "Courier New"'; ctx.textAlign = 'left';
  const domId = getDominantTendency(state.tendencies);
  const tendLine = domId
    ? '主导倾向：' + (TENDENCY_NAMES[domId] || domId) + '  ' + (state.tendencies[domId] || 0) + ' 分'
    : '主导倾向：无（操作风格未分化）';
  ctx.fillText(tendLine, px + 44, yy); yy += 20;
  if (r.resultTags && r.resultTags.length > 0) {
    ctx.fillStyle = '#7A6B52';
    ctx.fillText('档案标签：' + r.resultTags.join(' · '), px + 44, yy);
  }
  const b = BUTTONS.endingRestart;
  drawButton(ctx, view, '再 来 一 次', b.x, b.y, b.w, b.h);
}
