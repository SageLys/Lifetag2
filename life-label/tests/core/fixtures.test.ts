// 跨平台场景回放：加载 tests/fixtures/*.json，按命令序列回放，断言终态。
// 这些 fixture 是纯数据（命令 + 期望），未来 Unity C# 端可读取同一份做一致性校验。
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeEngine, snapshot } from './helpers';
import type { GameCommand } from '../../src/core/protocol/GameCommand';

const FIX_DIR = join(import.meta.dirname, '..', 'fixtures');
const files = readdirSync(FIX_DIR).filter((f) => f.endsWith('.json'));

interface Fixture { name: string; description: string; commands: GameCommand[]; expect: Record<string, unknown> }

describe('fixtures 回放一致性', () => {
  it('存在 8 个跨平台场景', () => {
    expect(files.length).toBe(8);
  });

  it.each(files)('%s', (file) => {
    const fx = JSON.parse(readFileSync(join(FIX_DIR, file), 'utf8')) as Fixture;
    const e = makeEngine();
    for (const cmd of fx.commands) e.dispatch(cmd);
    expect(snapshot(e.state)).toEqual(fx.expect);
  });
});
