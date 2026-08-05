// ============================================================
//  TendencySystem —— 倾向累计（完整保留，不得弱化）
//  迁移自 game.html applyTendencyDeltas。仅出货/退货时调用。
//  每次有效变化必产生 tendencyChanged 事件。
// ============================================================
import type { GameEngine } from '../GameEngine';
import { TENDENCY_IDS, getDominantTendency } from '../model/TendencyState';
import type { TendencyDeltas, TendencyId } from '../model/TendencyState';

export class TendencySystem {
  constructor(private e: GameEngine) {}

  applyDeltas(deltas: TendencyDeltas | undefined | null, reason: string): void {
    if (!deltas) return;
    const state = this.e.state;
    const changed: TendencyDeltas = {};
    for (const id of TENDENCY_IDS) {
      const d = (deltas as Record<TendencyId, number>)[id];
      if (typeof d === 'number' && d !== 0) {
        state.tendencies[id] = (state.tendencies[id] || 0) + d;
        changed[id] = d;
      }
    }
    if (Object.keys(changed).length > 0) {
      const totals = this.e.clone(state.tendencies);
      this.e.logEvent('tendency_changed', reason, { payload: { deltas: changed, totals } });
      this.e.emit({ type: 'tendencyChanged', deltas: changed, totals, reason });
    }
  }

  /** 主导倾向（≥3 的最高分），转调 model（供结局/失败报告使用） */
  dominant(): TendencyId | null {
    return getDominantTendency(this.e.state.tendencies);
  }
}
