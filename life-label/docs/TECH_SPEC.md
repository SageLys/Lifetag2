# 《人生标签交易所：试用期》技术规格文档

版本：v0.3 / HTML MVP 修订版  
适用对象：编程 Agent、策划、测试  
文档性质：机制规则说明，不是概念描述  
对应数据协议：`DATA_SCHEMA.md`

---

## 0. MVP 范围声明

### 0.1 MVP 必须实现

MVP 只验证以下核心闭环：

```text
手工案件判断 → 扒底 / 揭标 → 出货 / 退货 → 延迟买家回单 → 押金标签压力 → 结局展示
```

必须实现：

1. 开始新局。
2. 按固定班次推进。
3. 每班加载固定案件。
4. 玩家查看案件。
5. 玩家对案件执行基础操作：
   - 选择案件；
   - 扒底；
   - 揭标；
   - 出货；
   - 退货；
   - 收班。
6. 出货后案件进入“跟单中”。
7. 后续班次或结局前显示买家回单。
8. 出货失误在买家回单结算时扣除押金标签。
9. 押金标签归零立即进入失败流程。
10. 全部班次结束后，先处理 `final` 回单，再根据剩余押金标签、班次完成情况和失败状态生成结局。
11. 操作事件写入内存事件日志，用于 Debug 与最终报告。

### 0.2 MVP 明确不做

MVP 不实现以下内容：

1. **不做存档。**
   - 不使用 `localStorage` 保存正式进度。
   - 不使用后端存储。
   - 页面刷新后当前局丢失。
   - Debug 可以允许“复制当前 `PlayerState` JSON”，但这不属于正式存档。
2. 不做随机生成案件。
3. 不做肉鸽卡牌构筑。
4. 不做现金、售价、利润系统。
5. 不做复杂经营数值。
6. 不做员工、装修、Meta 成长。
7. 不做移动端专门适配。
8. 不做独立剧情分支系统。
9. 不做自动文本生成。
10. 不做真实计时强制失败；限时字段可预留，但 MVP 默认关闭。

### 0.3 MVP 可预留但默认关闭

以下机制可在数据结构中预留，但 MVP 默认不开放给玩家：

1. 进货。
2. 甩货。
3. 今日行情影响。
4. 标签套包。
5. 班次限时。
6. 复杂操作违规。

如果配置中没有显式开启这些机制，UI 不显示对应入口，规则层也不得调用对应操作。

---

## 1. 核心定义

### 1.1 运行单位

一局游戏称为 `Run`。

一局包含多个固定班次，班次由 `Shift` 配置。

每个班次包含若干固定案件，案件由 `Case` 配置。

玩家在班次中处理案件。案件处理结果不由系统动态推理生成，而由 `Case.flowResults` 或 `Case.returnResult` 手工预设。

### 1.2 玩家目标

玩家目标是在全部班次结束前保住至少 1 枚押金标签。

初始押金标签由 `gameConfig.json` 决定：

```text
PlayerState.depositTags.current = GameConfig.initialDepositTags
PlayerState.depositTags.max = GameConfig.maxDepositTags
```

MVP 默认值：

```text
PlayerState.depositTags.current = 5
PlayerState.depositTags.max = 5
```

押金标签归零条件：

```text
PlayerState.depositTags.current <= 0
```

押金标签归零后立即进入失败流程：

```text
PlayerState.phase = RUN_FAILED
```

### 1.3 案件处理结果的唯一判定来源

MVP 采用“手工预设案例判定”。

出货是否成功、是否失误、扣不扣押金，均由以下配置决定：

```text
Case.flowResults[flowId]
```

退货结果由以下配置决定：

```text
Case.returnResult
```

程序不得根据标签偏好动态生成胜负。标签、底标和底细只是玩家推理依据，不是程序自动判定依据。

### 1.4 出货失误的判定条件

出货失误只由 `FlowResult.outcome` 判定。

```text
FlowResult.outcome == "failure" => 本次出货失误
```

推荐配置约束：

```text
outcome == "failure" 时，FlowResult.depositDelta 通常应小于 0，MVP 默认为 -1。
outcome == "success" 时，FlowResult.depositDelta 通常应为 0。
outcome == "mixed" 时，FlowResult.depositDelta 可为 0 或负数，由案件配置决定。
outcome == "neutral" 时，FlowResult.depositDelta 通常应为 0。
```

押金是否实际扣除不由程序重新判断，而由 `FlowResult.depositDelta` 决定。也就是说：

```text
出货失误 = outcome == "failure"
押金变化 = FlowResult.depositDelta
```

MVP 写作与配置规则应保持二者一致，不应配置“failure 但 depositDelta = 0”的常规案件，除非明确作为特殊规则并在测试用例中说明。

---

## 2. 状态机总览

### 2.1 AppState 与 PlayerState 的边界

`APP_BOOT` 是应用初始化阶段。此时静态数据可能尚未加载，完整 `PlayerState` 可以不存在。

从 `RUN_INIT` 开始，必须创建完整 `PlayerState`。

实现时可以有一个外层 `AppState` 管理加载状态，但游戏规则层只依赖 `PlayerState.phase`。

### 2.2 GamePhase 枚举

`PlayerState.phase` 只能取以下值：

