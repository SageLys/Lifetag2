// ============================================================
//  RenderContext —— 每帧传给绘制函数的只读渲染上下文。
//  绘制函数仅通过 Rc 读取状态/数据，不得修改 PlayerState / 规则。
// ============================================================
import type { PlayerState } from '../../core/model/PlayerState';
import type { ViewState } from '../ViewState';
import type { GameData, GameDataIndex, MascotData, GameConfig } from '../../data/GameDataTypes';

/** 渲染所需的静态数据（按 id 索引 + 标宝 + 配置） */
export interface RenderData {
  casesById: GameDataIndex['casesById'];
  flowsById: GameDataIndex['flowsById'];
  tagsById: GameDataIndex['tagsById'];
  shiftsById: GameDataIndex['shiftsById'];
  mascot: MascotData;
  config: GameConfig;
}

export function createRenderData(data: GameData, index: GameDataIndex): RenderData {
  return {
    casesById: index.casesById,
    flowsById: index.flowsById,
    tagsById: index.tagsById,
    shiftsById: index.shiftsById,
    mascot: data.mascot,
    config: data.config
  };
}

/** 只读规则查询（由 app 层基于引擎守卫提供，渲染据此决定可点态，不改状态） */
export interface EngineQueries {
  canInspect(caseId: string): boolean;
  canReveal(caseId: string): boolean;
  canReturn(caseId: string): boolean;
  canEndShift(): boolean;
}

export interface Rc {
  ctx: CanvasRenderingContext2D;
  state: PlayerState;
  view: ViewState;
  data: RenderData;
  q: EngineQueries;
}
