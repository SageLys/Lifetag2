// 数据层测试：使用真实的 indexGameData / validateGameData（与游戏运行同一代码路径）。
// 验证当前 data/ 内容有效，且坏配置能被校验器捕获（用于阻止启动）。
import { describe, it, expect } from 'vitest';

import gameConfig from '../data/gameConfig.json';
import tags from '../data/tags.json';
import flows from '../data/flows.json';
import cases from '../data/cases.json';
import shifts from '../data/shifts.json';
import endings from '../data/endings.json';
import mascot from '../data/mascot.json';

import { indexGameData } from '../src/data/GameDataIndex';
import { validateGameData } from '../src/data/GameDataValidator';
import type { GameData } from '../src/data/GameDataTypes';

const data = {
  config: gameConfig, tags, flows, cases, shifts, endings, mascot
} as unknown as GameData;

describe('GameDataValidator', () => {
  it('当前 data/ 内容校验通过（无错误）', () => {
    const errs = validateGameData(data);
    expect(errs).toEqual([]);
  });

  it('firstShiftId 不存在时报错（可阻止启动）', () => {
    const broken = { ...data, config: { ...data.config, firstShiftId: 'no_such_shift' } } as GameData;
    const errs = validateGameData(broken);
    expect(errs.some((e) => e.includes('firstShiftId 不存在'))).toBe(true);
  });

  it('案件引用缺失流向时报错', () => {
    const badCase = { ...data.cases[0], availableFlowIds: [...data.cases[0].availableFlowIds, 'flow_does_not_exist'] };
    const broken = { ...data, cases: [badCase, ...data.cases.slice(1)] } as GameData;
    const errs = validateGameData(broken);
    expect(errs.some((e) => e.includes('flow_does_not_exist'))).toBe(true);
  });
});

describe('GameDataIndex', () => {
  it('按 ID 建立四张索引表', () => {
    const idx = indexGameData(data);
    expect(idx.shiftsById[gameConfig.firstShiftId]).toBeTruthy();
    expect(Object.keys(idx.tagsById).length).toBe(tags.length);
    expect(Object.keys(idx.casesById).length).toBe(cases.length);
    expect(Object.keys(idx.flowsById).length).toBe(flows.length);
    expect(Object.keys(idx.shiftsById).length).toBe(shifts.length);
  });
});