```text
APP_BOOT
TITLE
RUN_INIT
SHIFT_START
CALLBACK_REVIEW
SHIFT_ACTIVE
ACTION_RESULT
SHIFT_SUMMARY
FINAL_CALLBACK_REVIEW
ENDING_BUILD
ENDING_DISPLAY
RUN_FAILED
```

### 2.3 状态含义

| 状态 | 含义 | 可显示内容 | 可执行操作 |
|---|---|---|---|
| `APP_BOOT` | 应用初始化中 | 加载提示 | 无 |
| `TITLE` | 标题页 | 标题、开始按钮 | `startRun` |
| `RUN_INIT` | 新局初始化 | 可短暂显示加载中 | 系统自动初始化 |
| `SHIFT_START` | 班次开始说明 | 班前提示、目标、可用操作、资源、到期回单数量提示 | `beginShiftWork` |
| `CALLBACK_REVIEW` | 班次开始回单查看阶段 | 到期买家回单、押金扣除、长期回响 | `acknowledgeCallback` / `finishCallbackReview` |
| `SHIFT_ACTIVE` | 班次进行中 | 案件架、档案台、操作按钮、资源 | `selectCase` / `inspectCase` / `revealHiddenTag` / `shipCase` / `returnCase` / `endShift` |
| `ACTION_RESULT` | 操作结果展示 | 即时反馈、状态变化、资源变化 | `closeActionResult` |
| `SHIFT_SUMMARY` | 班后结算 | 班次绩效、剩余押金、未处理案件处理结果 | `startNextShift` / `enterFinalCallbacksOrEnding` |
| `FINAL_CALLBACK_REVIEW` | 结局前回单查看阶段 | `callbackDelay = "final"` 的买家回单与长期回响 | `acknowledgeCallback` / `finishFinalCallbackReview` |
| `ENDING_BUILD` | 结局计算中 | 可短暂显示系统归档中 | 系统自动计算 |
| `ENDING_DISPLAY` | 结局展示 | 最终报告、剩余押金、班次记录 | `restartRun` |
| `RUN_FAILED` | 失败展示 | 押金归零、玩家转为案件 | `restartRun` |

### 2.4 主状态转移

```text
APP_BOOT
  -> TITLE

TITLE
  -- startRun --> RUN_INIT

RUN_INIT
  -- init complete / enterShift(firstShiftId) --> SHIFT_START

SHIFT_START
  -- beginShiftWork and has due callbacks --> CALLBACK_REVIEW
  -- beginShiftWork and no due callbacks --> SHIFT_ACTIVE

CALLBACK_REVIEW
  -- acknowledgeCallback, still has due callbacks --> CALLBACK_REVIEW
  -- finishCallbackReview and depositTags.current > 0 --> SHIFT_ACTIVE
  -- any callback causes depositTags.current <= 0 --> RUN_FAILED

SHIFT_ACTIVE
  -- selectCase --> SHIFT_ACTIVE
  -- inspectCase --> ACTION_RESULT
  -- revealHiddenTag --> ACTION_RESULT
  -- shipCase --> ACTION_RESULT
  -- returnCase --> ACTION_RESULT
  -- endShift --> SHIFT_SUMMARY

ACTION_RESULT
  -- closeActionResult and depositTags.current > 0 --> SHIFT_ACTIVE
  -- closeActionResult and depositTags.current <= 0 --> RUN_FAILED

SHIFT_SUMMARY
  -- startNextShift / has next shift --> SHIFT_START
  -- no next shift and has final callbacks --> FINAL_CALLBACK_REVIEW
  -- no next shift and no final callbacks --> ENDING_BUILD

FINAL_CALLBACK_REVIEW
  -- acknowledgeCallback, still has final callbacks --> FINAL_CALLBACK_REVIEW
  -- finishFinalCallbackReview and depositTags.current > 0 --> ENDING_BUILD
  -- any callback causes depositTags.current <= 0 --> RUN_FAILED

ENDING_BUILD
  -- buildEnding complete --> ENDING_DISPLAY

ENDING_DISPLAY
  -- restartRun --> RUN_INIT

RUN_FAILED
  -- restartRun --> RUN_INIT
```

### 2.5 `enterShift` 与 `beginShiftWork` 的职责边界

`enterShift(shiftId)` 是系统动作，不是玩家按钮。它负责：

1. 设置 `PlayerState.currentShiftId`。
2. 设置 `PlayerState.currentShiftOrder`。
3. 根据 `Shift.resources` 重置本班资源。
4. 根据 `Shift.caseIds` 加载本班待处理案件。
5. 清空 `selectedCaseId`。
6. 计算本班到期回单，写入 `PlayerState.readyCallbackIds`。
7. 将 `PlayerState.phase` 设为 `SHIFT_START`。

`beginShiftWork()` 是玩家在班前说明页点击“开始处理”触发的动作。它负责：

1. 如果 `readyCallbackIds.length > 0`，进入 `CALLBACK_REVIEW`。
2. 否则进入 `SHIFT_ACTIVE`。

禁止在 `startNextShift` 里跳过 `SHIFT_START`。

---

## 3. 运行时案件生命周期

### 3.1 CaseRuntimeStatus 枚举

案件运行时状态只能取以下值：

```text
UNTOUCHED
INSPECTED
PARTIALLY_REVEALED
FULLY_REVEALED
SHIPPED_PENDING_CALLBACK
CALLBACK_READY
CALLBACK_RESOLVED
RETURNED
LOCKED
```

