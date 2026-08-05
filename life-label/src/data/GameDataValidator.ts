// ============================================================
//  数据校验（平台无关，不依赖 Canvas / UI）
//  忠实移植自 game.html 的 validateData()（TECH_SPEC §10 / DATA_SCHEMA §0.6）。
//  返回错误信息数组；为空表示校验通过。配置错误应阻止游戏启动。
//
//  schema 词表与限时解析统一来自 ./schema（数据层权威来源），不再各自复制。
// ============================================================
import type { GameData } from './GameDataTypes';
import { indexGameData } from './GameDataIndex';
import {
  VALID_ACTION_IDS, VALID_OUTCOMES, VALID_TIMEOUT_POLICIES, VALID_CALLBACK_DELAYS,
  resolveShiftTimerConfig
} from './schema';

export function validateGameData(data: GameData): string[] {
  const errs: string[] = [];
  const E = (m: string) => errs.push(m);
  const { tagsById, casesById, flowsById, shiftsById } = indexGameData(data);
  const config = data.config;

  const uniq = (arr: Array<{ id: string }>, name: string) => {
    const s = new Set<string>();
    for (const x of arr) { if (s.has(x.id)) E(`${name} 重复 ID: ${x.id}`); s.add(x.id); }
  };
  uniq(data.tags, 'tags'); uniq(data.flows, 'flows'); uniq(data.cases, 'cases');
  uniq(data.shifts, 'shifts'); uniq(data.endings, 'endings');

  if (!shiftsById[config.firstShiftId]) E('firstShiftId 不存在: ' + config.firstShiftId);
  if (!data.endings.find((e) => e.id === config.defaultEndingId)) E('defaultEndingId 不存在: ' + config.defaultEndingId);

  for (const actionId in (config.defaultActionCosts || {})) {
    if (Object.prototype.hasOwnProperty.call(config.defaultActionCosts[actionId] || {}, 'timeSeconds'))
      E('gameConfig.defaultActionCosts.' + actionId + '.timeSeconds 已废弃，请使用真实倒计时');
  }

  for (const sh of data.shifts) {
    if (sh.nextShiftId && !shiftsById[sh.nextShiftId]) E(sh.id + '.nextShiftId 不存在: ' + sh.nextShiftId);
    for (const cid of sh.caseIds) if (!casesById[cid]) E(sh.id + '.caseIds 缺失: ' + cid);
    for (const fid of sh.availableFlowIds) if (!flowsById[fid]) E(sh.id + '.availableFlowIds 缺失: ' + fid);
    for (const aid of sh.availableActionIds) if (!(VALID_ACTION_IDS as readonly string[]).includes(aid)) E(sh.id + ' 非法操作: ' + aid);

    const timerCfg = resolveShiftTimerConfig(sh);
    if (timerCfg.enabled) {
      if (typeof timerCfg.durationSeconds !== 'number' || !Number.isFinite(timerCfg.durationSeconds) || timerCfg.durationSeconds <= 0)
        E(sh.id + '.timeRemainingSeconds 限时时长非法');
      if (!(VALID_TIMEOUT_POLICIES as readonly string[]).includes(timerCfg.timeoutPolicy))
        E(sh.id + '.timeoutPolicy 非法: ' + timerCfg.timeoutPolicy);
      for (const threshold of timerCfg.warningThresholdSeconds) {
        if (threshold >= (timerCfg.durationSeconds as number)) E(sh.id + '.warningThresholdSeconds 必须小于限时时长: ' + threshold);
      }
    }

    for (const actionId in (sh.actionCosts || {})) {
      if (Object.prototype.hasOwnProperty.call(sh.actionCosts![actionId] || {}, 'timeSeconds'))
        E(sh.id + '.actionCosts.' + actionId + '.timeSeconds 已废弃，请使用真实倒计时');
    }

    for (const cid of sh.caseIds) {
      const cs = casesById[cid]; if (!cs) continue;
      const inter = sh.availableFlowIds.filter((f) => cs.availableFlowIds.includes(f) && cs.flowResults[f]);
      if (inter.length === 0) E(sh.id + ' 中案件 ' + cid + ' 无可显示流向');
    }
  }

  for (const cs of data.cases) {
    for (const t of cs.visibleTagIds) if (!tagsById[t]) E(cs.id + '.visibleTagIds 缺失: ' + t);
    for (const h of cs.hiddenTags) if (!tagsById[h.tagId]) E(cs.id + '.hiddenTags.tagId 缺失: ' + h.tagId);
    for (const f of cs.availableFlowIds) {
      if (!flowsById[f]) E(cs.id + '.availableFlowIds 缺失: ' + f);
      if (!cs.flowResults[f]) E(cs.id + '.flowResults 未覆盖: ' + f);
    }
    for (const f in cs.flowResults) {
      const fr = cs.flowResults[f];
      if (!(VALID_OUTCOMES as readonly string[]).includes(fr.outcome)) E(cs.id + '.' + f + ' 非法 outcome');
      if (!(fr.callbackDelay === 'final' || (VALID_CALLBACK_DELAYS as readonly number[]).includes(fr.callbackDelay as number))) E(cs.id + '.' + f + ' 非法 callbackDelay');
      if (typeof fr.depositDelta !== 'number') E(cs.id + '.' + f + ' depositDelta 非数字');
    }
    if (!cs.returnResult || typeof cs.returnResult.depositDelta !== 'number') E(cs.id + '.returnResult 非法');
  }

  return errs;
}
