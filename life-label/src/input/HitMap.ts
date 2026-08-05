// ============================================================
//  HitMap —— 显式命中区域查询，替代"绘制时顺便写 clickTargets"的隐式机制。
//  命中区域由 CanvasLayout.buildHitMap 生成；这里只做"取最上层命中"。
// ============================================================
import type { HitRegion, HitAction } from '../presentation/canvas/CanvasLayout';
import { pointInRect } from './HitTest';

export type { HitRegion, HitAction };

/** 从末尾向前匹配（靠后者优先级更高，等价 game.html clickTargets 逆序） */
export function resolveHit(regions: HitRegion[], p: { x: number; y: number }): HitAction | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    if (pointInRect(p, regions[i])) return regions[i].action;
  }
  return null;
}
