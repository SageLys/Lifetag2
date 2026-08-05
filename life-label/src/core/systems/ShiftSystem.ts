// ============================================================
//  ShiftSystem —— 班次生命周期（§2.5 / §5.10~§5.12）
//  迁移自 game.html enterShift / beginShiftWork / closeActionResult /
//  checkAutoEndShift / canEndShift / endShift / startNextShift / enterFinalCallbacksOrEnding。
//  原 buildScene / 标宝触发等 UI 改为 shiftEntered 事件交给表现层。
// ============================================================
import type { GameEngine } from '../GameEngine';
import type { PlayerState } from '../model/PlayerState';
import { createShiftTimer } from '../model/PlayerState';
import { createRuntimeCase } from '../model/RuntimeCaseState';
import { formatTime } from '../StateMachine';

export interface EndShiftOptions { forcedByTimeout?: boolean; forceReturn?: boolean }

export class ShiftSystem {
  constructor(private e: GameEngine) {}

  // §2.5 enterShift（系统动作）
  enterShift(shiftId: string): void {
    const state = this.e.state;
    const shift = this.e.context.index.shiftsById[shiftId];
    state.currentShiftId = shiftId;
    state.currentShiftOrder = shift.order;
    state.resources = Object.assign(this.e.clone(this.e.context.config.defaultShiftResources), this.e.clone(shift.resources));
    state.shiftTimer = createShiftTimer(shift);
    state.activeCaseIds = shift.caseIds.slice();
    state.selectedCaseId = null;
    state.shiftStats = { shipped: 0, returned: 0, autoReturned: 0 };
    state.shiftSummary = null;
    for (const id of shift.caseIds) {
      if (!state.runtimeCases[id]) state.runtimeCases[id] = createRuntimeCase(id);
    }
    // §6.2 回单到期检查
    this.e.callback.checkReadyOnEnter();
    this.e.logEvent('shift_entered', '进入班次 ' + shiftId);
    if (state.shiftTimer.enabled) {
      this.e.logEvent('shift_timer_initialized', '限时班次初始化 ' + formatTime(state.shiftTimer.remainingSeconds), {
        payload: {
          totalSeconds: state.shiftTimer.totalSeconds,
          timeoutPolicy: state.shiftTimer.timeoutPolicy,
          warningThresholdSeconds: state.shiftTimer.warningThresholdSeconds
        }
      });
    }
    this.e.setPhase('SHIFT_START');
    this.e.emit({ type: 'shiftEntered', shiftId, shiftOrder: shift.order, timed: state.shiftTimer.enabled });
  }

  // beginShiftWork（班前页"开始处理"）
  beginShiftWork(): void {
    const state = this.e.state;
    this.e.logEvent('shift_started', '开始处理 ' + state.currentShiftId);
    this.e.emit({ type: 'shiftStarted', shiftId: state.currentShiftId as string });
    if (state.readyCallbackIds.length > 0) {
      this.e.callback.enterCallbackReview('CALLBACK_REVIEW');
    } else {
      this.e.setPhase('SHIFT_ACTIVE');
    }
    if (state.phase === 'SHIFT_ACTIVE' && state.shiftTimer.enabled && !state.shiftTimer.running && !state.shiftTimer.expired) {
      state.shiftTimer.running = true;
      this.e.logEvent('shift_timer_started', '限时开始 ' + formatTime(state.shiftTimer.remainingSeconds), {
        payload: { remainingSeconds: state.shiftTimer.remainingSeconds }
      });
    }
  }

  // 关闭即时反馈，推进相位
  closeActionResult(): void {
    const state = this.e.state;
    const res = state.lastActionResult;
    let next = (res && res.nextPhaseAfterClose) || 'SHIFT_ACTIVE';
    if (state.depositTags.current <= 0) next = 'RUN_FAILED';
    state.lastActionResult = null;
    if (next === 'CALLBACK_REVIEW') {
      state.readyCallbackIds = state.pendingCallbacks.filter((c) => c.status === 'ready').map((c) => c.id);
      this.e.callback.enterCallbackReview('CALLBACK_REVIEW');
    } else {
      this.e.setPhase(next);
      this.checkAutoEndShift();
    }
  }

