// ============================================================
//  CallbackSystem —— 回单（§6.2 到期检查 / §5.7 确认）
//  迁移自 game.html enterShift 回单段 / sortCallbacks / enterCallbackReview / acknowledgeCallback。
// ============================================================
import type { GameEngine } from '../GameEngine';
import type { GamePhase } from '../model/GameEnums';

export class CallbackSystem {
  constructor(private e: GameEngine) {}

  /** §6.2 进班时检查到期回单（pending 且到期序号==当前班 order → ready） */
  checkReadyOnEnter(): void {
    const state = this.e.state;
    state.readyCallbackIds = [];
    for (const cb of state.pendingCallbacks) {
      if (cb.status === 'pending' && cb.dueShiftOrder === state.currentShiftOrder) {
        cb.status = 'ready';
        const rc = state.runtimeCases[cb.caseId];
        if (rc) rc.status = 'CALLBACK_READY';
        state.readyCallbackIds.push(cb.id);
        this.e.logEvent('callback_ready', '回单到期 ' + cb.caseId, { caseId: cb.caseId });
        this.e.emit({ type: 'callbackReady', callbackId: cb.id, caseId: cb.caseId });
      }
    }
  }

  private sortCallbacks(ids: string[]): string[] {
    const state = this.e.state;
    return ids.slice().sort((a, b) => {
      const ca = state.pendingCallbacks.find((c) => c.id === a)!;
      const cb = state.pendingCallbacks.find((c) => c.id === b)!;
      const da = ca.dueShiftOrder === 'final' ? 9999 : ca.dueShiftOrder;
      const db = cb.dueShiftOrder === 'final' ? 9999 : cb.dueShiftOrder;
      if (da !== db) return (da as number) - (db as number);
      if (ca.createdAtShiftOrder !== cb.createdAtShiftOrder) return ca.createdAtShiftOrder - cb.createdAtShiftOrder;
      return ca.caseId < cb.caseId ? -1 : 1;
    });
  }

  enterCallbackReview(phase: GamePhase): void {
    const state = this.e.state;
    let ids: string[];
    if (phase === 'FINAL_CALLBACK_REVIEW') {
      // 终审：清算一切尚未确认的回单
      ids = state.pendingCallbacks.filter((c) => c.status !== 'resolved').map((c) => c.id);
      for (const id of ids) {
        const cb = state.pendingCallbacks.find((c) => c.id === id)!;
        cb.status = 'ready';
        const rc = state.runtimeCases[cb.caseId];
        if (rc) rc.status = 'CALLBACK_READY';
      }
    } else {
      ids = state.readyCallbackIds.slice();
    }
    state.reviewQueue = this.sortCallbacks(ids);
    if (state.shiftTimer && state.shiftTimer.enabled) state.shiftTimer.running = false;
    this.e.setPhase(phase);
  }

  /** §5.7 逐条确认当前回单 */
  acknowledge(): void {
    const state = this.e.state;
    if (state.phase !== 'CALLBACK_REVIEW' && state.phase !== 'FINAL_CALLBACK_REVIEW') return;
    const id = state.reviewQueue[0];
    if (!id) return;
    const cb = state.pendingCallbacks.find((c) => c.id === id);
    if (!cb || cb.status !== 'ready') { state.reviewQueue.shift(); return; }
    const rc = state.runtimeCases[cb.caseId];
    rc.status = 'CALLBACK_RESOLVED';
    rc.callbackResolvedAtShiftId = (cb.dueShiftOrder === 'final') ? 'final' : state.currentShiftId;
    cb.status = 'resolved';
    cb.resolvedAtShiftOrder = (cb.dueShiftOrder === 'final') ? 'final' : state.currentShiftOrder;
    state.stats.callbacksResolved++;
    if (cb.outcome === 'failure') state.stats.failedShipments++;
    state.turnIndex++;
    this.e.logEvent('callback_resolved', cb.callbackText, { caseId: cb.caseId, payload: { depositDelta: cb.depositDelta } });
    this.e.emit({ type: 'callbackResolved', callbackId: cb.id, caseId: cb.caseId, outcome: cb.outcome, depositDelta: cb.depositDelta });
    this.e.deposit.applyDelta(cb.depositDelta, 'callback');
    state.reviewQueue.shift();
    if ((state.phase as string) === 'RUN_FAILED') return; // §8.1 中断（applyDelta 可能已改相位）
    if (state.reviewQueue.length === 0) {
      if (state.phase === 'CALLBACK_REVIEW') { this.e.setPhase('SHIFT_ACTIVE'); this.e.shift.checkAutoEndShift(); }
      else { this.e.ending.finishFinalCallbackReview(); }
    }
  }
}
