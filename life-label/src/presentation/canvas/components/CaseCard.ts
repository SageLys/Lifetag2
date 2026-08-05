// 案件卡相关绘制：展开卡（正/底面 + flip）、操作标签页、来货堆、退货箱。
// 迁移自 game.html drawActiveCard / drawCardTabs / drawCaseStack / drawReturnBox。
import type { Rc } from '../RenderContext';
import type { ActiveCardView } from '../../ViewState';
import { COLORS, tagType } from '../VisualTheme';
import { roundRect, wrapText, drawMascot, drawLabelRow } from './Primitives';
import { AREA_BOTTOM } from '../CanvasLayout';

export function drawActiveCard(rc: Rc, card: ActiveCardView): void {
  const { ctx, state, view, data } = rc;
  const rcCase = state.runtimeCases[card.caseId];
  const cs = data.casesById[card.caseId];
  const { x, y, w, h } = card;
  const flip = card.flip;
  const sx = Math.abs(Math.cos(flip * Math.PI));
  const showBack = flip > 0.5;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(card.rotation * Math.PI / 180);
  ctx.scale(Math.max(0.02, sx), 1);

  const dragging = view.dragging;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = dragging ? 18 : 6; ctx.shadowOffsetX = dragging ? 5 : 3; ctx.shadowOffsetY = dragging ? 8 : 4;
  ctx.fillStyle = showBack ? COLORS.paperBack : COLORS.paper;
  roundRect(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  const left = -w / 2, top = -h / 2;

  if (!showBack) {
    ctx.fillStyle = COLORS.brandRed; ctx.fillRect(left, top, w, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '11px "ZCOOL KuaiLe"'; ctx.textAlign = 'left';
    ctx.fillText('人生标签交易所 · 批发区档案', left + 10, top + 18);
    drawMascot(ctx, left + w - 26, top + 5, 18);
    ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 22px "Noto Sans SC"'; ctx.textAlign = 'left';
    ctx.fillText(cs.caseNo, left + 14, top + 58);
    ctx.strokeStyle = '#B8A88A'; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(left + 12, top + 70); ctx.lineTo(left + w - 12, top + 70); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#424242'; ctx.font = '12px "Noto Sans SC"';
    wrapText(ctx, cs.summaryText, left + 14, top + 90, w - 28, 17, 2);

    const labelItems: Array<{ text: string; type: string; pop?: number }> = [];
    for (const tid of cs.visibleTagIds) { const t = data.tagsById[tid]; labelItems.push({ text: t ? t.displayName : tid, type: tagType(data.tagsById, tid) }); }
    for (const h2 of cs.hiddenTags.slice().sort((a, b) => a.order - b.order)) {
      if (rcCase.revealedHiddenTagIds.includes(h2.id)) {
        const t = data.tagsById[h2.tagId];
        const good = t && t.uiTone === 'valuable';
        const item: { text: string; type: string; pop?: number } = { text: t ? t.displayName : h2.tagId, type: good ? 'revealedGood' : 'revealed' };
        if (view.revealPop && view.revealPop.id === h2.id) item.pop = view.revealPop.t;
        labelItems.push(item);
      } else labelItems.push({ text: '?', type: 'hidden' });
    }
    drawLabelRow(ctx, labelItems, left + 14, top + 120, w - 28);
  } else {
    ctx.fillStyle = '#5D4037'; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('底  细', 0, top + 30);
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#A89070'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(left + 18, top + 44); ctx.lineTo(left + w - 18, top + 44); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#5D4037'; ctx.font = 'italic 14px "Ma Shan Zheng"';
    wrapText(ctx, cs.backgroundText, left + 18, top + 74, w - 36, 26, 8);
  }

  drawCardTabs(rc, card, left, h / 2 - 28, w);
  ctx.restore();
}

function drawCardTabs(rc: Rc, card: ActiveCardView, left: number, tabY: number, _w: number): void {
  const { ctx, state, data, q } = rc;
  const rcCase = state.runtimeCases[card.caseId];
  const cs = data.casesById[card.caseId];
  const remainHidden = cs.hiddenTags.length - rcCase.revealedHiddenTagIds.length;
  const inspectEnabled = q.canInspect(card.caseId);
  const inspected = rcCase.backgroundRevealed;
  const revealEnabled = q.canReveal(card.caseId);
  const returnEnabled = q.canReturn(card.caseId);
  const tabs = [
    { icon: '▽', text: inspected ? '翻面' : '扒底', enabled: inspected ? true : inspectEnabled, badge: undefined as number | undefined },
    { icon: '⬡', text: '揭标', badge: remainHidden, enabled: revealEnabled },
    { icon: '✕', text: '退货', enabled: returnEnabled, badge: undefined as number | undefined }
  ];
  const tabW = 96, gap = 8; let tx = left + 14;
  ctx.textAlign = 'left';
  for (const tab of tabs) {
    ctx.fillStyle = tab.enabled ? '#B8A88A' : '#8A7A68';
    ctx.beginPath();
    ctx.moveTo(tx, tabY + 28); ctx.lineTo(tx, tabY + 6); ctx.arcTo(tx, tabY, tx + 6, tabY, 6);
    ctx.lineTo(tx + tabW - 6, tabY); ctx.arcTo(tx + tabW, tabY, tx + tabW, tabY + 6, 6);
    ctx.lineTo(tx + tabW, tabY + 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tab.enabled ? '#3A2E1A' : '#6A5A48'; ctx.font = '11px "Courier New"';
    ctx.fillText(tab.icon + ' ' + tab.text, tx + 12, tabY + 18);
    if (tab.badge !== undefined && tab.badge > 0) {
      ctx.fillStyle = tab.enabled ? '#C62828' : '#9A8870'; ctx.font = '9px "Press Start 2P"';
      ctx.fillText('x' + tab.badge, tx + tabW - 26, tabY + 14);
    }
    tx += tabW + gap;
  }
}

export function drawCaseStack(rc: Rc): void {
  const { ctx, state, view, data } = rc;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(212,197,169,0.5)'; ctx.font = '10px "Noto Sans SC"';
  ctx.fillText('来货 · 待处理', 14, 72);
  const ids = state.activeCaseIds.filter((id) => id !== state.selectedCaseId);
  const sw = 160, sh = 100;
  for (let i = Math.min(ids.length, 3) - 1; i >= 0; i--) {
    const cs = data.casesById[ids[i]];
    const cx = 18 + i * 4, cy = 84 + i * 30;
    const isTop = i === 0;
    ctx.save();
    ctx.translate(cx + sw / 2, cy + sh / 2 - (isTop && view.stackHover ? 4 : 0));
    ctx.rotate((i % 2 === 0 ? -1 : 1) * (1 + i) * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = isTop && view.stackHover ? 8 : 5; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    ctx.fillStyle = COLORS.paper; roundRect(ctx, -sw / 2, -sh / 2, sw, sh, 3); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    const left = -sw / 2, top = -sh / 2;
    ctx.fillStyle = COLORS.brandRed; ctx.fillRect(left, top, sw, 18);
    drawMascot(ctx, left + sw - 16, top + 3, 12);
    ctx.fillStyle = '#1A1A1A'; ctx.font = 'bold 15px "Noto Sans SC"'; ctx.textAlign = 'left';
    ctx.fillText(cs.caseNo, left + 8, top + 40);
    ctx.fillStyle = '#5A5247'; ctx.font = '9px "Noto Sans SC"';
    wrapText(ctx, cs.summaryText, left + 8, top + 58, sw - 16, 12, 2);
    if (isTop) { ctx.fillStyle = 'rgba(58,46,26,0.55)'; ctx.font = '8px "Noto Sans SC"'; ctx.fillText('▲ 点击展开', left + 8, top + 90); }
    ctx.restore();
  }
  if (ids.length === 0) {
    ctx.fillStyle = 'rgba(212,197,169,0.3)'; ctx.font = '11px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('来货已清空', 98, 150); ctx.textAlign = 'left';
  }
}

export function drawReturnBox(rc: Rc): void {
  const { ctx, view } = rc;
  const x = 12, y = AREA_BOTTOM - 56, w = 172, h = 48;
  const hot = view.hoveredZone === 'return' && view.dragging;
  ctx.fillStyle = '#1A1208'; roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = hot ? COLORS.gold : '#8A7A68'; ctx.lineWidth = hot ? 1.6 : 1; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = hot ? COLORS.gold : '#8A7A68'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  const bx = x + 16, by = y + 16, bw = 26, bh = 22;
  ctx.strokeRect(bx, by + 6, bw, bh - 6);
  ctx.beginPath(); ctx.moveTo(bx - 2, by + 6); ctx.lineTo(bx + 6, by); ctx.lineTo(bx + bw + 2, by); ctx.lineTo(bx + bw - 6, by + 6); ctx.stroke();
  ctx.fillStyle = hot ? COLORS.gold : '#A8987A'; ctx.font = '13px "Courier New"'; ctx.textAlign = 'left';
  ctx.fillText(hot ? '放入退货' : '退货', x + 58, y + 33);
}
