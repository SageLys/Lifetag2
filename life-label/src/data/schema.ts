// ============================================================
//  数据 schema 词表与派生（平台无关，数据层权威来源）
//  这些是"合法 JSON 的词汇"。data 校验器与 core 共用同一份，避免重复定义。
//  依赖方向：data 不依赖 core；core 可从此导入（core → data）。
// ============================================================
import type { ShiftDef } from './GameDataTypes';

/** 合法操作 id（availableActionIds 取值域；core 的 ActionId 类型据此而来） */
export const VALID_ACTION_IDS = [
  'selectCase', 'inspectCase', 'revealHiddenTag', 'shipCase',
  'returnCase', 'buyTagForCase', 'sellTagFromCase', 'endShift'
] as const;

/** 合法出货结果 */
export const VALID_OUTCOMES = ['success', 'failure', 'mixed', 'neutral'] as const;

/** 合法回单延迟（数字部分；另允许 'final'） */
export const VALID_CALLBACK_DELAYS = [0, 1, 2] as const;

/** 合法超时策略 */
export const VALID_TIMEOUT_POLICIES = ['auto_return', 'block_end', 'ignore', 'force_end'] as const;

/** 班次限时配置（从 ShiftDef 解析的派生结果） */
export interface ShiftTimerConfig {
  enabled: boolean;
  durationSeconds: number | null;
  timeoutPolicy: string;
  warningThresholdSeconds: number[];
}

/**
 * 从班次数据解析限时配置（唯一权威实现）。
 * 限时来源优先级：timeLimit/timer.durationSeconds → .timeRemainingSeconds → resources.timeRemainingSeconds。
 * 超时策略缺省取 rules.unprocessedCasePolicy，再缺省 'auto_return'。
 */
export function resolveShiftTimerConfig(shift: ShiftDef): ShiftTimerConfig {
  const raw: any = shift.timeLimit || shift.timer || {};
  const resourceSeconds = shift.resources ? shift.resources.timeRemainingSeconds : null;
  const duration =
    raw.durationSeconds != null ? raw.durationSeconds
      : raw.timeRemainingSeconds != null ? raw.timeRemainingSeconds
        : resourceSeconds;
  const warningRaw = raw.warningThresholdSeconds || raw.warningThresholdsSeconds || raw.warningThresholds || [];
  const warnings = Array.isArray(warningRaw) ? warningRaw : (warningRaw == null ? [] : [warningRaw]);
  return {
    enabled: duration != null,
    durationSeconds: duration,
    timeoutPolicy: raw.timeoutPolicy || raw.timeoutHandling || shift.rules.unprocessedCasePolicy || 'auto_return',
    warningThresholdSeconds: warnings
      .filter((v: unknown) => typeof v === 'number' && (v as number) > 0)
      .sort((a: number, b: number) => b - a)
  };
}
