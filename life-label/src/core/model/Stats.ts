// ============================================================
//  统计（平台无关）
//  全局累计统计（stats）与单班统计（shiftStats）。
// ============================================================

/** 全局累计统计（game.html zeroStats） */
export interface Stats {
  casesSelected: number;
  casesInspected: number;
  hiddenTagsRevealed: number;
  casesShipped: number;
  casesReturned: number;
  casesAutoReturned: number;
  callbacksResolved: number;
  failedShipments: number;
  performancePenalties: number;
  depositLostTotal: number;
}

/** 单班统计（每班重置） */
export interface ShiftStats {
  shipped: number;
  returned: number;
  autoReturned: number;
}

export function zeroStats(): Stats {
  return {
    casesSelected: 0, casesInspected: 0, hiddenTagsRevealed: 0, casesShipped: 0,
    casesReturned: 0, casesAutoReturned: 0, callbacksResolved: 0, failedShipments: 0,
    performancePenalties: 0, depositLostTotal: 0
  };
}

export function zeroShiftStats(): ShiftStats {
  return { shipped: 0, returned: 0, autoReturned: 0 };
}
