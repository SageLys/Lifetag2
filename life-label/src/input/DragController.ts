// ============================================================
//  DragController —— 卡片拖拽状态机（输入层）。
//  拖拽中只更新 ViewState 的视觉；放下时仅提交命令，合法性由引擎判断，
//  被拒绝则由本控制器让卡片弹回（slideT=0 重新滑回中心）。不直接改规则状态。
// ============================================================
import type { ViewState } from '../presentation/ViewState';
import type { RenderData } from '../presentation/canvas/RenderContext';
import type { GameCommand } from '../core/protocol/GameCommand';
import type { CommandResult } from '../core/protocol/CommandResult';
import { pointInRect, returnBoxRect } from './HitTest';

type Submit = (cmd: GameCommand) => CommandResult;

export class DragController {
  private offX = 0;
  private offY = 0;

  constructor(private view: ViewState, private data: RenderData, private submit: Submit) {}

  active(): boolean { return this.view.dragging; }

  start(p: { x: number; y: number }): void {
    const card = this.view.activeCard;
    if (!card) return;
    this.view.dragging = true;
    this.offX = p.x - card.x;
    this.offY = p.y - card.y;
  }

  move(p: { x: number; y: number }): void {
    const card = this.view.activeCard;
    if (!card) return;
    card.x = p.x - this.offX;
    card.y = p.y - this.offY;
    card.slideT = 1;
    this.view.hoveredZone = null;
    if (pointInRect(p, returnBoxRect())) this.view.hoveredZone = 'return';
    else {
      for (const z of this.view.flowZones) {
        if (z.available && pointInRect(p, z)) { this.view.hoveredZone = z.id; break; }
      }
    }
  }

  up(_p: { x: number; y: number }): void {
    const card = this.view.activeCard;
    if (!this.view.dragging || !card) { this.view.dragging = false; return; }
    const caseId = card.caseId;
    const target = this.view.hoveredZone;
    this.view.dragging = false;
    this.view.hoveredZone = null;

    if (target === 'return') {
      const res = this.submit({ type: 'returnCase', caseId });
      if (!res.ok) this.snapBack();
    } else if (target && this.data.flowsById[target]) {
      const res = this.submit({ type: 'shipCase', caseId, flowId: target });
      if (!res.ok) this.snapBack();   // 非法目标：表现层弹回
    } else {
      this.snapBack();
    }
  }

  private snapBack(): void {
    if (this.view.activeCard) this.view.activeCard.slideT = 0;
  }
}
