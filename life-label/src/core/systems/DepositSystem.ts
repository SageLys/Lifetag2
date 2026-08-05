// ============================================================
//  DepositSystem —— 押金标签变化（§4.3）
//  迁移自 game.html applyDepositDelta。UI 副作用（押金动画、剩2枚气泡）
//  改为通过 depositChanged 事件交给表现层处理。
// ============================================================
import type { GameEngine } from '../GameEngine';

export class DepositSystem {
  constructor(private e: GameEngine) {}

  applyDelta(delta: number, reason: string): void {
    if (delta === 0) return;
    const state = this.e.state;
    state.depositTags.current += delta;
    if (state.depositTags.current > state.depositTags.max) state.depositTags.current = state.depositTags.max;
    if (delta < 0) state.stats.depositLostTotal += Math.abs(delta);

    this.e.logEvent('deposit_changed', reason + ' ' + delta, { payload: { delta, reason } });
    this.e.emit({ type: 'depositChanged', delta, current: state.depositTags.current, reason });

    if (state.depositTags.current <= 0) {
      state.depositTags.current = 0;
      state.runStatus = 'failed';
      this.e.logEvent('run_failed', '押金标签归零');
      this.e.setPhase('RUN_FAILED');
      this.e.emit({ type: 'runFailed', reason: '押金标签归零' });
    }
  }
}
