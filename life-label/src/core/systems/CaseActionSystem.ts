// ============================================================
//  CaseActionSystem —— 案件操作（§5.2~§5.6）
//  迁移自 game.html selectCase / inspectCase / revealHiddenTag / shipCase / returnCase
//  及其守卫与资源工具。守卫为纯函数（供表现层渲染调用，不产生事件/不改状态）。
//  原 UI 副作用（开卡、翻面、揭标弹出、盖章、退货动画）改为事件。
// ============================================================
import type { GameEngine } from '../GameEngine';
import type { ResourceDeltas, HiddenTag } from '../../data/GameDataTypes';
import type { PlayerState } from '../model/PlayerState';
import { isTerminalCaseStatus } from '../StateMachine';

export interface ShipCheck { ok: boolean; reason?: string }

export class CaseActionSystem {
  constructor(private e: GameEngine) {}

  // ---------- 资源 / 开放性工具 ----------
  actionCost(actionId: string): ResourceDeltas {
    const state = this.e.state;
    const shift = this.e.context.index.shiftsById[state.currentShiftId as string];
    if (shift && shift.actionCosts && shift.actionCosts[actionId]) return shift.actionCosts[actionId];
    const dac = this.e.context.config.defaultActionCosts;
    if (dac && dac[actionId]) return dac[actionId];
    return {};
  }
  canAfford(cost: ResourceDeltas): boolean {
    const r = this.e.state.resources as Record<string, number>;
    for (const k in cost) { if ((r[k] || 0) + cost[k] < 0) return false; }
    return true;
  }
  private applyCost(cost: ResourceDeltas): void {
    const r = this.e.state.resources as Record<string, number>;
    for (const k in cost) r[k] = (r[k] || 0) + cost[k];
  }
  private shiftActionOpen(actionId: string): boolean {
    const shift = this.e.context.index.shiftsById[this.e.state.currentShiftId as string];
    return shift.availableActionIds.includes(actionId);
  }
  private nextHiddenTag(caseId: string): HiddenTag | null {
    const cs = this.e.context.index.casesById[caseId];
    const rc = this.e.state.runtimeCases[caseId];
    const remaining = cs.hiddenTags.filter((h) => !rc.revealedHiddenTagIds.includes(h.id))
      .sort((a, b) => a.order - b.order);
    return remaining[0] || null;
  }

  // ---------- §5.2 selectCase ----------
  select(caseId: string) {
    const state = this.e.state;
    if (state.phase !== 'SHIFT_ACTIVE') return this.e.reject('当前不可选择案件');
    if (!state.activeCaseIds.includes(caseId)) return this.e.reject('案件不在待处理区');
    const rc = state.runtimeCases[caseId];
    if (isTerminalCaseStatus(rc.status)) return this.e.reject('案件已不可操作');
    state.selectedCaseId = caseId;
    state.stats.casesSelected++;
    this.e.logEvent('case_selected', '选择案件 ' + caseId, { caseId, actionId: 'selectCase' });
    this.e.emit({ type: 'caseSelected', caseId });
    return { ok: true };
  }

  // ---------- §5.3 inspectCase / 扒底 ----------
  canInspect(state: PlayerState, caseId: string): boolean {
    if (state.phase !== 'SHIFT_ACTIVE') return false;
    if (!this.shiftActionOpen('inspectCase')) return false;
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return false;
    if (!state.activeCaseIds.includes(caseId)) return false;
    const rc = state.runtimeCases[caseId];
    if (!['UNTOUCHED', 'PARTIALLY_REVEALED', 'FULLY_REVEALED'].includes(rc.status)) return false;
    if (rc.backgroundRevealed) return false;
    return this.canAfford(this.actionCost('inspectCase'));
  }
  inspect(caseId: string) {
    const state = this.e.state;
    if (state.phase !== 'SHIFT_ACTIVE') return this.e.reject('当前不可扒底');
    if (!this.shiftActionOpen('inspectCase')) return this.e.reject('本班未开放扒底');
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return this.e.reject('案件不存在');
    if (!state.activeCaseIds.includes(caseId)) return this.e.reject('案件不可操作');
    const rc = state.runtimeCases[caseId];
    if (!['UNTOUCHED', 'PARTIALLY_REVEALED', 'FULLY_REVEALED'].includes(rc.status)) return this.e.reject('案件状态不允许');
    if (rc.backgroundRevealed) return this.e.reject('案件已扒底');
    const cost = this.actionCost('inspectCase');
    if (!this.canAfford(cost)) return this.e.reject('调查机会不足');
    this.applyCost(cost);
    rc.backgroundRevealed = true;
    if (rc.status === 'UNTOUCHED') rc.status = 'INSPECTED';
    state.stats.casesInspected++;
    state.turnIndex++;
    this.e.logEvent('case_inspected', cs.backgroundText, { caseId, actionId: 'inspectCase' });
    this.e.emit({ type: 'resourceChanged', actionId: 'inspectCase', deltas: cost });
    this.e.emit({ type: 'caseInspected', caseId, backgroundText: cs.backgroundText });
    return {
      ok: true, actionId: 'inspectCase', caseId,
      message: cs.backgroundText, detailText: '扒底完成 · 调查机会 -1', resourceDeltas: cost
    };
  }

