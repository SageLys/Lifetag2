// 顶部状态栏（迁移自 game.html drawStatusBar）。行情滚动由 AnimationSystem 推进，本处只读。
import type { Rc } from '../RenderContext';
import { COLORS, TICKER_ITEMS } from '../VisualTheme';
import { roundRect, drawMascot, drawDepositIcon } from './Primitives';
import { formatTime } from '../../../core/StateMachine';
import { BASE_W } from '../CanvasLayout';

export function drawStatusBar(rc: Rc): void {
  const { ctx, state, view } = rc;
  ctx.fillStyle = COLORS.brandRed; ctx.fillRect(0, 0, BASE_W, 52);
  drawMascot(ctx, 12, 8, 36);
  ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF'; ctx.font = '15px "ZCOOL KuaiLe"';
  ctx.fillText('人生标签交易所', 62, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px "Courier New"';
  ctx.fillText('二楼批发区', 62, 40);

  const order = state ? state.currentShiftOrder : 1;
  ctx.fillStyle = '#FFFFFF'; ctx.font = '11px "Press Start 2P"';
  ctx.fillText('第 ' + order + ' 班', 226, 22);

  if (state && state.shiftTimer && state.shiftTimer.enabled) {
    const rem = state.shiftTimer.remainingSeconds as number;
    const isUrgent = rem <= 30;
    const isWarning = rem <= 60;
    const blink = isUrgent && (Math.sin(view.elapsed * Math.PI * 3) < 0);
    if (!blink) {
      ctx.fillStyle = isUrgent ? COLORS.ledDown : (isWarning ? COLORS.gold : '#FFFFFF');
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(formatTime(rem), 226, 42);
    }
    if (isWarning && !blink) {
      ctx.fillStyle = isUrgent ? COLORS.ledDown : COLORS.gold;
      ctx.font = '9px "Press Start 2P"';
      ctx.fillText('!', 290, 42);
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px "Press Start 2P"';
    ctx.fillText('DAY ' + order, 226, 42);
  }

  const ledX = 390, ledY = 8, ledW = 630, ledH = 36;
  // 先算一轮宽度，用于取模（不修改任何状态）
  ctx.font = '11px "Courier New"'; let oneLoop = 0;
  for (const it of TICKER_ITEMS) {
    const up = it.d >= 0;
    oneLoop += ctx.measureText('【' + it.name + '】').width + 4;
    oneLoop += ctx.measureText((up ? '▲ +' : '▼ ') + it.d + '%').width + 26;
  }
  const off = oneLoop > 0 ? (((view.tickerOffset % oneLoop) + oneLoop) % oneLoop) : 0;

  ctx.save(); roundRect(ctx, ledX, ledY, ledW, ledH, 3); ctx.clip();
  ctx.fillStyle = COLORS.ledBg; ctx.fillRect(ledX, ledY, ledW, ledH);
  ctx.font = '11px "Courier New"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let cursor = ledX - off; const midY = ledY + ledH / 2;
  for (let rep = 0; rep < 3; rep++) {
    for (const it of TICKER_ITEMS) {
      const up = it.d >= 0;
      ctx.fillStyle = '#FFFFFF'; const nameTxt = '【' + it.name + '】';
      ctx.fillText(nameTxt, cursor, midY); cursor += ctx.measureText(nameTxt).width + 4;
      ctx.fillStyle = up ? COLORS.ledUp : COLORS.ledDown;
      const valTxt = (up ? '▲ +' : '▼ ') + it.d + '%';
      ctx.fillText(valTxt, cursor, midY); cursor += ctx.measureText(valTxt).width + 26;
    }
  }
  ctx.textBaseline = 'alphabetic'; ctx.restore();

  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '10px "Noto Sans SC"';
  ctx.fillText('押金', 1030, 30);
  const startX = 1066;
  const cur = state ? state.depositTags.current : 5;
  const max = state ? state.depositTags.max : 5;
  for (let i = 0; i < max; i++) drawDepositIcon(ctx, startX + i * 34, 11, i < cur ? 'active' : 'spent');
  if (view.depositAnim) {
    const t = view.depositAnim.t;
    ctx.fillStyle = 'rgba(255,68,68,' + (1 - t) + ')';
    ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText(String(view.depositAnim.delta), 1200, 30 - t * 30);
    ctx.textAlign = 'left';
  }
}
