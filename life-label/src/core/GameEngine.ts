// ============================================================
//  GameEngine —— 核心规则引擎（平台无关）
//
//  唯一对外接口：dispatch(command) → CommandResult（更新后状态 + 事件 + 成功/失败）。
//  内部按领域拆分为 systems。引擎与所有 systems 严禁访问 Canvas / DOM /
//  ViewState / 动画 / Toast / 鼠标 / requestAnimationFrame / 字体 / 光标。
// ============================================================
import type { GameContext } from './GameContext';
import type { PlayerState } from './model/PlayerState';
import { createPlayerState } from './model/PlayerState';
import type { GamePhase } from './model/GameEnums';
import type { ActionResult } from './model/GameReports';
import type { GameCommand } from './protocol/GameCommand';
import type { GameEvent } from './protocol/GameEvent';
import type { CommandResult } from './protocol/CommandResult';
import { applyPhase } from './StateMachine';

import { RunSystem } from './systems/RunSystem';
import { ShiftSystem } from './systems/ShiftSystem';
import { CaseActionSystem } from './systems/CaseActionSystem';
import { CallbackSystem } from './systems/CallbackSystem';
import { DepositSystem } from './systems/DepositSystem';
import { TendencySystem } from './systems/TendencySystem';
import { TimerSystem } from './systems/TimerSystem';
import { PerformanceSystem } from './systems/PerformanceSystem';
import { EndingSystem } from './systems/EndingSystem';

/** 规则方法的统一返回形态（被拒绝时 ok:false + reason；成功时可携带 ActionResult 等富对象） */
export type RuleResult = { ok?: boolean; reason?: string } | void | null;

export class GameEngine {
  readonly context: GameContext;
  /** 当前玩家状态（startRun/restartRun 时被替换为新对象） */
  state: PlayerState;

  private _events: GameEvent[] = [];

  readonly run: RunSystem;
  readonly shift: ShiftSystem;
  readonly caseAction: CaseActionSystem;
  readonly callback: CallbackSystem;
  readonly deposit: DepositSystem;
  readonly tendency: TendencySystem;
  readonly timer: TimerSystem;
  readonly performance: PerformanceSystem;
  readonly ending: EndingSystem;

  constructor(context: GameContext) {
    this.context = context;
    // 初始占位状态（实际开局由 dispatch('startRun') 创建）。
    this.state = createPlayerState(context.config);
    this.run = new RunSystem(this);
    this.shift = new ShiftSystem(this);
    this.caseAction = new CaseActionSystem(this);
    this.callback = new CallbackSystem(this);
    this.deposit = new DepositSystem(this);
    this.tendency = new TendencySystem(this);
    this.timer = new TimerSystem(this);
    this.performance = new PerformanceSystem(this);
    this.ending = new EndingSystem(this);
  }

  // ---------- 内部工具（供 systems 使用） ----------
  emit(event: GameEvent): void {
    this._events.push(event);
  }

  clone<T>(o: T): T {
    return JSON.parse(JSON.stringify(o));
  }

  /** 写入事件日志（PlayerState.eventLog，纯数据，迁移自 game.html logEvent） */
  logEvent(eventType: string, message: string, extra: any = {}): void {
    const state = this.state;
    state.eventLog.push({
      id: 'ev_' + (state.eventLog.length + 1),
      turnIndex: state.turnIndex, phase: state.phase,
      shiftId: state.currentShiftId, caseId: extra.caseId || null,
      actionId: extra.actionId || null, eventType, message,
      payload: extra.payload || {}, createdAt: new Date().toISOString()
    });
  }

  setPhase(phase: GamePhase): void {
    applyPhase(this, phase);
  }

  setActionResult(res: ActionResult): ActionResult {
    this.state.lastActionResult = res;
    this.setPhase('ACTION_RESULT');
    return res;
  }

  /** 守卫拒绝：返回统一失败结果（不直接发事件，由 dispatch 统一发 commandRejected） */
  reject(reason: string): RuleResult {
    return { ok: false, reason };
  }

  // ---------- 唯一对外接口 ----------
  dispatch(command: GameCommand): CommandResult {
    this._events = [];
    let res: RuleResult = null;
    switch (command.type) {
      case 'startRun': this.run.startRun(); break;
      case 'restartRun': this.run.restartRun(); break;
      case 'beginShiftWork': this.shift.beginShiftWork(); break;
      case 'selectCase': res = this.caseAction.select(command.caseId); break;
      case 'inspectCase': res = this.caseAction.inspect(command.caseId); break;
      case 'revealHiddenTag': res = this.caseAction.reveal(command.caseId); break;
      case 'shipCase': res = this.caseAction.ship(command.caseId, command.flowId); break;
      case 'returnCase': res = this.caseAction.return(command.caseId); break;
      case 'acknowledgeCallback': this.callback.acknowledge(); break;
      case 'endShift': res = this.shift.endShift({ forceReturn: command.forceReturn }); break;
      case 'closeActionResult': this.shift.closeActionResult(); break;
      case 'startNextShift': this.shift.startNextShift(); break;
      case 'enterFinalCallbacksOrEnding': this.shift.enterFinalCallbacksOrEnding(); break;
      case 'tick': this.timer.tick(command.dt); break;
      default: {
        const _exhaustive: never = command;
        void _exhaustive;
      }
    }

    const ok = !(res && res.ok === false);
    let rejection: { reason: string } | undefined;
    if (!ok) {
      rejection = { reason: (res && res.reason) || '操作被拒绝' };
      this.emit({ type: 'commandRejected', command, reason: rejection.reason });
    }
    return { ok, state: this.state, events: this._events.slice(), rejection };
  }
}
