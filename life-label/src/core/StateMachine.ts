// ============================================================
//  StateMachine —— 相位切换与计时器联动（平台无关）
//  迁移自 game.html setPhase；进入 SHIFT_ACTIVE 时驱动限时计时器。
// ============================================================
import type { GameEngine } from './GameEngine';
import type { GamePhase, RuntimeCaseStatus } from './model/GameEnums';
import { TERMINAL_CASE_STATUSES } from './model/GameEnums';

/** 格式化倒计时为 mm:ss（纯字符串，无 DOM） */
export function formatTime(seconds: number | null): string {
  if (seconds == null) return '--:--';
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

/** 案件是否处于终态（禁止再操作） */
export function isTerminalCaseStatus(status: RuntimeCaseStatus): boolean {
  return (TERMINAL_CASE_STATUSES as readonly string[]).includes(status);
}

/** 切换相位（含计时器 running 联动），迁移自 game.html setPhase */
export function applyPhase(engine: GameEngine, phase: GamePhase): void {
  const state = engine.state;
  state.phase = phase;
  if (!state.shiftTimer || !state.shiftTimer.enabled || state.shiftTimer.expired) return;
  const shouldRun = phase === 'SHIFT_ACTIVE';
  if (shouldRun && !state.shiftTimer.hasStarted) {
    state.shiftTimer.hasStarted = true;
    engine.logEvent('shift_timer_started', '限时开始 ' + formatTime(state.shiftTimer.remainingSeconds), {
      payload: { remainingSeconds: state.shiftTimer.remainingSeconds }
    });
  }
  state.shiftTimer.running = shouldRun;
}
