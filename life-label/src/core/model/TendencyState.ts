// ============================================================
//  倾向系统（tendency）—— 独立的核心模块
//  完整保留 game.html 的语义：ID 集合、名称、当前值、增量、累计、
//  主导判断、结局条件类型、失败报告数据。不得删除、弱化或禁用。
//
//  累计规则（在规则层执行）：仅出货（flowResults[].tendencyDeltas）与
//  退货（returnResult.tendencyDeltas）时立即累加。主导判断阈值为 ≥3。
// ============================================================

/** 六种倾向 ID（与 game.html TENDENCY_IDS 完全一致，顺序不变） */
export type TendencyId =
  | 'cold_precision'
  | 'residual_empathy'
  | 'gambler_tendency'
  | 'traffic_instinct'
  | 'endorsement_worship'
  | 'over_caution';

export const TENDENCY_IDS: readonly TendencyId[] = [
  'cold_precision', 'residual_empathy', 'gambler_tendency',
  'traffic_instinct', 'endorsement_worship', 'over_caution'
];

export const TENDENCY_NAMES: Record<TendencyId, string> = {
  cold_precision: '冷血精准',
  residual_empathy: '残余共情',
  gambler_tendency: '赌徒倾向',
  traffic_instinct: '流量嗅觉',
  endorsement_worship: '背书崇拜',
  over_caution: '过度谨慎'
};

/** 倾向累计值（每个 id → 整数，初始 0） */
export type TendencyTotals = Record<TendencyId, number>;

/** 倾向增量（出货 / 退货时的 delta，部分键） */
export type TendencyDeltas = Partial<Record<TendencyId, number>>;

/** 结局条件中的倾向阈值（minTendency / maxTendency） */
export type TendencyCondition = Partial<Record<TendencyId, number>>;

/** 失败结局动态内容：主导倾向（≥3）对应的底标文案与建议流向（ENDING_DESIGN §2.5） */
export interface TendencyFailureInfo {
  tag: string;
  flow: string;
}

export const TENDENCY_FAILURE_INFO: Record<TendencyId | '_none', TendencyFailureInfo> = {
  cold_precision: { tag: '效率优先型操盘员，信息处理成本极低。押金耗尽原因待核实。', flow: '降档流向（效率型，本地重新评估）' },
  gambler_tendency: { tag: '高风险操作记录超出岗位容差。押金损耗与出货失误直接相关。', flow: '免责协议签署专区（加急）' },
  traffic_instinct: { tag: '流量偏好型，自身案件的流量价值待评估。', flow: '流量叙事池（操盘员转型素材）' },
  endorsement_worship: { tag: '显性标签依赖症。押金耗尽发生在无背书标签案件的处理阶段。', flow: '背书核实专区（等待显性标签更新）' },
  over_caution: { tag: '决策迟滞，出货效率不足。押金耗尽于绩效扣罚累积。', flow: '仓储区（暂存，待激活）' },
  residual_empathy: { tag: '共情阈值超出岗位容差。调查后退货频率异常。', flow: '情感评估专区（再配置流程中）' },
  _none: { tag: '操作风格未分化，综合失调，档案信息量不足。', flow: '新手培训班（如有余额）' }
};

/** 全 0 的倾向累计表 */
export function zeroTendencies(): TendencyTotals {
  const t = {} as TendencyTotals;
  for (const id of TENDENCY_IDS) t[id] = 0;
  return t;
}

/**
 * 主导倾向：取值 >2（即 ≥3）的最高分倾向 id；若无则返回 null。
 * 与 game.html getDominantTendency 行为一致（接收倾向累计表）。
 */
export function getDominantTendency(totals: TendencyTotals | null | undefined): TendencyId | null {
  if (!totals) return null;
  let best: TendencyId | null = null;
  let bestV = 2; // 必须 > 2（即 ≥3）才算主导
  for (const id of TENDENCY_IDS) {
    const v = totals[id] || 0;
    if (v > bestV) { best = id; bestV = v; }
  }
  return best;
}
