// ============================================================
//  GameLoop —— 固定顺序的每帧循环：
//   deltaTime → 提交时间更新(PlayerState) → 更新动画(ViewState)
//   → 表现帧更新 → 算布局/应用变换 → 渲染 → 下一帧
//  PlayerState 与 ViewState 分开更新；渲染只读、不推进时间。
// ============================================================
import type { CanvasContext } from '../presentation/canvas/CanvasContext';
import type { ViewState } from '../presentation/ViewState';
import type { RenderData, Rc } from '../presentation/canvas/RenderContext';
import type { GameController } from './GameController';
import { updateAnimations } from '../presentation/animation/AnimationSystem';
import { renderFrame } from '../presentation/canvas/CanvasRenderer';

export class GameLoop {
  private lastTime = 0;
  /** 测试/调试用：关闭动画推进以验证"规则与动画解耦" */
  animationsEnabled = true;

  constructor(
    private cc: CanvasContext,
    private controller: GameController,
    private view: ViewState,
    private data: RenderData
  ) {}

  start(): void {
    requestAnimationFrame(this.frame);
  }

  private frame = (ts: number): void => {
    // 1. deltaTime
    const dt = this.lastTime ? Math.min(0.05, (ts - this.lastTime) / 1000) : 0.016;
    this.lastTime = ts;
    // 2. 提交时间更新（PlayerState：限时倒计时）
    this.controller.tick(dt);
    // 3. 更新动画（ViewState）
    if (this.animationsEnabled) updateAnimations(this.view, dt);
    // 4. 表现帧更新（延迟触发气泡）
    this.controller.update();
    // 5. 算布局 + 应用缩放变换
    this.cc.applyTransform();
    // 6. 渲染（只读）
    const rc: Rc = {
      ctx: this.cc.ctx,
      state: this.controller.getState(),
      view: this.view,
      data: this.data,
      q: this.controller.queries
    };
    renderFrame(rc);
    // 7. 下一帧
    requestAnimationFrame(this.frame);
  };
}
