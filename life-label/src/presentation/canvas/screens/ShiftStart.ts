// 班前页（迁移自 game.html drawShiftStart）
import type { Rc } from '../RenderContext';
import { COLORS } from '../VisualTheme';
import { BASE_W, BUTTONS } from '../CanvasLayout';
import { drawButton, drawPanel, wrapText, roundRect } from '../components/Primitives';
import { drawDesktop } from '../components/Desktop';
import { drawFlowZone } from '../components/FlowZone';
import { drawTrackingBoard } from '../components/TrackingBoard';
import { drawStatusBar } from '../components/StatusBar';

export function drawShiftStart(rc: Rc): void {
  const { ctx, state, view, data } = rc;
  drawDesktop(rc);
  for (const z of view.flowZones) drawFlowZone(rc, z);
  drawTrackingBoard(rc);
  drawStatusBar(rc);
  ctx.fillStyle = 'rgba(20,14,8,0.7)'; ctx.fillRect(0, 0, BASE_W, 720);
  const shift = data.shiftsById[state.currentShiftId as string];
  const px = 290, py = 150, pw = 700, ph = 420;
  drawPanel(ctx, px, py, pw, ph);
  ctx.fillStyle = COLORS.gold; ctx.font = '24px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText(shift.displayName, BASE_W / 2, py + 50); ctx.textAlign = 'left';
  ctx.fillStyle = '#E8DCC8'; ctx.font = '13px "Noto Sans SC"';
  let yy = wrapText(ctx, shift.introText, px + 40, py + 90, pw - 80, 22, 4);
  yy += 26;
  ctx.fillStyle = COLORS.gold; ctx.font = '13px "Noto Sans SC"'; ctx.fillText('本班目标', px + 40, yy);
  ctx.fillStyle = '#E8DCC8'; ctx.font = '13px "Noto Sans SC"';
  yy = wrapText(ctx, shift.objectiveText, px + 40, yy + 24, pw - 80, 22, 3) + 26;
  ctx.fillStyle = 'rgba(232,220,200,0.85)'; ctx.font = '12px "Courier New"';
  ctx.fillText('调查机会：' + state.resources.investigationPoints + '　|　到期回单：' + state.readyCallbackIds.length + ' 份', px + 40, yy);
  yy += 22;

  if (state.shiftTimer && state.shiftTimer.enabled) {
    const totalSec = state.shiftTimer.totalSeconds as number;
    const tMin = Math.floor(totalSec / 60), tSec = totalSec % 60;
    const totalStr = tMin > 0 ? tMin + ' 分' + (tSec ? ' ' + tSec + ' 秒' : '') : tSec + ' 秒';
    ctx.fillStyle = 'rgba(180,40,40,0.22)';
    roundRect(ctx, px + 36, yy - 14, pw - 72, 26, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(220,80,80,0.5)'; ctx.lineWidth = 1;
    roundRect(ctx, px + 36, yy - 14, pw - 72, 26, 4); ctx.stroke();
    ctx.fillStyle = '#E57373'; ctx.font = '12px "Courier New"';
    ctx.fillText('★ 本班限时：' + totalStr + '　|　超时后：未处理案件自动退货，绩效照常结算', px + 44, yy + 3);
    yy += 28;
  }

  ctx.fillStyle = 'rgba(232,220,200,0.6)'; ctx.font = '11px "Courier New"';
  const policyText = shift.rules.unprocessedCasePolicy === 'block_end' ? '本班须处理完所有案件方可收班' : '本班收班时未处理案件将自动退货';
  ctx.fillText('规则：' + policyText + (shift.rules.requiresInspectionBeforeShipping ? ' · 出货前须扒底' : ''), px + 40, yy);
  if (shift.tutorialText) ctx.fillText('提示：' + shift.tutorialText, px + 40, yy + 18);
  const b = BUTTONS.shiftStartBegin;
  drawButton(ctx, view, '开 始 处 理', b.x, b.y, b.w, b.h);
}
