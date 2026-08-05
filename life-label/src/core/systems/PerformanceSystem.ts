// ============================================================
//  PerformanceSystem —— 班次绩效结算（迁移自 game.html endShift 内的绩效段）
//  按规则判定达标/未达标，未达标按 performancePenaltyCap 扣押金。
// ============================================================
import type { GameEngine } from '../GameEngine';
import type { ShiftDef } from '../../data/GameDataTypes';
import type { PerfResult } from '../model/GameReports';

export interface PerformanceOutcome {
  perfResults: PerfResult[];
  /** 扣罚过程中押金归零导致本局失败（调用方应中断后续结算） */
  failed: boolean;
}

export class PerformanceSystem {
  constructor(private e: GameEngine) {}

  evaluate(shift: ShiftDef): PerformanceOutcome {
    const state = this.e.state;
    const perfResults: PerfResult[] = [];
    let penaltiesApplied = 0;
    const cap = shift.rules.performancePenaltyCap;
    const processed = state.shiftStats.shipped + state.shiftStats.returned + state.shiftStats.autoReturned;
    for (const rule of (shift.performanceRules || [])) {
      let pass = true;
      if (rule.type === 'min_shipped_cases') pass = state.shiftStats.shipped >= rule.target;
      else if (rule.type === 'max_returned_cases') pass = (state.shiftStats.returned + state.shiftStats.autoReturned) <= rule.target;
      else if (rule.type === 'required_cases_processed') pass = processed >= rule.target;
      perfResults.push({ pass, text: pass ? (rule.passText || '达标') : rule.failText });
      if (!pass && penaltiesApplied < cap) {
        this.e.deposit.applyDelta(rule.depositDelta, 'performance');
        state.stats.performancePenalties++; penaltiesApplied++;
        this.e.logEvent('performance_penalty_applied', rule.failText);
        this.e.emit({ type: 'performancePenaltyApplied', ruleText: rule.failText, depositDelta: rule.depositDelta });
        if (state.phase === 'RUN_FAILED') return { perfResults, failed: true };
      }
    }
    return { perfResults, failed: false };
  }
}