注意：`SELECTED` 不属于案件生命周期状态。当前选中案件只由：

```text
PlayerState.selectedCaseId
```

表示。

### 3.2 状态含义

| 状态 | 含义 |
|---|---|
| `UNTOUCHED` | 案件在待处理区，尚未扒底或揭标 |
| `INSPECTED` | 已扒底，底细已显示 |
| `PARTIALLY_REVEALED` | 已揭露部分底标 |
| `FULLY_REVEALED` | 所有底标已揭露 |
| `SHIPPED_PENDING_CALLBACK` | 已出货，正在跟单中 |
| `CALLBACK_READY` | 买家回单已到期，等待玩家确认 |
| `CALLBACK_RESOLVED` | 买家回单已确认，案件完成 |
| `RETURNED` | 案件已退货 |
| `LOCKED` | 特殊锁定状态，MVP 默认不用 |

### 3.3 案件生命周期转移

```text
UNTOUCHED
  -- inspectCase --> INSPECTED
  -- revealHiddenTag --> PARTIALLY_REVEALED / FULLY_REVEALED
  -- shipCase --> SHIPPED_PENDING_CALLBACK
  -- returnCase --> RETURNED

INSPECTED
  -- revealHiddenTag --> PARTIALLY_REVEALED / FULLY_REVEALED
  -- shipCase --> SHIPPED_PENDING_CALLBACK
  -- returnCase --> RETURNED

PARTIALLY_REVEALED
  -- inspectCase --> PARTIALLY_REVEALED
  -- revealHiddenTag --> PARTIALLY_REVEALED / FULLY_REVEALED
  -- shipCase --> SHIPPED_PENDING_CALLBACK
  -- returnCase --> RETURNED

FULLY_REVEALED
  -- inspectCase --> FULLY_REVEALED
  -- shipCase --> SHIPPED_PENDING_CALLBACK
  -- returnCase --> RETURNED

SHIPPED_PENDING_CALLBACK
  -- callback becomes due --> CALLBACK_READY

CALLBACK_READY
  -- acknowledgeCallback --> CALLBACK_RESOLVED
```

`RETURNED`、`CALLBACK_RESOLVED` 和 `LOCKED` 是终态，MVP 下不可继续操作。

---

## 4. 通用规则

### 4.1 操作合法性检查顺序

所有玩家操作必须按以下顺序检查：

1. 当前 `PlayerState.phase` 是否允许该操作。
2. 是否存在目标案件。
3. 目标案件是否处于允许操作的状态。
4. 本班是否开放该操作。
5. 资源是否足够。
6. 配置是否完整。
7. 执行状态修改。
8. 写入事件日志。
9. 返回 `ActionResult`。
10. 进入 `ACTION_RESULT` 或保持当前阶段。

任一检查失败时：

```text
不得修改 PlayerState。
返回 ok = false 的 ActionResult。
UI 显示错误提示。
```

### 4.2 资源消耗规则

所有操作消耗由 `Shift.actionCosts` 覆盖，若班次未配置，则使用 `gameConfig.defaultActionCosts`。

MVP 默认成本：

```text
扒底 inspectCase：investigationPoints -1
揭标 revealHiddenTag：investigationPoints -1
出货 shipCase：0
退货 returnCase：0
收班 endShift：0
```

如果操作成本中某项为负数，表示消耗资源。

例如：

```json
{ "investigationPoints": -1 }
```

执行前必须检查：

```text
currentResource + delta >= 0
```

否则操作失败，不修改状态。

### 4.3 押金标签变化规则

押金标签只通过 `depositDelta` 或明确规则修改。

允许修改押金标签的来源：

1. 买家回单结算：`FlowResult.depositDelta`。
2. 手动退货：`ReturnResult.depositDelta`，MVP 通常为 0。
3. 自动退货：`ReturnResult.depositDelta`，MVP 通常为 0。
4. 班次绩效扣罚：`PerformanceRule.depositDelta`。
5. 特殊违规：MVP 默认不实现。

统一函数：

```text
applyDepositDelta(delta, reason)
```

规则：

```text
PlayerState.depositTags.current += delta
PlayerState.depositTags.current = min(PlayerState.depositTags.current, PlayerState.depositTags.max)
```

如果修改后：

```text
PlayerState.depositTags.current <= 0
```

立即进入：

```text
PlayerState.phase = RUN_FAILED
```

押金标签归零后，不再执行后续同批次回单、班次结算或结局生成。

### 4.4 事件日志规则

MVP 需要内存事件日志，用于 Debug、复盘和最终报告。

事件日志不用于存档。

每条事件至少包含：

```text
id
turnIndex
phase
shiftId
caseId?
actionId?
eventType
message
payload
createdAt
```

事件日志可记录以下事件：

```text
run_started
shift_entered
shift_started
case_selected
case_inspected
case_hidden_tag_revealed
case_shipped
case_returned
case_auto_returned
callback_ready
callback_resolved
deposit_changed
performance_penalty_applied
shift_ended
final_callbacks_entered
ending_built
run_failed
```

---

## 5. 操作规则

### 5.1 `startRun`

#### 允许阶段

```text
TITLE
ENDING_DISPLAY
RUN_FAILED
```

#### 执行规则

1. 创建新的 `PlayerState`。
2. 设置 `phase = RUN_INIT`。
3. 设置押金标签：

