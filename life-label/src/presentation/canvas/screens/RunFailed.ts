// 押金归零失败页（迁移自 game.html drawRunFailed）。动态底标/建议流向按主导倾向（core）。
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, wrapText } from '../components/Primitives';
import { getDominantTendency, TENDENCY_FAILURE_INFO } from '../../../core/model/TendencyState';

export function drawRunFailed(rc: Rc): void {
  const { ctx, state, view, data } = rc;
  ctx.fillStyle = '#1A1208'; ctx.fillRect(0, 0, BASE_W, 720);
  const px = 300, py = 45, pw = 680, ph = 590;
  drawPanel(ctx, px, py, pw, ph, 'rgba(22,10,4,0.97)');
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(px, py, pw, 34);
  ctx.fillStyle = '#FFFFFF'; ctx.font = '13px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText('押金标签归零处理通知  ·  自动生成  ·  不可申诉', BASE_W / 2, py + 23);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E8D8B8'; ctx.font = 'bold 22px "Noto Sans SC"';
  ctx.fillText('T-00', px + 22, py + 66);
  ctx.fillStyle = '#A89878'; ctx.font = '13px "Noto Sans SC"';
  ctx.fillText('押金归零案', px + 86, py + 64);
  ctx.fillStyle = '#6A5A48'; ctx.font = '10px "Courier New"';
  ctx.fillText('〔 临时档案号，归档后更新 〕', px + pw - 224, py + 64);
  const div = (y: number) => {
    ctx.strokeStyle = '#6A5A48'; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px + 14, y); ctx.lineTo(px + pw - 14, y); ctx.stroke(); ctx.setLineDash([]);
  };
  div(py + 76);
  const shifts = state ? state.completedShiftIds.length : 0;
  const failedAtShift = state ? (state.currentShiftOrder || shifts + 1) : shifts + 1;
  const failedShips = (state && state.stats) ? state.stats.failedShipments : 0;
  let yy = py + 94;
  ctx.fillStyle = '#9A8870'; ctx.font = '10px "Courier New"';
  ctx.fillText('【 档案摘要 】', px + 22, yy); yy += 18;
  ctx.fillStyle = '#B8A880'; ctx.font = '12px "Noto Sans SC"';
  yy = wrapText(ctx,
    '前持证操盘员，押金标签于第 ' + failedAtShift + ' 班操作期间耗尽。已完成 ' + shifts + ' / 7 班次，处理记录不完整。本主体身份已完成置换，转入流转程序。',
    px + 22, yy, pw - 44, 19, 3) + 22;
  div(yy); yy += 16;
  ctx.fillStyle = '#9A8870'; ctx.font = '10px "Courier New"';
  ctx.fillText('【 初步可见标签 】', px + 22, yy); yy += 18;
  ctx.fillStyle = '#E57373'; ctx.font = '12px "Noto Sans SC"';
  ctx.fillText('▸ 押金归零', px + 22, yy); yy += 19;
  ctx.fillStyle = '#A89878';
  ctx.fillText('▸ ' + shifts + ' 班次记录存疑（完整记录 7 班）', px + 22, yy); yy += 19;
  ctx.fillText('▸ 再就业意向待确认', px + 22, yy); yy += 22;
  div(yy); yy += 16;
  ctx.fillStyle = '#9A8870'; ctx.font = '10px "Courier New"';
  ctx.fillText('【 初步底标（已触发自动揭示）】', px + 22, yy); yy += 18;
  ctx.fillStyle = '#8A7A68'; ctx.font = '12px "Noto Sans SC"';
  ctx.fillText('▸ 本人曾任操盘员（试用级）', px + 22, yy); yy += 19;
  ctx.fillText('▸ 押金标签管理记录：不理想', px + 22, yy); yy += 19;
  const domId = getDominantTendency(state.tendencies);
  const info = TENDENCY_FAILURE_INFO[domId ?? '_none'];
  ctx.fillStyle = '#C8B89A';
  yy = wrapText(ctx, '▸ ' + info.tag, px + 22, yy, pw - 44, 19, 2) + 22;
  div(yy); yy += 16;
  ctx.fillStyle = '#9A8870'; ctx.font = '10px "Courier New"';
  ctx.fillText('【 建议流向 】', px + 22, yy); yy += 18;
  ctx.fillStyle = '#A89878'; ctx.font = '12px "Noto Sans SC"';
  ctx.fillText(info.flow, px + 22, yy); yy += 24;
  div(yy); yy += 14;
  ctx.fillStyle = '#757575'; ctx.font = '10px "Courier New"';
  ctx.fillText((data.mascot && data.mascot.failedNote) || '〔 标宝附注 〕 感谢您为人生流通作出贡献！T-00 档案将在下轮开始时归档销毁，本交易所不留记录，但您可以留。', px + 22, yy); yy += 18;
  if (state && state.stats) {
    ctx.fillStyle = '#5A5247';
    ctx.fillText('完成班次 ' + shifts + '  ·  出货失误 ' + failedShips, px + 22, yy);
  }
  const b = BUTTONS.failRestart;
  drawButton(ctx, view, '重 新 报 到', b.x, b.y, b.w, b.h);
}