  // 所有案件处理完时自动收班
  checkAutoEndShift(): void {
    const state = this.e.state;
    if (state.phase === 'SHIFT_ACTIVE' && state.activeCaseIds.length === 0) {
      this.endShift();
    }
  }

  // §5.10 canEndShift
  canEndShift(state: PlayerState): boolean {
    if (state.phase !== 'SHIFT_ACTIVE') return false;
    const shift = this.e.context.index.shiftsById[state.currentShiftId as string];
    if (shift.rules.unprocessedCasePolicy === 'block_end' && state.activeCaseIds.length > 0) return false;
    return true;
  }

  // §5.10 endShift / 收班
  endShift(opts: EndShiftOptions = {}) {
    const state = this.e.state;
    if (state.phase !== 'SHIFT_ACTIVE') return this.e.reject('当前不可收班');
    const shift = this.e.context.index.shiftsById[state.currentShiftId as string];
    const policy = shift.rules.unprocessedCasePolicy;
    const forcedByTimeout = !!opts.forcedByTimeout;
    const forceReturn = !!opts.forceReturn;
    if (!forcedByTimeout && !forceReturn && policy === 'block_end' && state.activeCaseIds.length > 0)
      return this.e.reject('仍有未处理案件，无法收班');

    // 自动退货
    if (forcedByTimeout || forceReturn || policy === 'auto_return') {
      const remaining = state.activeCaseIds.slice();
      for (const id of remaining) {
        const cs = this.e.context.index.casesById[id];
        const rc = state.runtimeCases[id];
        rc.status = 'RETURNED'; rc.autoReturned = true;
        rc.returnedAtShiftId = state.currentShiftId; rc.returnedAtShiftOrder = state.currentShiftOrder;
        state.activeCaseIds = state.activeCaseIds.filter((x) => x !== id);
        state.stats.casesAutoReturned++; state.shiftStats.autoReturned++;
        this.e.logEvent('case_auto_returned', '自动退货 ' + id, { caseId: id });
        this.e.emit({ type: 'caseReturned', caseId: id, auto: true });
        this.e.deposit.applyDelta(cs.returnResult.depositDelta, 'autoReturn');
        if ((state.phase as string) === 'RUN_FAILED') return { ok: true };
      }
    }

    // 班次绩效
    const { perfResults, failed } = this.e.performance.evaluate(shift);
    if (failed) return { ok: true };

    if (!state.completedShiftIds.includes(state.currentShiftId as string))
      state.completedShiftIds.push(state.currentShiftId as string);

    state.shiftSummary = {
      shiftId: state.currentShiftId as string,
      title: shift.summaryTitle || shift.displayName,
      shipped: state.shiftStats.shipped, returned: state.shiftStats.returned,
      autoReturned: state.shiftStats.autoReturned, perfResults,
      depositRemaining: state.depositTags.current,
      forcedByTimeout
    };
    this.e.logEvent('shift_ended', (forcedByTimeout ? '超时强制收班 ' : '收班 ') + state.currentShiftId, {
      payload: { forcedByTimeout }
    });
    this.e.emit({ type: 'shiftEnded', shiftId: state.currentShiftId as string, forcedByTimeout });
    this.e.setPhase('SHIFT_SUMMARY');
    return { ok: true };
  }

  // §5.11 startNextShift
  startNextShift(): void {
    const state = this.e.state;
    const shift = this.e.context.index.shiftsById[state.currentShiftId as string];
    if (!shift.nextShiftId) return;
    this.enterShift(shift.nextShiftId);
  }

  // §5.12 进入结局前清算所有未确认回单
  enterFinalCallbacksOrEnding(): void {
    const state = this.e.state;
    const hasPending = state.pendingCallbacks.some((c) => c.status !== 'resolved');
    if (hasPending) { this.e.callback.enterCallbackReview('FINAL_CALLBACK_REVIEW'); }
    else { this.e.setPhase('ENDING_BUILD'); this.e.ending.build(); }
  }
}