```text
depositTags.current = gameConfig.initialDepositTags
depositTags.max = gameConfig.maxDepositTags
```

4. 初始化空的运行时案件表 `runtimeCases = {}`。
5. 初始化空的回单队列 `pendingCallbacks = []`。
6. 初始化空的事件日志 `eventLog = []`。
7. 设置 `runStatus = "active"`。
8. 调用 `enterShift(gameConfig.firstShiftId)`。
9. 进入 `SHIFT_START`。

#### 禁止事项

1. 不从本地存储读取旧进度。
2. 不恢复上一次局面。
3. 不随机生成案件。

---

### 5.2 `selectCase(caseId)`

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

1. `caseId` 存在于当前班次的 `activeCaseIds`。
2. 案件运行时状态不是终态：
   - 不得为 `RETURNED`；
   - 不得为 `SHIPPED_PENDING_CALLBACK`；
   - 不得为 `CALLBACK_READY`；
   - 不得为 `CALLBACK_RESOLVED`；
   - 不得为 `LOCKED`。

#### 执行规则

```text
PlayerState.selectedCaseId = caseId
```

写入事件：

```text
case_selected
```

#### 状态变化

`selectCase` 不改变案件生命周期状态。

---

### 5.3 `inspectCase(caseId)` / 扒底

#### 作用

扒底用于查看案件背面的人生轨迹叙述，即 `Case.backgroundText`。

扒底提供软信息，不直接改变出货结果。

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

1. 当前班次开放 `inspectCase`。
2. `caseId` 存在。
3. 案件属于当前班次待处理案件。
4. 案件状态为以下之一：

```text
UNTOUCHED
PARTIALLY_REVEALED
FULLY_REVEALED
```

5. 案件尚未扒底：

```text
runtimeCase.backgroundRevealed == false
```

6. 调查资源足够。

#### 消耗

默认消耗：

```text
PlayerState.resources.investigationPoints -= 1
```

实际消耗以本班配置为准：

```text
Shift.actionCosts.inspectCase
```

如果班次未配置，则使用：

```text
GameConfig.defaultActionCosts.inspectCase
```

#### 执行规则

1. 扣除操作消耗。
2. 设置：

```text
runtimeCase.backgroundRevealed = true
```

3. 更新案件状态：

```text
如果当前状态为 UNTOUCHED，则改为 INSPECTED。
如果当前状态为 PARTIALLY_REVEALED 或 FULLY_REVEALED，则保持原状态。
```

4. 生成 `ActionResult`：

```text
message = Case.backgroundText
nextPhaseAfterClose = SHIFT_ACTIVE
```

5. 写入事件：

```text
case_inspected
```

6. 进入 `ACTION_RESULT`。

#### 失败规则

以下情况操作失败：

1. 资源不足。
2. 案件已扒底。
3. 案件已出货、退货或已完成回单。
4. 当前班次未开放扒底。

失败时不扣资源，不修改案件状态。

---

### 5.4 `revealHiddenTag(caseId, hiddenTagId?)` / 揭标

#### 作用

揭标用于揭露案件的一枚底标，即 `Case.hiddenTags[]` 中的一项。

揭标提供硬信息，不直接改变出货结果。

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

1. 当前班次开放 `revealHiddenTag`。
2. `caseId` 存在。
3. 案件属于当前班次待处理案件。
4. 案件状态不是终态。
5. 案件至少存在 1 枚未揭露底标。
6. 调查资源足够。

#### 消耗

默认消耗：

```text
PlayerState.resources.investigationPoints -= 1
```

实际消耗以本班配置为准：

```text
Shift.actionCosts.revealHiddenTag
```

如果班次未配置，则使用：

```text
GameConfig.defaultActionCosts.revealHiddenTag
```

#### 揭露目标选择规则

MVP 支持两种模式，由配置决定：

```text
Shift.rules.hiddenTagRevealMode = "ordered" | "player_choice"
```

默认：

```text
ordered
```

规则：

1. `ordered`：程序揭露 `Case.hiddenTags[]` 中第一枚未揭露底标。
2. `player_choice`：UI 允许玩家选择一个未揭露底标槽位；MVP 可暂不实现。

#### 执行规则

1. 扣除操作消耗。
2. 将目标底标 ID 加入：

```text
runtimeCase.revealedHiddenTagIds[]
```

3. 更新案件状态：

```text
如果所有底标均已揭露：FULLY_REVEALED
否则：PARTIALLY_REVEALED
```

4. 生成 `ActionResult`：

```text
message = revealedHiddenTag.revealText 或 tag.displayName
nextPhaseAfterClose = SHIFT_ACTIVE
```

5. 写入事件：

```text
case_hidden_tag_revealed
```

6. 进入 `ACTION_RESULT`。

#### 失败规则

以下情况操作失败：

1. 资源不足。
2. 没有未揭露底标。
3. 案件已出货、退货或已完成回单。
4. 当前班次未开放揭标。

失败时不扣资源，不修改案件状态。

---

### 5.5 `shipCase(caseId, flowId)` / 出货

#### 作用

出货是将案件分配到某条人生流向。

出货后案件进入跟单中状态，等待买家回单。

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

1. 当前班次开放 `shipCase`。
2. `caseId` 存在。
3. `flowId` 存在于 `flows.json`。
4. `flowId` 同时存在于：

```text
Shift.availableFlowIds
Case.availableFlowIds
```

