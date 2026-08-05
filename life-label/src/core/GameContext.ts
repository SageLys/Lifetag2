// ============================================================
//  GameContext —— 引擎运行所需的静态数据上下文（平台无关）
//  封装配置、按 ID 索引、结局表。规则层只读这些数据，不再 fetch / 建索引。
// ============================================================
import type { GameData, GameDataIndex, GameConfig, EndingDef } from '../data/GameDataTypes';
import { indexGameData } from '../data/GameDataIndex';

export interface GameContext {
  readonly config: GameConfig;
  readonly index: GameDataIndex;
  readonly endings: EndingDef[];
}

export function createGameContext(data: GameData, index?: GameDataIndex): GameContext {
  return {
    config: data.config,
    index: index ?? indexGameData(data),
    endings: data.endings
  };
}
