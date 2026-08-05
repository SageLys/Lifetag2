// ============================================================
//  GameController —— 连接核心引擎、表现层、输入层。
//  唯一改 PlayerState 的途径是 engine.dispatch；本控制器把输入动作翻译成命令，
//  并把引擎事件交给 PresentationController。还提供只读规则查询供渲染使用。
// ============================================================
import type { GameEngine } from '../core/GameEngine';
import type { PlayerState } from '../core/model/PlayerState';
import type { GameCommand } from '../core/protocol/GameCommand';
import type { CommandResult } from '../core/protocol/CommandResult';
import type { ViewState } from '../presentation/ViewState';
import type { PresentationController } from '../presentation/PresentationController';
import type { RenderData, EngineQueries } from '../presentation/canvas/RenderContext';
import type { HitAction } from '../presentation/canvas/CanvasLayout';
import type { InputController } from '../input/PointerInput';

const TITLE_STATE = { phase: 'TITLE' } as unknown as PlayerState;

export class GameController implements InputController {
  /** 当前用于渲染/查询的状态（开局前为标题占位） */
  private state: PlayerState = TITLE_STATE;
  readonly queries: EngineQueries;

  constructor(
    private engine: GameEngine,
    private view: ViewState,
    private presentation: PresentationController,
    private data: RenderData
  ) {
    this.queries = {
      canInspect: (id) => this.engine.caseAction.canInspect(this.engine.state, id),
      canReveal: (id) => this.engine.caseAction.canReveal(this.engine.state, id),
      canReturn: (id) => this.engine.caseAction.canReturn(this.engine.state, id),
      canEndShift: () => this.engine.shift.canEndShift(this.engine.state)
    };
  }

  getState(): PlayerState { return this.state; }

  /** 唯一的命令入口：派发 → 更新状态引用 → 事件交给表现层 */
  submit(cmd: GameCommand): CommandResult {
    const res = this.engine.dispatch(cmd);
    this.state = res.state;
    this.presentation.handleEvents(res.events, this.state);
    return res;
  }

  /** 每帧时间推进（仅开局后）。标题阶段不派发，避免覆盖标题占位状态 */
  tick(dt: number): void {
    if (this.state.phase === 'TITLE') return;
    this.submit({ type: 'tick', dt });
  }

  /** 每帧表现更新（延迟触发的标宝/押金气泡） */
  update(): void {
    if (this.state.phase === 'TITLE') return;
    this.presentation.update(this.state);
  }

  // 卡片操作标签：扒底（已扒底则本地翻面）/ 揭标 / 退货
  handleTab(key: string): void {
    const card = this.view.activeCard;
    if (!card) return;
    const caseId = card.caseId;
    const rc = this.state.runtimeCases[caseId];
    if (key === 'inspect') {
      if (rc.backgroundRevealed) card.flipTarget = card.flipTarget > 0.5 ? 0 : 1;
      else this.submit({ type: 'inspectCase', caseId });
    } else if (key === 'reveal') {
      this.submit({ type: 'revealHiddenTag', caseId });
    } else if (key === 'return') {
      this.submit({ type: 'returnCase', caseId });
    }
  }

  // HitMap 命中动作 → 命令 / 视图操作
  handleAction(action: HitAction): void {
    switch (action.kind) {
      case 'command': this.submit(action.command); break;
      case 'closeActionResult': this.submit({ type: 'closeActionResult' }); break;
      case 'endShift':
        if (this.state.activeCaseIds.length > 0) this.view.confirmEndShift = true;
        else this.submit({ type: 'endShift' });
        break;
      case 'confirmEndShift':
        this.view.confirmEndShift = false; this.submit({ type: 'endShift', forceReturn: true });
        break;
      case 'cancelEndShift':
        this.view.confirmEndShift = false;
        break;
      case 'dismissBubble':
        this.view.mascotBubble = null;
        break;
      case 'summaryNext': {
        const shift = this.data.shiftsById[this.state.currentShiftId as string];
        if (shift.nextShiftId) this.submit({ type: 'startNextShift' });
        else this.submit({ type: 'enterFinalCallbacksOrEnding' });
        break;
      }
      case 'block':
        break;
    }
  }
}