5. `Case.flowResults[flowId]` 存在。
6. 案件状态不是终态。
7. 案件未出货、未退货。
8. 如果本班配置 `requiresInspectionBeforeShipping = true`，则必须已扒底。
9. 如果本班配置 `requiresRevealBeforeShipping = true`，则至少揭露过 1 枚底标。
10. 操作资源足够。

#### 消耗

MVP 默认无消耗。

如配置成本，则按：

```text
Shift.actionCosts.shipCase
```

或：

```text
GameConfig.defaultActionCosts.shipCase
```

执行。

#### 执行规则

1. 取得：

```text
flowResult = Case.flowResults[flowId]
```

2. 扣除操作成本。
3. 设置案件运行时字段：

```text
runtimeCase.status = SHIPPED_PENDING_CALLBACK
runtimeCase.shippedToFlowId = flowId
runtimeCase.shippedAtShiftId = PlayerState.currentShiftId
runtimeCase.shippedAtShiftOrder = PlayerState.currentShiftOrder
runtimeCase.outcome = flowResult.outcome
```

4. 从当前班次待处理区移除：

```text
PlayerState.activeCaseIds.remove(caseId)
```

5. 创建回单对象 `PendingCallback`。
6. 计算回单到期时间：

```text
callbackDelay = flowResult.callbackDelay
```

规则：

```text
0      => dueShiftOrder = currentShiftOrder
1      => dueShiftOrder = currentShiftOrder + 1
2      => dueShiftOrder = currentShiftOrder + 2
"final" => dueShiftOrder = "final"
```

7. 将回单加入：

```text
PlayerState.pendingCallbacks[]
```

8. 写入事件：

```text
case_shipped
```

9. 生成 `ActionResult`：

```text
message = flowResult.immediateText
nextPhaseAfterClose = callbackDelay == 0 ? CALLBACK_REVIEW : SHIFT_ACTIVE
```

10. 进入 `ACTION_RESULT`。

#### 出货失误记录

出货时只记录预设结果，不立刻扣除押金。

```text
flowResult.outcome == "failure" => 记录为潜在出货失误
```

押金实际扣除必须等到买家回单确认时执行。

#### 失败规则

以下情况操作失败：

1. 缺少 `Case.flowResults[flowId]`。
2. `flowId` 不属于本班可用流向。
3. `flowId` 不属于案件可用流向。
4. 案件已出货或退货。
5. 前置调查要求未满足。
6. 资源不足。

失败时不扣资源，不修改案件状态。

---

### 5.6 `returnCase(caseId)` / 退货

#### 作用

退货是放弃处理该案件。

退货后案件不进入跟单中，不产生买家回单。

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

1. 当前班次开放 `returnCase`。
2. `caseId` 存在。
3. 案件属于当前班次待处理案件。
4. 案件未出货。
5. 案件未退货。
6. 操作资源足够。

#### 消耗

MVP 默认无消耗。

如配置成本，则按：

```text
Shift.actionCosts.returnCase
```

或：

```text
GameConfig.defaultActionCosts.returnCase
```

执行。

#### 执行规则

1. 取得：

```text
returnResult = Case.returnResult
```

2. 扣除操作成本。
3. 设置案件状态：

```text
runtimeCase.status = RETURNED
runtimeCase.returnedAtShiftId = PlayerState.currentShiftId
runtimeCase.returnedAtShiftOrder = PlayerState.currentShiftOrder
runtimeCase.autoReturned = false
```

4. 从当前班次待处理区移除：

```text
PlayerState.activeCaseIds.remove(caseId)
```

5. 应用押金变化：

```text
applyDepositDelta(returnResult.depositDelta, "returnCase")
```

MVP 常规配置中 `returnResult.depositDelta = 0`。

6. 写入事件：

```text
case_returned
```

7. 生成 `ActionResult`：

```text
message = returnResult.immediateText
nextPhaseAfterClose = depositTags.current <= 0 ? RUN_FAILED : SHIFT_ACTIVE
```

8. 如果押金归零，进入 `RUN_FAILED`；否则进入 `ACTION_RESULT`。

#### 失败规则

以下情况操作失败：

1. 案件已出货。
2. 案件已退货。
3. 当前班次未开放退货。
4. 资源不足。

失败时不扣资源，不修改案件状态。

---

### 5.7 `acknowledgeCallback(callbackId)` / 确认买家回单

#### 作用

确认买家回单是结算出货结果的唯一时机。

出货失误在此阶段扣除押金标签。

#### 允许阶段

```text
CALLBACK_REVIEW
FINAL_CALLBACK_REVIEW
```

#### 合法条件

1. `callbackId` 存在于 `PlayerState.pendingCallbacks`。
2. 回单状态为：

```text
ready
```

3. 当前阶段与回单类型匹配：

```text
CALLBACK_REVIEW：dueShiftOrder 为当前班次序号
FINAL_CALLBACK_REVIEW：dueShiftOrder == "final"
```

#### 执行规则

1. 读取回单对象。
2. 显示：

```text
callback.callbackText
callback.longTermText?
callback.outcome
callback.depositDelta
```

3. 应用押金变化：

```text
applyDepositDelta(callback.depositDelta, "callback")
```

4. 设置案件状态：

```text
runtimeCase.status = CALLBACK_RESOLVED
runtimeCase.callbackResolvedAtShiftId = PlayerState.currentShiftId 或 "final"
```

