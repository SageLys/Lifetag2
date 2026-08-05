// ============================================================
//  PointerInput —— 鼠标输入 → 命令。
//  先查 HitMap（按钮/弹窗），再处理 SHIFT_ACTIVE 的卡片标签/来货堆/拖拽。
//  输入不直接改 PlayerState/tendency，不自行判断出货成功——只提交命令。
// ============================================================
import type { CanvasContext } from '../presentation/canvas/CanvasContext';
import type { ViewState } from '../presentation/ViewState';
import type { RenderData } from '../presentation/canvas/RenderContext';
import type { PlayerState } from '../core/model/PlayerState';
import type { GameCommand } from '../core/protocol/GameCommand';
import type { CommandResult } from '../core/protocol/CommandResult';
import type { HitAction } from '../presentation/canvas/CanvasLayout';
import { buildHitMap } from '../presentation/canvas/CanvasLayout';
import { resolveHit } from './HitMap';
import { pointInRect, hitCardBody, hitCardTab, stackTopRect } from './HitTest';
import { DragController } from './DragController';

export interface InputController {
  getState(): PlayerState;
  submit(cmd: GameCommand): CommandResult;
  handleAction(action: HitAction): void;
  handleTab(key: string): void;
}

export class PointerInput {
  private drag: DragController;

  constructor(
    private cc: CanvasContext,
    private controller: InputController,
    private view: ViewState,
    private data: RenderData
  ) {
    this.drag = new DragController(view, data, (cmd) => controller.submit(cmd));
  }

  attach(): void {
    this.cc.canvas.addEventListener('mousedown', this.onDown);
    this.cc.canvas.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
  }

  private onDown = (e: MouseEvent): void => {
    const p = this.cc.toBase(e.clientX, e.clientY); this.view.pointer = p;
    const state = this.controller.getState();
    const regions = buildHitMap(this.cc.ctx, state, this.view, this.data);
    const action = resolveHit(regions, p);
    if (action) { this.controller.handleAction(action); return; }
    if (!state || state.phase !== 'SHIFT_ACTIVE') return;

    // 1. 卡片操作标签
    if (this.view.activeCard) {
      const key = hitCardTab(this.view.activeCard, p);
      if (key) { this.controller.handleTab(key); return; }
    }
    // 2. 来货堆顶
    const ids = state.activeCaseIds.filter((id) => id !== state.selectedCaseId);
    if (ids.length > 0 && pointInRect(p, stackTopRect())) { this.controller.submit({ type: 'selectCase', caseId: ids[0] }); return; }
    // 3. 活动卡 → 开始拖拽
    if (this.view.activeCard && this.view.activeCard.slideT > 0.5 && hitCardBody(this.view.activeCard, p)) {
      this.drag.start(p);
    }
  };

  private onMove = (e: MouseEvent): void => {
    const p = this.cc.toBase(e.clientX, e.clientY); this.view.pointer = p;
    this.view.stackHover = false;
    if (this.drag.active() && this.view.activeCard) {
      this.drag.move(p);
      this.cc.setCursor('grabbing');
      return;
    }
    let cur = 'default';
    const state = this.controller.getState();
    if (state && state.phase === 'SHIFT_ACTIVE') {
      if (this.view.activeCard && hitCardTab(this.view.activeCard, p)) cur = 'pointer';
      else if (this.view.activeCard && hitCardBody(this.view.activeCard, p)) cur = 'grab';
      else {
        const ids = state.activeCaseIds.filter((id) => id !== state.selectedCaseId);
        if (ids.length > 0 && pointInRect(p, stackTopRect())) { cur = 'grab'; this.view.stackHover = true; }
      }
    }
    const regions = buildHitMap(this.cc.ctx, state, this.view, this.data);
    for (const r of regions) { if (pointInRect(p, r)) { cur = 'pointer'; break; } }
    this.cc.setCursor(cur);
  };

  private onUp = (e: MouseEvent): void => {
    const p = this.cc.toBase(e.clientX, e.clientY); this.view.pointer = p;
    this.drag.up(p);
  };
}
