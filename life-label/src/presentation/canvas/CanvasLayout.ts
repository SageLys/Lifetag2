// ============================================================
//  CanvasLayout —— 统一布局几何 + 命中区域（HitMap）
//  绘制与输入共享同一套坐标，杜绝"绘制时顺便写 clickTargets"的隐式机制。
// ============================================================
import type { PlayerState } from '../../core/model/PlayerState';
import type { ViewState, ActiveCardView } from '../ViewState';
import type { RenderData } from './RenderContext';
import type { GameCommand } from '../../core/protocol/GameCommand';
import { FLOW_ORDER } from './VisualTheme';

export const BASE_W = 1280, BASE_H = 720;

// 分区几何
export const AREA_TOP = 52;
export const AREA_H = 544;
export const AREA_BOTTOM = AREA_TOP + AREA_H;     // 596
export const FLOW_TOP = 600;
export const FLOW_H = 108;

// 展开案件卡几何
export const CARD_W = 480, CARD_H = 340;
export const CARD_X = 196 + (752 - CARD_W) / 2;     // 332
export const CARD_Y = AREA_TOP + (AREA_H - CARD_H) / 2; // 154

export interface Rect { x: number; y: number; w: number; h: number }

export function computeFlowZones(availableIds: string[], flowsById: RenderData['flowsById']) {
  const ids = FLOW_ORDER.filter((id) => flowsById[id]);
  const n = ids.length;
  const margin = 8, gap = 6;
  const w = (BASE_W - margin * 2 - gap * (n - 1)) / n;
  return ids.map((id, i) => ({
    id, x: margin + i * (w + gap), y: FLOW_TOP, w, h: FLOW_H,
    available: availableIds.includes(id)
  }));
}

export function stackTopRect(): Rect { return { x: 18, y: 84, w: 160, h: 100 }; }
export function returnBoxRect(): Rect { return { x: 12, y: AREA_BOTTOM - 56, w: 172, h: 48 }; }

export function cardTabRects(card: ActiveCardView) {
  const tabW = 96, gap = 8, left = -card.w / 2 + 14, tabY = card.h / 2 - 28;
  return [
    { key: 'inspect', x: left, y: tabY, w: tabW, h: 28 },
    { key: 'reveal', x: left + (tabW + gap), y: tabY, w: tabW, h: 28 },
    { key: 'return', x: left + 2 * (tabW + gap), y: tabY, w: tabW, h: 28 }
  ];
}

// ---------- 旋转卡片的命中变换 ----------
export function cardLocal(card: ActiveCardView, px: number, py: number) {
  const cx = card.x + card.w / 2, cy = card.y + card.h / 2;
  const dx = px - cx, dy = py - cy;
  const a = card.rotation * Math.PI / 180;
  return { lx: dx * Math.cos(a) + dy * Math.sin(a), ly: -dx * Math.sin(a) + dy * Math.cos(a) };
}
export function hitCardBody(card: ActiveCardView, p: { x: number; y: number }): boolean {
  const { lx, ly } = cardLocal(card, p.x, p.y);
  return lx >= -card.w / 2 && lx <= card.w / 2 && ly >= -card.h / 2 && ly <= card.h / 2;
}
export function hitCardTab(card: ActiveCardView, p: { x: number; y: number }): string | null {
  const { lx, ly } = cardLocal(card, p.x, p.y);
  for (const r of cardTabRects(card)) {
    if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return r.key;
  }
  return null;
}

// ---------- 各屏幕按钮矩形（绘制与命中共用，确保一致） ----------
export const BUTTONS = {
  titleStart: { x: BASE_W / 2 - 110, y: 450, w: 220, h: 56 },
  shiftStartBegin: { x: BASE_W / 2 - 100, y: 150 + 420 - 70, w: 200, h: 48 },          // 500
  callbackConfirm: { x: BASE_W / 2 - 100, y: 120 + 460 - 66, w: 200, h: 46 },          // 514
  actionResultContinue: { x: 210 + 724 - 150, y: (AREA_BOTTOM - 76) + 16, w: 130, h: 38 }, // 784,536
  summaryNext: { x: BASE_W / 2 - 110, y: 130 + 440 - 64, w: 220, h: 46 },              // 506
  endingRestart: { x: BASE_W / 2 - 100, y: 80 + 580 - 58, w: 200, h: 46 },             // 602
  failRestart: { x: BASE_W / 2 - 100, y: 45 + 590 - 56, w: 200, h: 46 },               // 579
  sceneEndShift: { x: 196 + 752 - 110, y: AREA_TOP + 12, w: 96, h: 36 },               // 838,64
  confirmOk: { x: 410 + 48, y: 260 + 200 - 62, w: 160, h: 42 },                        // 458,398
  confirmCancel: { x: 410 + 460 - 208, y: 260 + 200 - 62, w: 160, h: 42 }              // 662,398
} as const;

