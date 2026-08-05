// ============================================================
//  游戏数据加载（唯一的 JSON 入口）
//  其他模块禁止再自行 fetch JSON。
//
//  使用全局 fetch（浏览器与 Node 18+ 均可用）。加载失败时抛错，
//  由调用方（app 层 / boot 流程）负责展示错误并阻止启动。
// ============================================================
import type {
  GameData, GameConfig, Tag, Flow, CaseDef, ShiftDef, EndingDef, MascotData
} from './GameDataTypes';

/** 与 data/ 下文件名一一对应（不含扩展名） */
const FILE_KEYS = ['gameConfig', 'tags', 'flows', 'cases', 'shifts', 'endings', 'mascot'] as const;

export interface LoadOptions {
  /** 数据目录的基路径，默认 'data'（相对页面根） */
  basePath?: string;
  /** 可注入的 fetch 实现，便于测试；默认使用全局 fetch */
  fetchImpl?: typeof fetch;
}

export async function loadGameData(options: LoadOptions = {}): Promise<GameData> {
  const basePath = options.basePath ?? 'data';
  const doFetch = options.fetchImpl ?? fetch;

  const results = await Promise.all(
    FILE_KEYS.map((key) =>
      doFetch(`${basePath}/${key}.json`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} @ ${key}`);
        return r.json();
      })
    )
  );

  const [config, tags, flows, cases, shifts, endings, mascot] = results;
  return {
    config: config as GameConfig,
    tags: tags as Tag[],
    flows: flows as Flow[],
    cases: cases as CaseDef[],
    shifts: shifts as ShiftDef[],
    endings: endings as EndingDef[],
    mascot: mascot as MascotData
  };
}
