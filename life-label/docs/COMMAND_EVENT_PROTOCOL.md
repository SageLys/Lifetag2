# 命令 / 事件协议（COMMAND_EVENT_PROTOCOL）

引擎是唯一规则入口：`GameEngine.dispatch(command): CommandResult`。
- 命令（`src/core/protocol/GameCommand.ts`）：外部意图。
- 事件（`src/core/protocol/GameEvent.ts`）：引擎处理后产出的领域事件，供表现层订阅。
- 结果（`src/core/protocol/CommandResult.ts`）：`{ ok, state, events, rejection? }`。

不使用全局事件总线——事件随 `CommandResult.events` 返回。

## GameCommand
| 命令 | 字段 | 含义 |
|---|---|---|
| `startRun` | — | 开始新局（→ 第一班 SHIFT_START） |
| `beginShiftWork` | — | 班前页"开始处理"（→ CALLBACK_REVIEW 或 SHIFT_ACTIVE） |
| `selectCase` | `caseId` | 选择案件 |
| `inspectCase` | `caseId` | 扒底 |
| `revealHiddenTag` | `caseId` | 揭标 |
| `shipCase` | `caseId, flowId` | 出货到流向 |
| `returnCase` | `caseId` | 退货 |
| `acknowledgeCallback` | — | 确认当前回单（逐条） |
| `endShift` | `forceReturn?` | 收班（forceReturn=确认提前收班，自动退货剩余） |
| `closeActionResult` | — | 关闭即时反馈，推进相位 |
| `startNextShift` | — | 进入下一班 |
| `enterFinalCallbacksOrEnding` | — | 第 7 班后进入终审/结局 |
| `tick` | `dt` | 更新时间（限时倒计时，单位秒） |
| `restartRun` | — | 重新开始 |

## GameEvent
| 事件 | 关键字段 | 触发 | 表现层反应（示例） |
|---|---|---|---|
| `runStarted` | runId | startRun | 重置标宝/押金气泡标志 |
| `shiftEntered` | shiftId, shiftOrder, timed | enterShift | buildScene + 待显示标宝 |
| `shiftStarted` | shiftId | beginShiftWork | — |
| `caseSelected` | caseId | selectCase | 卡片滑入工作台 |
| `caseInspected` | caseId, backgroundText | inspectCase | 翻到底细面 |
| `hiddenTagRevealed` | caseId, hiddenTagId, tagId, revealText | revealHiddenTag | 翻正面 + 揭标弹出 |
| `caseShipped` | caseId, flowId, outcome, immediateText | shipCase | 盖章动画 |
| `caseReturned` | caseId, auto, immediateText? | returnCase / 自动退货 | 退货动画（auto=true 不单卡动画） |
| `callbackReady` | callbackId, caseId | 进班到期检查 | — |
| `callbackResolved` | callbackId, caseId, outcome, depositDelta | acknowledgeCallback | — |
| `depositChanged` | delta, current, reason | 押金变化 | delta<0 押金动画；current==2 提示气泡 |
| **`tendencyChanged`** | deltas, totals, reason | 出货/退货累计倾向 | （必产生）渲染读 totals |
| `timerWarning` | thresholdSeconds, remainingSeconds | 限时阈值 | — |
| `timerExpired` | shiftId | 限时归零 | 重置拖拽/卡片 + Toast |
| `shiftEnded` | shiftId, forcedByTimeout | endShift | — |
| `performancePenaltyApplied` | ruleText, depositDelta | 绩效扣罚 | — |
| `endingBuilt` | endingId | buildEnding | — |
| `runFailed` | reason | 押金归零 | — |
| `commandRejected` | command, reason | 非法操作 | Toast 显示 reason |
| `resourceChanged` | actionId, deltas | 扒底/揭标消耗 | （可选） |

约束：事件只含领域语义与必要数据，**不含** Canvas 坐标、动画进度、颜色、DOM。

## CommandResult
```ts
interface CommandResult {
  ok: boolean;                  // false = 非法操作被拒绝
  state: PlayerState;           // 处理后的状态（startRun/restartRun 为新对象）
  events: GameEvent[];          // 本次命令产生的事件，按发生顺序
  rejection?: { reason: string };
}
```

## 示例
```ts
const engine = new GameEngine(createGameContext(data));
engine.dispatch({ type: 'startRun' });
engine.dispatch({ type: 'beginShiftWork' });
engine.dispatch({ type: 'selectCase', caseId: 'case_a01_fresh_elite' });
const res = engine.dispatch({ type: 'shipCase', caseId: 'case_a01_fresh_elite', flowId: 'flow_startup' });
// res.ok === true
// res.events 含 { type:'tendencyChanged', deltas:{cold_precision:1}, totals:{...} } 与 { type:'caseShipped', ... }
```
