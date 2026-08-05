// ============================================================
//  HitTest —— 几何命中工具。复用 CanvasLayout 的卡片/区域命中。
// ============================================================
import type { Rect } from '../presentation/canvas/CanvasLayout';
export { hitCardBody, hitCardTab, stackTopRect, returnBoxRect } from '../presentation/canvas/CanvasLayout';

export function pointInRect(p: { x: number; y: number }, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
