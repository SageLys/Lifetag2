// ============================================================
//  PresentationController —— 根据 core 事件触发表现（动画 / Toast / 标宝气泡 / 场景重建）。
//  不参与规则判定；只读 PlayerState，写 ViewState。迁移自 legacy 适配层 handleEvents + 动画触发。
// ============================================================
import type { ViewState } from './ViewState';
import type { RenderData } from './canvas/RenderContext';
import type { PlayerState } from '../core/model/PlayerState';
import type { GameEvent } from '../core/protocol/GameEvent';
import { computeFlowZones, CARD_W, CARD_H, CARD_X, CARD_Y } from './canvas/CanvasLayout';

export class PresentationController {
  constructor(private view: ViewState, private data: RenderData) {}

  /** 消费一批领域事件，转换为表现副作用 */
  handleEvents(events: GameEvent[], state: PlayerState): void {
    const view = this.view;
    for (const ev of events) {
      switch (ev.type) {
        case 'runStarted':
          view._depositBubbleShown = false; view._mascotPending = false; view._depositBubblePending = false;
          break;
        case 'shiftEntered':
          this.buildScene(state); view._mascotPending = true;
          break;
        case 'caseSelected':
          this.openActiveCard(ev.caseId);
          break;
        case 'caseInspected':
          if (view.activeCard && view.activeCard.caseId === ev.caseId) view.activeCard.flipTarget = 1;
          break;
        case 'hiddenTagRevealed':
          if (view.activeCard && view.activeCard.caseId === ev.caseId) {
            view.activeCard.flipTarget = 0;
            view.revealPop = { caseId: ev.caseId, id: ev.hiddenTagId, t: 0 };
          }
          break;
        case 'caseShipped':
          this.startStampAnim(ev.flowId, ev.caseId);
          break;
        case 'caseReturned':
          if (!ev.auto) this.startReturnAnim(ev.caseId);
          break;
        case 'depositChanged':
          if (ev.delta < 0) view.depositAnim = { t: 0, dur: 0.7, delta: ev.delta };
          if (ev.current === 2 && !view._depositBubbleShown) {
            view._depositBubbleShown = true; view._depositBubblePending = true;
          }
          break;
        case 'timerExpired':
          view.dragging = false; view.hoveredZone = null; view.activeCard = null;
          this.showToast('限时归零，系统强制收班');
          break;
        case 'commandRejected':
          this.showToast(ev.reason);
          break;
        default:
          break;
      }
    }
  }

  /** 每帧调用：SHIFT_ACTIVE 下触发待显示的标宝/押金气泡（迁移自 drawScene 内的延迟触发） */
  update(state: PlayerState): void {
    const view = this.view;
    if (state.phase === 'SHIFT_ACTIVE') {
      if (view._depositBubblePending) {
        this.showMascotBubble('押金标签尚余 ' + state.depositTags.current + ' 枚，请注意操盘质量。');
        view._depositBubblePending = false;
      } else if (view._mascotPending) {
        this.showMascotBubble(this.pickMascotLine(state));
        view._mascotPending = false;
      }
    }
  }

  showToast(text: string): void { this.view.toast = { text, t: 0 }; }
  showMascotBubble(text: string): void { this.view.mascotBubble = { text, t: 0 }; }

  private buildScene(state: PlayerState): void {
    const view = this.view;
    const shift = this.data.shiftsById[state.currentShiftId as string];
    view.flowZones = computeFlowZones(shift.availableFlowIds, this.data.flowsById);
    view.activeCard = null;
    view.stamp = null; view.returnAnim = null; view.revealPop = null;
    view.dragging = false; view.hoveredZone = null;
  }

  private openActiveCard(caseId: string): void {
    this.view.activeCard = {
      caseId, w: CARD_W, h: CARD_H,
      x: 40, y: 120,
      targetX: CARD_X, targetY: CARD_Y,
      rotation: -3, rotTarget: -0.8,
      flip: 0, flipTarget: 0, slideT: 0
    };
  }

  private startStampAnim(flowId: string, caseId: string): void {
    const cs = this.data.casesById[caseId];
    this.view.stamp = { flowId, caseId, caseName: cs.caseNo, t: 0, dur: 0.9, cardX: CARD_X, cardY: CARD_Y, w: CARD_W, h: CARD_H };
    this.view.activeCard = null;
  }

  private startReturnAnim(caseId: string): void {
    this.view.returnAnim = { caseId, t: 0, dur: 0.4, x: CARD_X, y: CARD_Y };
    this.view.activeCard = null;
  }

  // §6.4 标宝语录 —— 优先班次专属台词（60%），其余抽通用池
  private pickMascotLine(state: PlayerState): string {
    const m = this.data.mascot;
    if (!m) return '感谢您为人生流通作出贡献！';
    const shiftId = state && state.currentShiftId;
    const shiftLines = shiftId && m.byShift && m.byShift[shiftId];
    if (shiftLines && shiftLines.length > 0 && Math.random() < 0.6)
      return shiftLines[Math.floor(Math.random() * shiftLines.length)];
    const general = m.general || [];
    return general.length ? general[Math.floor(Math.random() * general.length)] : '感谢您为人生流通作出贡献！';
  }
}
