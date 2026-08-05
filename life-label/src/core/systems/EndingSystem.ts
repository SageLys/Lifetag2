// ============================================================
//  EndingSystem —— 结局构建（§5.13，迁移自 game.html buildEnding / finishFinalCallbackReview）
//  按 priority 升序匹配第一个满足条件者；押金 ≤0 直接失败。
//  结局条件含 tendency 阈值（完整保留）。
// ============================================================
import type { GameEngine } from '../GameEngine';
import type { EndingDef } from '../../data/GameDataTypes';

export class EndingSystem {
  constructor(private e: GameEngine) {}

  finishFinalCallbackReview(): void {
    this.e.setPhase('ENDING_BUILD');
    this.build();
  }

  build(): void {
    const state = this.e.state;
    const ctx = this.e.context;
    if (state.depositTags.current <= 0) { this.e.setPhase('RUN_FAILED'); return; }

    const cond = (en: EndingDef): boolean => {
      const c = en.conditions || {};
      if (c.requiredRunStatus && state.runStatus !== c.requiredRunStatus) return false;
      if (c.minDepositTags != null && state.depositTags.current < c.minDepositTags) return false;
      if (c.maxDepositTags != null && state.depositTags.current > c.maxDepositTags) return false;
      if (c.minCompletedShifts != null && state.completedShiftIds.length < c.minCompletedShifts) return false;
      if (c.maxFailedShipments != null && state.stats.failedShipments > c.maxFailedShipments) return false;
      if (c.maxPerformancePenalties != null && state.stats.performancePenalties > c.maxPerformancePenalties) return false;
      if (c.minTendency) {
        for (const id in c.minTendency) {
          if (((state.tendencies as any)[id] || 0) < (c.minTendency as any)[id]) return false;
        }
      }
      if (c.maxTendency) {
        for (const id in c.maxTendency) {
          if (((state.tendencies as any)[id] || 0) > (c.maxTendency as any)[id]) return false;
        }
      }
      return true;
    };

    const sorted = ctx.endings.slice().sort((a, b) => a.priority - b.priority);
    let chosen = sorted.find(cond);
    if (!chosen) chosen = ctx.endings.find((e) => e.id === ctx.config.defaultEndingId);
    const c = chosen!;
    state.finalReport = {
      endingId: c.id, title: c.title, reportHeader: c.reportHeader,
      bodyText: c.bodyText, depositTagsRemaining: state.depositTags.current,
      completedShiftCount: state.completedShiftIds.length, stats: this.e.clone(state.stats),
      resultTags: c.resultTags || []
    };
    state.runStatus = 'completed';
    this.e.logEvent('ending_built', c.id);
    this.e.emit({ type: 'endingBuilt', endingId: c.id });
    this.e.setPhase('ENDING_DISPLAY');
  }
}
