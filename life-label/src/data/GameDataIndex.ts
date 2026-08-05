// ============================================================
//  按 ID 建立数据索引（平台无关，纯函数）
//  其他模块统一使用本函数，禁止各自重复建索引。
// ============================================================
import type { GameData, GameDataIndex } from './GameDataTypes';

function byId<T extends { id: string }>(arr: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of arr) map[item.id] = item;
  return map;
}

export function indexGameData(data: GameData): GameDataIndex {
  return {
    tagsById: byId(data.tags),
    casesById: byId(data.cases),
    flowsById: byId(data.flows),
    shiftsById: byId(data.shifts)
  };
}
