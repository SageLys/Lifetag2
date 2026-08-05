// ============================================================
//  CanvasContext —— 管理 <canvas>、2D 上下文与基准坐标缩放。
//  基准坐标系 1280×720，按窗口等比缩放。
// ============================================================
import { BASE_W, BASE_H } from './CanvasLayout';

export class CanvasContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scaleX = 1;
  scaleY = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 2D 渲染上下文');
    this.ctx = ctx;
    this.resize();
  }

  resize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.scaleX = window.innerWidth / BASE_W;
    this.scaleY = window.innerHeight / BASE_H;
  };

  /** 设置缩放变换（每帧绘制前调用一次） */
  applyTransform(): void {
    this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
  }

  /** 客户端坐标 → 基准坐标系坐标（输入命中用） */
  toBase(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) / this.scaleX, y: (clientY - rect.top) / this.scaleY };
  }

  setCursor(cursor: string): void {
    this.canvas.style.cursor = cursor;
  }
}
