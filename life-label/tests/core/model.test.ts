// 核心状态模型：PlayerState 可序列化且不含浏览器对象；工厂与计时器解析。
import { describe, it, expect } from 'vitest';
import gameConfig from '../../data/gameConfig.json';
import shifts from '../../data/shifts.json';
import { createPlayerState, createShiftTimer, resolveShiftTimerConfig } from '../../src/core/model/PlayerState';
import { createRuntimeCase } from '../../src/core/model/RuntimeCaseState';
import { TENDENCY_IDS, zeroTendencies } from '../../src/core/model/TendencyState';
import { zeroStats } from '../../src/core/model/Stats';
import type { GameConfig, ShiftDef } from '../../src/data/GameDataTypes';

const config = gameConfig as unknown as GameConfig;
const shiftDefs = shifts as unknown as ShiftDef[];

function assertNoBrowserObjects(value: unknown, path = '$'): void {
  if (value === null) return;
  const t = typeof value;
  if (t === 'function') throw new Error(`发现函数: ${path}`);
  if (t === 'object') {
    const ctor = (value as object).constructor?.name;
    if (ctor && !['Object', 'Array'].includes(ctor)) throw new Error(`发现非纯对象 (${ctor}): ${path}`);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) assertNoBrowserObjects(v, `${path}.${k}`);
  }
}

describe('PlayerState 序列化', () => {
  it('createPlayerState 可 JSON 往返且无浏览器对象', () => {
    const s = createPlayerState(config);
    assertNoBrowserObjects(s);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('初始字段符合基线', () => {
    const s = createPlayerState(config);
    expect(s.phase).toBe('RUN_INIT');
    expect(s.runStatus).toBe('active');
    expect(s.depositTags).toEqual({ current: config.initialDepositTags, max: config.maxDepositTags });
    expect(s.tendencies).toEqual(zeroTendencies());
    expect(s.stats).toEqual(zeroStats());
    expect(s.shiftTimer.enabled).toBe(false);
  });
});

describe('工厂', () => {
  it('createRuntimeCase 初始 UNTOUCHED', () => {
    const rc = createRuntimeCase('c');
    expect(rc).toMatchObject({ caseId: 'c', status: 'UNTOUCHED', backgroundRevealed: false, revealedHiddenTagIds: [] });
  });
  it('zeroTendencies 含全部 6 个 id 且为 0', () => {
    const t = zeroTendencies();
    expect(Object.keys(t).sort()).toEqual([...TENDENCY_IDS].sort());
    for (const id of TENDENCY_IDS) expect(t[id]).toBe(0);
  });
});

describe('计时器解析（resolveShiftTimerConfig / createShiftTimer）', () => {
  it('无限时班次未启用', () => {
    const s1 = shiftDefs.find((s) => s.order === 1)!;
    expect(resolveShiftTimerConfig(s1).enabled).toBe(false);
    expect(createShiftTimer(s1).remainingSeconds).toBeNull();
  });
  it('限时班次：从 resources.timeRemainingSeconds 解析，默认超时策略取 unprocessedCasePolicy', () => {
    const s3 = shiftDefs.find((s) => s.order === 3)!;
    const cfg = resolveShiftTimerConfig(s3);
    expect(cfg.enabled).toBe(true);
    expect(cfg.durationSeconds).toBe(s3.resources.timeRemainingSeconds);
    expect(cfg.timeoutPolicy).toBe(s3.rules.unprocessedCasePolicy);
    const timer = createShiftTimer(s3);
    expect(timer.remainingSeconds).toBe(s3.resources.timeRemainingSeconds);
    expect(timer.warnedThresholdSeconds).toEqual([]);
  });
});