  // ---------- §5.4 revealHiddenTag / 揭标 ----------
  canReveal(state: PlayerState, caseId: string): boolean {
    if (state.phase !== 'SHIFT_ACTIVE') return false;
    if (!this.shiftActionOpen('revealHiddenTag')) return false;
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return false;
    if (!state.activeCaseIds.includes(caseId)) return false;
    const rc = state.runtimeCases[caseId];
    if (isTerminalCaseStatus(rc.status)) return false;
    if (!this.nextHiddenTag(caseId)) return false;
    return this.canAfford(this.actionCost('revealHiddenTag'));
  }
  reveal(caseId: string) {
    const state = this.e.state;
    if (state.phase !== 'SHIFT_ACTIVE') return this.e.reject('当前不可揭标');
    if (!this.shiftActionOpen('revealHiddenTag')) return this.e.reject('本班未开放揭标');
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return this.e.reject('案件不存在');
    if (!state.activeCaseIds.includes(caseId)) return this.e.reject('案件不可操作');
    const entry = this.nextHiddenTag(caseId);
    if (!entry) return this.e.reject('没有可揭露的底标');
    const cost = this.actionCost('revealHiddenTag');
    if (!this.canAfford(cost)) return this.e.reject('调查机会不足');
    this.applyCost(cost);
    const rc = state.runtimeCases[caseId];
    rc.revealedHiddenTagIds.push(entry.id);
    const allRevealed = cs.hiddenTags.every((h) => rc.revealedHiddenTagIds.includes(h.id));
    rc.status = allRevealed ? 'FULLY_REVEALED' : 'PARTIALLY_REVEALED';
    state.stats.hiddenTagsRevealed++;
    state.turnIndex++;
    const tag = this.e.context.index.tagsById[entry.tagId];
    const msg = entry.revealText || (tag ? tag.displayName : entry.tagId);
    this.e.logEvent('case_hidden_tag_revealed', msg, { caseId, actionId: 'revealHiddenTag' });
    this.e.emit({ type: 'resourceChanged', actionId: 'revealHiddenTag', deltas: cost });
    this.e.emit({ type: 'hiddenTagRevealed', caseId, hiddenTagId: entry.id, tagId: entry.tagId, revealText: entry.revealText });
    return this.e.setActionResult({
      ok: true, actionId: 'revealHiddenTag', caseId,
      message: '揭标：' + (tag ? '【' + tag.displayName + '】' : '') + ' ' + msg,
      detailText: '调查机会 -1', nextPhaseAfterClose: 'SHIFT_ACTIVE'
    });
  }