5. 设置回单状态：

```text
callback.status = "resolved"
callback.resolvedAtShiftOrder = currentShiftOrder 或 "final"
```

6. 写入事件：

```text
callback_resolved
```

7. 如果押金归零：

```text
phase = RUN_FAILED
```

8. 如果押金未归零：

```text
保持 CALLBACK_REVIEW 或 FINAL_CALLBACK_REVIEW，直到所有 ready 回单处理完成。
```

#### 回单排序

到期回单按以下顺序展示：

```text
dueShiftOrder
createdAtShiftOrder
caseId
```

`final` 回单按：

```text
createdAtShiftOrder
caseId
```

排序。

---

### 5.8 `finishCallbackReview()`

#### 允许阶段

```text
CALLBACK_REVIEW
```

#### 合法条件

当前班次所有 `ready` 回单均已处理。

#### 执行规则

```text
phase = SHIFT_ACTIVE
```

---

### 5.9 `finishFinalCallbackReview()`

#### 允许阶段

```text
FINAL_CALLBACK_REVIEW
```

#### 合法条件

所有 `dueShiftOrder == "final"` 的回单均已处理。

#### 执行规则

```text
phase = ENDING_BUILD
```

然后系统自动调用：

```text
buildEnding()
```

---

### 5.10 `endShift()` / 收班

#### 允许阶段

```text
SHIFT_ACTIVE
```

#### 合法条件

根据 `Shift.rules.unprocessedCasePolicy` 判断。

##### `block_end`

如果仍有未处理案件：

```text
PlayerState.activeCaseIds.length > 0
```

则不允许收班。

##### `auto_return`

允许收班。系统自动退货所有未处理案件。

##### `ignore`

允许收班。未处理案件保持未处理，不计入完成案件。MVP 不推荐。

#### 自动退货规则

当：

```text
Shift.rules.unprocessedCasePolicy == "auto_return"
```

收班时，对所有 `activeCaseIds` 中仍未处理案件执行自动退货。

自动退货规则：

1. 使用 `Case.returnResult`。
2. 设置：

```text
runtimeCase.status = RETURNED
runtimeCase.autoReturned = true
```

3. 从 `activeCaseIds` 移除。
4. 应用：

```text
applyDepositDelta(returnResult.depositDelta, "autoReturn")
```

5. 写入事件：

```text
case_auto_returned
```

自动退货不触发买家回单。

#### 班次绩效规则

收班时执行 `Shift.performanceRules[]`。

MVP 支持三类：

```text
min_shipped_cases
max_returned_cases
required_cases_processed
```

如果规则未达成，应用：

```text
PerformanceRule.depositDelta
```

默认通常为：

```text
-1
```

同一班次绩效扣罚总量受以下字段限制：

```text
Shift.rules.performancePenaltyCap
```

MVP 默认：

```text
performancePenaltyCap = 1
```

如果押金因此归零，立即进入 `RUN_FAILED`。

#### 执行规则

1. 检查收班条件。
2. 处理未处理案件。
3. 执行班次绩效规则。
4. 生成班次结算数据。
5. 写入事件：

```text
shift_ended
```

6. 进入：

```text
SHIFT_SUMMARY
```

---

### 5.11 `startNextShift()`

#### 允许阶段

```text
SHIFT_SUMMARY
```

#### 合法条件

存在下一班：

```text
Shift.nextShiftId != null
```

#### 执行规则

```text
enterShift(Shift.nextShiftId)
```

执行后进入：

```text
SHIFT_START
```

---

### 5.12 `enterFinalCallbacksOrEnding()`

#### 允许阶段

```text
SHIFT_SUMMARY
```

#### 合法条件

不存在下一班。

#### 执行规则

1. 检查是否存在 `dueShiftOrder == "final"` 且未处理的回单。
2. 如果存在：

```text
phase = FINAL_CALLBACK_REVIEW
```

3. 如果不存在：

```text
phase = ENDING_BUILD
```

并自动调用：

```text
buildEnding()
```

---

### 5.13 `buildEnding()`

#### 允许阶段

```text
ENDING_BUILD
```

#### 执行规则

结局根据以下信息生成：

```text
PlayerState.depositTags.current
PlayerState.runStatus
PlayerState.completedShiftIds.length
PlayerState.stats
EndingDef.conditions
```

结局选择规则：

1. 如果 `depositTags.current <= 0`，不进入普通结局，转入 `RUN_FAILED`。
2. 遍历 `endings.json` 中的结局规则。
3. 找到第一个满足 `conditions` 的结局。
4. 如果没有满足项，使用 `gameConfig.defaultEndingId`。
5. 生成 `PlayerState.finalReport`。
6. 设置：

```text
phase = ENDING_DISPLAY
runStatus = "completed"
```

#### 结局条件 MVP 支持项

```text
minDepositTags
maxDepositTags
requiredRunStatus
minCompletedShifts
maxFailedShipments
maxPerformancePenalties
```

---

### 5.14 `restartRun()`

#### 允许阶段

```text
ENDING_DISPLAY
RUN_FAILED
```

#### 执行规则

等同于 `startRun()`。

不得读取旧进度。

---

## 6. 回单规则

### 6.1 PendingCallback 创建

每次成功 `shipCase` 都必须创建 1 条回单。

回单字段来自：

```text
Case.flowResults[flowId]
```

映射规则：