// ---------- 命中区域 ----------
export type HitAction =
  | { kind: 'command'; command: GameCommand }
  | { kind: 'closeActionResult' }
  | { kind: 'endShift' }
  | { kind: 'confirmEndShift' }
  | { kind: 'cancelEndShift' }
  | { kind: 'dismissBubble' }
  | { kind: 'summaryNext' }
  | { kind: 'block' };

export interface HitRegion extends Rect { action: HitAction }

function fullscreen(): Rect { return { x: 0, y: 0, w: BASE_W, h: BASE_H }; }

/** 标宝气泡矩形（需要 ctx 量文本，与 effects 绘制保持一致） */
export function mascotBubbleRect(ctx: CanvasRenderingContext2D, text: string): Rect {
  ctx.font = '12px "ZCOOL KuaiLe"';
  const chars = Array.from(text); let line = ''; const out: string[] = [];
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > 240 && line) { out.push(line); line = ch; }
    else line += ch;
  }
  if (line) out.push(line);
  let tw = 0; for (const l of out) tw = Math.max(tw, ctx.measureText(l).width);
  const padX = 12, padY = 10, lh = 18;
  return { x: 210, y: 58, w: tw + padX * 2, h: out.length * lh + padY * 2 };
}

/**
 * 构建当前帧的命中区域。数组顺序：靠后者优先级更高（输入从末尾向前匹配，
 * 等价于 game.html clickTargets 逆序遍历）。
 */
export function buildHitMap(ctx: CanvasRenderingContext2D, state: PlayerState | null, view: ViewState, _data: RenderData): HitRegion[] {
  const regions: HitRegion[] = [];
  const add = (r: Rect, action: HitAction) => regions.push({ ...r, action });

  const phase = state ? state.phase : 'TITLE';
  if (!state || phase === 'TITLE') {
    add(BUTTONS.titleStart, { kind: 'command', command: { type: 'startRun' } });
    return regions;
  }
  switch (phase) {
    case 'SHIFT_START':
      add(BUTTONS.shiftStartBegin, { kind: 'command', command: { type: 'beginShiftWork' } });
      break;
    case 'CALLBACK_REVIEW':
    case 'FINAL_CALLBACK_REVIEW':
      if (state.reviewQueue[0]) add(BUTTONS.callbackConfirm, { kind: 'command', command: { type: 'acknowledgeCallback' } });
      break;
    case 'SHIFT_ACTIVE':
      add(BUTTONS.sceneEndShift, { kind: 'endShift' });
      if (view.mascotBubble) add(mascotBubbleRect(ctx, view.mascotBubble.text), { kind: 'dismissBubble' });
      if (view.confirmEndShift) {
        add(fullscreen(), { kind: 'block' });
        add(BUTTONS.confirmOk, { kind: 'confirmEndShift' });
        add(BUTTONS.confirmCancel, { kind: 'cancelEndShift' });
      }
      break;
    case 'ACTION_RESULT':
      add(BUTTONS.actionResultContinue, { kind: 'closeActionResult' });
      add(fullscreen(), { kind: 'closeActionResult' });
      break;
    case 'SHIFT_SUMMARY':
      add(BUTTONS.summaryNext, { kind: 'summaryNext' });
      break;
    case 'ENDING_DISPLAY':
      add(BUTTONS.endingRestart, { kind: 'command', command: { type: 'restartRun' } });
      break;
    case 'RUN_FAILED':
      add(BUTTONS.failRestart, { kind: 'command', command: { type: 'restartRun' } });
      break;
    default:
      break;
  }
  return regions;
}