  // ---------- §5.5 shipCase / 出货 ----------
  canShip(state: PlayerState, caseId: string, flowId: string): ShipCheck {
    if (state.phase !== 'SHIFT_ACTIVE') return { ok: false, reason: '当前不可出货' };
    if (!this.shiftActionOpen('shipCase')) return { ok: false, reason: '本班未开放出货' };
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return { ok: false, reason: '案件不存在' };
    if (!state.activeCaseIds.includes(caseId)) return { ok: false, reason: '案件不可操作' };
    const shift = this.e.context.index.shiftsById[state.currentShiftId as string];
    if (!shift.availableFlowIds.includes(flowId)) return { ok: false, reason: '该柜台本班未开放' };
    if (!cs.availableFlowIds.includes(flowId) || !cs.flowResults[flowId]) return { ok: false, reason: '该流向不接收此案件' };
    const rc = state.runtimeCases[caseId];
    if (isTerminalCaseStatus(rc.status)) return { ok: false, reason: '案件已不可出货' };
    if (shift.rules.requiresInspectionBeforeShipping && !rc.backgroundRevealed)
      return { ok: false, reason: '本班要求：出货前必须先扒底' };
    if (shift.rules.requiresRevealBeforeShipping && rc.revealedHiddenTagIds.length === 0)
      return { ok: false, reason: '本班要求：出货前必须先揭标' };
    if (!this.canAfford(this.actionCost('shipCase'))) return { ok: false, reason: '资源不足' };
    return { ok: true };
  }
  ship(caseId: string, flowId: string) {
    const state = this.e.state;
    const chk = this.canShip(state, caseId, flowId);
    if (!chk.ok) return this.e.reject(chk.reason as string);
    const cs = this.e.context.index.casesById[caseId];
    const fr = cs.flowResults[flowId];
    this.applyCost(this.actionCost('shipCase'));
    const rc = state.runtimeCases[caseId];
    rc.status = 'SHIPPED_PENDING_CALLBACK';
    rc.shippedToFlowId = flowId;
    rc.shippedAtShiftId = state.currentShiftId;
    rc.shippedAtShiftOrder = state.currentShiftOrder;
    rc.outcome = fr.outcome;
    state.activeCaseIds = state.activeCaseIds.filter((id) => id !== caseId);

    let due: number | 'final';
    if (fr.callbackDelay === 'final') due = 'final';
    else due = state.currentShiftOrder + (fr.callbackDelay as number);
    const cb = {
      id: 'cb_' + caseId + '_' + state.currentShiftOrder,
      caseId, flowId, outcome: fr.outcome,
      callbackText: fr.callbackText, longTermText: fr.longTermText || null,
      depositDelta: fr.depositDelta, resultTags: fr.resultTags || [],
      createdAtShiftId: state.currentShiftId as string, createdAtShiftOrder: state.currentShiftOrder,
      dueShiftOrder: due, status: (fr.callbackDelay === 0 ? 'ready' : 'pending') as 'ready' | 'pending',
      resolvedAtShiftOrder: null
    };
    state.pendingCallbacks.push(cb);
    state.stats.casesShipped++;
    state.shiftStats.shipped++;
    state.selectedCaseId = null;
    state.turnIndex++;
    this.e.logEvent('case_shipped', '出货 ' + caseId + ' → ' + flowId, { caseId, actionId: 'shipCase', payload: { flowId } });
    this.e.tendency.applyDeltas(fr.tendencyDeltas, 'shipCase ' + caseId + '→' + flowId);
    this.e.emit({ type: 'caseShipped', caseId, flowId, outcome: fr.outcome, immediateText: fr.immediateText });

    const nextPhase = (fr.callbackDelay === 0) ? 'CALLBACK_REVIEW' : 'SHIFT_ACTIVE';
    return this.e.setActionResult({
      ok: true, actionId: 'shipCase', caseId, flowId,
      message: fr.immediateText, detailText: '已加入跟单板', nextPhaseAfterClose: nextPhase
    });
  }

  // ---------- §5.6 returnCase / 退货 ----------
  canReturn(state: PlayerState, caseId: string): boolean {
    if (state.phase !== 'SHIFT_ACTIVE') return false;
    if (!this.shiftActionOpen('returnCase')) return false;
    const cs = this.e.context.index.casesById[caseId]; if (!cs) return false;
    if (!state.activeCaseIds.includes(caseId)) return false;
    const rc = state.runtimeCases[caseId];
    if (isTerminalCaseStatus(rc.status)) return false;
    return this.canAfford(this.actionCost('returnCase'));
  }
  return(caseId: string) {
    const state = this.e.state;
    if (!this.canReturn(state, caseId)) return this.e.reject('当前不可退货');
    const cs = this.e.context.index.casesById[caseId];
    const ret = cs.returnResult;
    this.applyCost(this.actionCost('returnCase'));
    const rc = state.runtimeCases[caseId];
    rc.status = 'RETURNED';
    rc.returnedAtShiftId = state.currentShiftId;
    rc.returnedAtShiftOrder = state.currentShiftOrder;
    rc.autoReturned = false;
    state.activeCaseIds = state.activeCaseIds.filter((id) => id !== caseId);
    state.stats.casesReturned++;
    state.shiftStats.returned++;
    state.selectedCaseId = null;
    state.turnIndex++;
    this.e.logEvent('case_returned', '退货 ' + caseId, { caseId, actionId: 'returnCase' });
    this.e.tendency.applyDeltas(ret.tendencyDeltas, 'returnCase ' + caseId);
    this.e.deposit.applyDelta(ret.depositDelta, 'returnCase');
    this.e.emit({ type: 'caseReturned', caseId, auto: false, immediateText: ret.immediateText });
    if (state.phase === 'RUN_FAILED') return { ok: true };
    return this.e.setActionResult({
      ok: true, actionId: 'returnCase', caseId,
      message: ret.immediateText, detailText: '案卷退回来货区',
      nextPhaseAfterClose: state.depositTags.current <= 0 ? 'RUN_FAILED' : 'SHIFT_ACTIVE'
    });
  }
}