```text
callback.caseId = caseId
callback.flowId = flowId
callback.outcome = flowResult.outcome
callback.callbackText = flowResult.callbackText
callback.longTermText = flowResult.longTermText
callback.depositDelta = flowResult.depositDelta
callback.createdAtShiftOrder = currentShiftOrder
callback.dueShiftOrder = 根据 callbackDelay 计算
callback.status = callbackDelay == 0 ? "ready" : "pending"
```

### 6.2 班次开始时回单到期检查

`enterShift(shiftId)` 时执行：

```text
for callback in pendingCallbacks:
  if callback.status == "pending" and callback.dueShiftOrder == currentShiftOrder:
      callback.status = "ready"
      runtimeCase.status = CALLBACK_READY
      readyCallbackIds.push(callback.id)
```

### 6.3 `callbackDelay = 0`

同班即时回单规则：

1. `shipCase` 后仍先进入 `ACTION_RESULT`，显示即时反馈。
2. 玩家关闭即时反馈后：

```text
nextPhaseAfterClose = CALLBACK_REVIEW
```

3. 该回单进入 `ready` 状态。
4. 玩家必须确认回单后才能继续本班操作。

### 6.4 `callbackDelay = "final"`

`final` 回单不在普通班次开始时显示。

最后一班 `SHIFT_SUMMARY` 后执行：

```text
enterFinalCallbacksOrEnding()
```

如果存在 `final` 回单，进入：

```text
FINAL_CALLBACK_REVIEW
```

全部处理完成后才进入：

```text
ENDING_BUILD
```

### 6.6 终审清算一切未确认回单（规则层兜底）

`enterFinalCallbacksOrEnding()` 不只处理 `final` 回单。进入结局前，必须清算**所有** `status != "resolved"` 的买家回单，无论其延迟是 `final`、`1`、`2`，还是到期班次序号已越过最后一班（例如在最后一班出货且延迟为 `1`，其 `dueShiftOrder` 会落到一个永不到来的班次序号）。

```text
hasPending = pendingCallbacks 中存在 status != "resolved"
hasPending == true  => FINAL_CALLBACK_REVIEW（逐一展示并按 depositDelta 结算）
hasPending == false => ENDING_BUILD
```

终审阶段同样遵守 §8.1：任一回单扣押金导致归零时立即中断进入 `RUN_FAILED`，不再处理剩余回单、不进入普通结局。

这是规则层兜底，保证每次出货结果都在结局判定前对玩家可见、真实作用于押金，不依赖内容配置正确性。

**内容约定（不替代规则层兜底）：** 最后一班案件的回单延迟应优先使用 `final` 或即时（`0`），保持语义清晰，避免依赖到期序号越界这一兜底路径。

### 6.5 押金扣除时机

出货本身不扣押金。

押金扣除发生在玩家确认买家回单时：

```text
acknowledgeCallback(callbackId)
```

应用：

```text
applyDepositDelta(callback.depositDelta, "callback")
```

如果扣除后押金归零：

```text
phase = RUN_FAILED
```

---

## 7. 班次规则

### 7.1 班次进入

进入班次时，系统加载：

1. 班次标题。
2. 班前提示。
3. 本班目标。
4. 本班可用操作。
5. 本班可用流向。
6. 本班资源。
7. 本班案件。
8. 本班特殊规则。
9. 到期买家回单。

### 7.2 本班资源重置

每班资源由：

```text
Shift.resources
```

决定。

MVP 关键资源：

```text
investigationPoints
```

进入班次时：

```text
PlayerState.resources = clone(Shift.resources)
```

如果 `Shift.resources` 缺少字段，则使用 `gameConfig.defaultShiftResources`。

### 7.3 本班可用操作

UI 只显示 `Shift.availableActionIds` 中包含的操作。

规则层也必须检查操作是否开放。

例如，如果本班没有：

```text
revealHiddenTag
```

则即使案件有底标，也不允许揭标。

### 7.4 本班可用流向

UI 显示的流向必须是：

```text
intersection(Shift.availableFlowIds, Case.availableFlowIds)
```

并且必须存在：

```text
Case.flowResults[flowId]
```

### 7.5 班次结束条件

由：

```text
Shift.rules.unprocessedCasePolicy
```

决定。

推荐 MVP 配置：

```text
block_end：教学班，强制处理完所有案件。
auto_return：压力班，允许收班但自动退货未处理案件。
```

---

## 8. 结局与失败

### 8.1 失败流程

押金标签归零时立即进入：

```text
RUN_FAILED
```

失败流程必须中断当前操作链。

例如：

1. 玩家确认回单。
2. 回单扣除押金 -1。
3. 押金从 1 变为 0。
4. 立即进入 `RUN_FAILED`。
5. 不再展示剩余回单。
6. 不再进入普通结局。

### 8.2 普通结局

普通结局只在以下条件成立时进入：

```text
所有班次已结束
所有 final 回单已处理
depositTags.current > 0
```

普通结局由 `endings.json` 配置。

MVP 结局条件只基于：

```text
剩余押金标签
完成班次数
出货失误数
退货数
绩效扣罚次数
```

### 8.3 最终报告内容

最终报告至少显示：

```text
结局标题
结局正文
剩余押金标签
完成班次
处理案件数
出货案件数
退货案件数
出货失误数
绩效扣罚次数
```

---

## 9. UI 与规则层边界

