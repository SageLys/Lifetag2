// ============================================================
//  KeyboardInput —— 键盘输入 → 命令。
//  ACTION_RESULT 相位下任意键关闭即时反馈（推进相位）。
// ============================================================
import type { InputController } from './PointerInput';

export class KeyboardInput {
  constructor(private controller: InputController) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const state = this.controller.getState();
    if (state && state.phase === 'ACTION_RESULT') {
      e.preventDefault();
      this.controller.submit({ type: 'closeActionResult' });
    }
  };
}
