// ============================================================
//  TimerSystem —— 限时班次倒计时（迁移自 game.html updateShiftTimer / expireShiftTimer / syncTimerResource）
//  归零强制收班。UI 重置与 Toast 改为通过 timerExpired 事件交给表现层。
// ============================================================
import type { GameEngine } from '../GameEngine';
import { formatTime } from '../StateMachine';

export class TimerSystem {
  constructor(private e: GameEngine) {}

  private syncResource(): void {
    const state = this.e.state;
    if (!state || !state.shiftTimer || !state.shiftTimer.enabled) return;
    state.resources.timeRemainingSeconds = Math.max(0, Math.ceil(state.shiftTimer.remainingSeconds as number));
  }

  /** 每帧推进（命令 tick）。仅 SHIFT_ACTIVE & running & 未 expired 时倒数 */
  tick(dt: number): void {
    const state = this.e.state;
    if (!state || !state.shiftTimer || !state.shiftTimer.enabled) return;
    if (state.phase !== 'SHIFT_ACTIVE' || !state.shiftTimer.running || state.shiftTimer.expired) return;
    state.shiftTimer.remainingSeconds = Math.max(0, (state.shiftTimer.remainingSeconds as number) - dt);
    this.syncResource();
    for (const threshold of state.shiftTimer.warningThresholdSeconds) {
      if ((state.shiftTimer.remainingSeconds as number) <= threshold && !state.shiftTimer.warnedThresholdSeconds.includes(threshold)) {
        state.shiftTimer.warnedThresholdSeconds.push(threshold);
        this.e.logEvent('shift_timer_warning', '限时警告 ' + formatTime(threshold), {
          payload: { thresholdSeconds: threshold, remainingSeconds: state.shiftTimer.remainingSeconds }
        });
        this.e.emit({ type: 'timerWarning', thresholdSeconds: threshold, remainingSeconds: state.shiftTimer.remainingSeconds as number });
      }
    }
    if ((state.shiftTimer.remainingSeconds as number) <= 0) this.expire();
  }

  expire(): void {
    const state = this.e.state;
    if (!state || !state.shiftTimer || state.shiftTimer.expired) return;
    state.shiftTimer.expired = true;
    state.shiftTimer.running = false;
    state.shiftTimer.remainingSeconds = 0;
    this.syncResource();
    this.e.logEvent('shift_timer_expired', '限时归零，强制收班 ' + state.currentShiftId, {
      payload: { timeoutPolicy: state.shiftTimer.timeoutPolicy, activeCaseIds: state.activeCaseIds.slice() }
    });
    this.e.emit({ type: 'timerExpired', shiftId: state.currentShiftId as string });
    this.e.shift.endShift({ forcedByTimeout: true });
  }
}