### 9.1 UI 不得直接改状态

UI 点击按钮时只能调用规则函数。

错误示例：

```text
按钮点击后直接 state.resources.investigationPoints -= 1
```

正确示例：

```text
onClickInspect(caseId) => inspectCase(playerState, caseId, config)
```

### 9.2 UI 必须根据状态显示按钮

按钮 disabled 条件必须来自规则层的可执行性判断。

至少实现：

```text
canInspectCase(caseId)
canRevealHiddenTag(caseId)
canShipCase(caseId, flowId)
canReturnCase(caseId)
canEndShift()
```

### 9.3 信息显示规则

案件卡必须显示：

```text
caseNo
displayName
visibleTags
summaryText
```

只有在 `backgroundRevealed == true` 时显示：

```text
backgroundText
```

只有在对应底标已揭露时显示：

```text
hiddenTag.displayName 或 hiddenTag.revealText
```

未揭露底标显示为：

```text
???
```

### 9.4 回单显示规则

跟单中案件显示：

```text
caseNo
flowName
pendingText
```

到期回单显示：

```text
caseNo
flowName
callbackText
longTermText?
outcome
depositDelta
```

---

## 10. 数据加载与校验

### 10.1 启动加载顺序

程序启动时加载：

```text
gameConfig.json
tags.json
flows.json
cases.json
shifts.json
endings.json
```

### 10.2 必须校验

启动时必须校验：

1. 所有 ID 唯一。
2. `GameConfig.firstShiftId` 存在。
3. `Shift.nextShiftId` 如存在，必须存在。
4. `Shift.caseIds[]` 均存在。
5. `Shift.availableFlowIds[]` 均存在。
6. `Shift.availableActionIds[]` 均是合法操作。
7. `Case.visibleTagIds[]` 均存在。
8. `Case.hiddenTags[].tagId` 均存在。
9. `Case.availableFlowIds[]` 均存在。
10. `Case.flowResults` 覆盖 `Case.availableFlowIds[]`。
11. `Shift.caseIds[]` 中每个案件至少有 1 条可在本班显示的流向。
12. `Case.returnResult` 存在。
13. `FlowResult.outcome` 合法。
14. `FlowResult.callbackDelay` 合法。
15. `FlowResult.depositDelta` 是数字。
16. `ReturnResult.depositDelta` 是数字。
17. `EndingDef.conditions` 使用的字段合法。

校验失败时：

```text
不得进入 TITLE。
显示配置错误信息。
控制台输出具体错误路径。
```

---

## 11. MVP 测试清单

### 11.1 状态机测试

必须覆盖：

1. 标题页开始新局。
2. 第一班进入 `SHIFT_START`。
3. 无回单时进入 `SHIFT_ACTIVE`。
4. 出货后进入 `ACTION_RESULT`。
5. 关闭即时反馈后回到 `SHIFT_ACTIVE`。
6. 下一班开始时进入 `CALLBACK_REVIEW`。
7. 回单全部处理后进入 `SHIFT_ACTIVE`。
8. 最后一班结束后进入 `FINAL_CALLBACK_REVIEW` 或 `ENDING_BUILD`。
9. 普通结局进入 `ENDING_DISPLAY`。
10. 押金归零进入 `RUN_FAILED`。

### 11.2 操作测试

必须覆盖：

1. 扒底消耗调查机会。
2. 调查机会不足时不能扒底。
3. 揭标消耗调查机会。
4. 无底标时不能揭标。
5. 出货必须选择合法流向。
6. 出货后案件不再可操作。
7. 退货后案件不再可操作。
8. `block_end` 下未处理案件不能收班。
9. `auto_return` 下未处理案件自动退货。

### 11.3 押金测试

必须覆盖：

1. 出货本身不扣押金。
2. 回单结算时按 `depositDelta` 扣押金。
3. `outcome == failure` 的回单能扣押金。
4. 押金从 1 扣到 0 时进入 `RUN_FAILED`。
5. 进入 `RUN_FAILED` 后不能继续处理回单或班次。

### 11.4 数据校验测试

必须覆盖：

1. 缺失 caseId 报错。
2. 缺失 tagId 报错。
3. 缺失 flowId 报错。
4. `flowResults` 未覆盖可用流向时报错。
5. 非法 `callbackDelay` 报错。
6. 非法 `outcome` 报错。
7. 非数字 `depositDelta` 报错。

---

## 12. 术语与字段对照

| 中文术语 | 数据字段 | 说明 |
|---|---|---|
| 案件 | `Case` | 手工设计的核心内容单位 |
| 班次 | `Shift` | 固定关卡单位 |
| 标签 | `Tag` / `visibleTagIds` | 正面可见属性 |
| 底标 | `hiddenTags` | 揭标后显示的隐藏属性 |
| 底细 | `backgroundText` | 扒底后显示的软信息 |
| 扒底 | `inspectCase` | 查看底细 |
| 揭标 | `revealHiddenTag` | 揭露底标 |
| 出货 | `shipCase` | 分配到流向 |
| 退货 | `returnCase` | 放弃处理案件 |
| 跟单中 | `SHIPPED_PENDING_CALLBACK` | 等待买家回单 |
| 买家回单 | `PendingCallback` | 延迟反馈 |
| 押金标签 | `depositTags` | 显性生存资源 |
| 出货失误 | `FlowResult.outcome == "failure"` | 回单结算时确认 |
