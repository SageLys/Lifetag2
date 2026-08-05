// ============================================================
//  AnimationSystem —— 基于 deltaTime 推进全部表现动画。
//  绘制函数只读这些进度，绝不在绘制中推进时间（迁移自 game.html updateAnims）。
// ============================================================
import type { ViewState } from '../ViewState';

export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
export function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
export function easeIn(t: number): number { return t * t; }

/** 每帧推进一次所有动画 / 计时型表现状态 */
export function updateAnimations(view: ViewState, dt: number): void {
  if (view.activeCard) {
    const a = view.activeCard;
    a.slideT = Math.min(1, a.slideT + dt / 0.3);
    const e = easeOut(a.slideT);
    a.x = lerp(40, a.targetX, e);
    a.y = lerp(120, a.targetY, e);
    a.rotation = lerp(-3, a.rotTarget, e);
    a.flip += (a.flipTarget - a.flip) * Math.min(1, dt / 0.18);
    if (Math.abs(a.flip - a.flipTarget) < 0.01) a.flip = a.flipTarget;
  }
  if (view.stamp) { view.stamp.t += dt / view.stamp.dur; if (view.stamp.t >= 1) view.stamp = null; }
  if (view.returnAnim) { view.returnAnim.t += dt / view.returnAnim.dur; if (view.returnAnim.t >= 1) view.returnAnim = null; }
  if (view.depositAnim) { view.depositAnim.t += dt / view.depositAnim.dur; if (view.depositAnim.t >= 1) view.depositAnim = null; }
  if (view.revealPop) { view.revealPop.t += dt / 0.35; if (view.revealPop.t >= 1) view.revealPop = null; }
  if (view.toast) { view.toast.t += dt; if (view.toast.t > 2.4) view.toast = null; }
  if (view.mascotBubble) { view.mascotBubble.t += dt; if (view.mascotBubble.t > 6.5) view.mascotBubble = null; }
  view.elapsed += dt;
  // LED 行情滚动（基线为 0.8px/帧 ≈ 48px/s，改为 dt 驱动，帧率无关；绘制时按 oneLoop 取模）
  view.tickerOffset += 48 * dt;
}
