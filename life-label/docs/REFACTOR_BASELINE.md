# 重构行为基线（REFACTOR_BASELINE）

> 【历史文档】`game.html` 已在重构完成后删除（见 git 历史）。本文记录的行号指向当时的
> `game.html`，仅作行为基线参照；当前实现为 `src/` 下的分层架构（见 docs/ARCHITECTURE.md）。


> 本文件记录重构开始前 `game.html` 的**实际行为**，作为后续模块化拆分的回归基准。
> 内容来自对 `game.html`（2105 行，单文件）逐行通读，描述"现状"而非"应然"。
> 重构任何一步后，行为都必须与本文件一致；如需偏离，必须显式说明。

---

## 1. 目录结构（重构前）

```
life-label/
├── game.html            # 单文件游戏：HTML + 内联 <style> + 内联 <script>（全部逻辑）
├── AGENTS.md
├── CLAUDE.md            # 项目约定（单文件 Canvas，无框架）
├── package-lock.json    # 空壳（packages: {}），无 package.json
├── .claude/
│   ├── launch.json      # 启动配置：node .claude/static-server.js，端口 8777
│   └── static-server.js # 极简静态服务器，/ → game.html
├── data/                # 游戏内容 JSON，运行时 fetch 加载
│   ├── gameConfig.json
│   ├── tags.json
│   ├── flows.json
│   ├── cases.json
│   ├── shifts.json
│   ├── endings.json
│   └── mascot.json
└── docs/                # 规格文档
    ├── UI_SPEC.md / VISUAL_STYLE.md / TECH_SPEC.md / DATA_SCHEMA.md
    ├── CASE_TEMPLATE.md / ENDING(S)_DESIGN.md / WRITING_GUIDE.md
    └── 世界观设定与术语.md / 游戏方案 v0.3.md
```

启动方式：`node .claude/static-server.js` → 浏览器访问 `http://localhost:8777/`。

---

## 2. game.html 各职责区域（行号为重构前）

| 区域 | 行号 | 职责 | 平台耦合 |
|---|---|---|---|
| HTML 外壳 | 1–16 | `<canvas id="game">`、字体 `<link>`、`<style>`（背景 #2A2017，canvas block） | DOM |
| 画布/缩放 | 25–37 | `BASE_W/H=1280×720`，`resize()` 按窗口缩放，`scaleX/scaleY` | Canvas/DOM/window |
| 数据容器 | 39–42 | `DATA`、`GAMECONFIG`、`tagsById/casesById/flowsById/shiftsById` 索引 | 无 |
| 颜色/几何常量 | 44–105 | `COLORS`、分区几何、`FLOW_VISUAL`、`FLOW_ORDER`、`LABEL_COLORS`、`TEMPORAL_TAGS`、`SOCIAL_TAGS` | 无（纯常量） |
| 绘制工具 | 121–162 | `roundRect`、`darken`、`clone`、`lerp`、`easeOut/In`、`wrapText` | 部分用 ctx |
| **规则层** | 164–842 | PlayerState、状态机、所有 Action、tendency、押金、结局、计时器（见 §4–§8） | **基本无耦合**，但混入 UI 调用（见下） |
| 数据校验 | 844–899 | `validateData()` | 无 |
| 视图状态 UI | 901–965 | `UI` 对象、`pickMascotLine`、`buildScene`、`openActiveCard`、动画触发 | 无引擎，纯状态 |
| 动画更新 | 967–989 | `updateAnims(dt)` | 无引擎，纯状态 |
| 渲染 | 991–1894 | `drawDesktop`/`drawStatusBar`/`drawFlowZone`/`drawActiveCard`/各 phase 叠层页 | Canvas |
| 主循环 | 1896–1926 | `drawFrame()`（按 phase 分派）、`gameLoop(ts)` | Canvas/rAF |
| 输入 | 1928–2058 | 鼠标 down/move/up、键盘、命中测试、拖拽 | MouseEvent/DOM |
| 加载启动 | 2060–2102 | `loadData()`（fetch）、`validateData`、`boot()`（fonts.ready） | fetch/DOM |

### 规则层中混入的 UI 调用（重构时必须解耦的点）
规则函数当前**直接调用了视图/动画函数**，core 化时这些副作用必须改为事件：
- `expireShiftTimer` → 写 `UI.drag/hoveredZone/activeCard`、`showToast`
- `applyDepositDelta` → `queueDepositAnim`
- `inspectCase`/`revealHiddenTag` → 读写 `UI.activeCard.flipTarget`、`UI.revealPop`
- `shipCase` → `startStampAnim`；`returnCase` → `startReturnAnim`
- `fail` → `showToast`
- 各 `enterShift`/`drawScene` → `buildScene`、`_mascotPending/_depositBubblePending` 标志

---

## 3. GamePhase（状态机相位）

`STATE.phase` 取值（字符串），分派见 `drawFrame()`（1899）：

| Phase | 含义 | 进入来源 |
|---|---|---|
| `TITLE` | 标题页（`STATE = { phase:'TITLE' }`，无完整 PlayerState） | boot 成功后 |
| `RUN_INIT` | `newPlayerState()` 初始相位（瞬时，随即 enterShift） | startRun |
| `SHIFT_START` | 班前页（介绍/目标/规则/限时说明，"开始处理"按钮） | enterShift |
| `CALLBACK_REVIEW` | 班前/即时回单逐条确认 | beginShiftWork（有到期回单）、callbackDelay=0 出货后、closeActionResult |
| `SHIFT_ACTIVE` | 工作台进行中（可选案/扒底/揭标/出货/退货/收班） | beginShiftWork、回单清空、ACTION_RESULT 关闭 |
| `ACTION_RESULT` | 操作结果叠层（揭标、出货、退货、扒底的反馈条） | setActionResult |
| `SHIFT_SUMMARY` | 班次结算（出货/退货统计、绩效、标宝附注） | endShift |
| `FINAL_CALLBACK_REVIEW` | 终审清算所有未确认回单 | enterFinalCallbacksOrEnding |
| `ENDING_BUILD` | 结局构建（瞬时，随即 buildEnding） | finishFinalCallbackReview / 无 pending 时 |
| `ENDING_DISPLAY` | 结局报告页（"再来一次"） | buildEnding 成功 |
| `RUN_FAILED` | 押金归零失败页（"重新报到"） | applyDepositDelta 归零 / buildEnding 押金≤0 |

`setPhase(state, phase)`（309）：写 phase，并驱动计时器 running（仅 SHIFT_ACTIVE 时跑）。

---

## 4. 案件运行状态（runtimeCases[caseId].status）

初始化于 `enterShift`（407），取值：

| status | 含义 |
|---|---|
| `UNTOUCHED` | 未触碰（初始） |
| `INSPECTED` | 已扒底（仅当从 UNTOUCHED 扒底）|
| `PARTIALLY_REVEALED` | 已揭部分底标 |
| `FULLY_REVEALED` | 全部底标已揭 |
| `SHIPPED_PENDING_CALLBACK` | 已出货，等待回单 |
| `CALLBACK_READY` | 回单到期可确认 |
| `CALLBACK_RESOLVED` | 回单已确认 |
| `RETURNED` | 已退货（手动或自动） |
| `LOCKED` | （终态集合中列出，当前数据流程未主动赋值） |

终态集合（多处复用，禁止再操作）：
`['RETURNED','SHIPPED_PENDING_CALLBACK','CALLBACK_READY','CALLBACK_RESOLVED','LOCKED']`

runtimeCase 字段：`caseId, status, backgroundRevealed, revealedHiddenTagIds[], addedTagIds[], removedTagIds[], shippedToFlowId, shippedAtShiftId, shippedAtShiftOrder, outcome, returnedAtShiftId, returnedAtShiftOrder, autoReturned, callbackResolvedAtShiftId`。

---

## 5. Action（操作）

`ACTION_IDS`（169）= `['selectCase','inspectCase','revealHiddenTag','shipCase','returnCase','buyTagForCase','sellTagFromCase','endShift']`
（`buyTagForCase`/`sellTagFromCase` 在 ACTION_IDS 中合法但当前无实现/无数据使用。）

| Action | 函数 | 守卫（canX）| 资源消耗 | 效果 |
|---|---|---|---|---|
| selectCase | 490 | phase=SHIFT_ACTIVE，在 activeCaseIds，非终态 | 无 | 设 selectedCaseId，stats.casesSelected++，openActiveCard |
| inspectCase（扒底）| 514 | 本班开放、UNTOUCHED/PARTIALLY/FULLY、未 backgroundRevealed、付得起 | investigationPoints −1 | backgroundRevealed=true，UNTOUCHED→INSPECTED，翻到底面 |
| revealHiddenTag（揭标）| 554 | 本班开放、非终态、有未揭底标、付得起 | investigationPoints −1 | 按 order 揭一枚，全揭→FULLY_REVEALED 否则 PARTIALLY，ACTION_RESULT |
| shipCase（出货）| 598 | 本班/案件开放该 flow、有 flowResults、非终态、满足扒底/揭标前置规则、付得起 | shipCase cost（默认空）| 状态→SHIPPED_PENDING_CALLBACK，建回单 cb，移出 activeCaseIds，**applyTendencyDeltas(fr.tendencyDeltas)**，盖章动画，按 callbackDelay 决定下一相位 |
| returnCase（退货）| 649 | 本班开放、非终态、付得起 | returnCase cost（默认空）| 状态→RETURNED，移出 activeCaseIds，**applyTendencyDeltas(ret.tendencyDeltas)**，applyDepositDelta(ret.depositDelta)，退货动画 |
| acknowledgeCallback | 675 | phase ∈ {CALLBACK_REVIEW, FINAL_CALLBACK_REVIEW} | 无 | cb→resolved，case→CALLBACK_RESOLVED，applyDepositDelta(cb.depositDelta)，failure 计 failedShipments |
| endShift（收班）| 718 | phase=SHIFT_ACTIVE；block_end 且有剩余则拒 | endShift cost（默认空）| 自动退货（auto_return/强制）、绩效结算、写 shiftSummary、SHIFT_SUMMARY |

资源/成本：`actionCost`（322）优先班次 `actionCosts`，回退 `gameConfig.defaultActionCosts`。`canAfford`/`applyCost`（328/332）。`shiftActionOpen`（335）查 `availableActionIds`。

---

## 6. tendency 系统（倾向）—— 完整保留，不得改动

- `TENDENCY_IDS`（170）：`cold_precision, residual_empathy, gambler_tendency, traffic_instinct, endorsement_worship, over_caution`
- `TENDENCY_NAMES`（171）：冷血精准 / 残余共情 / 赌徒倾向 / 流量嗅觉 / 背书崇拜 / 过度谨慎
- 数值存于 `STATE.tendencies`（各 id → 整数，初始 0，`zeroTendencies` 185）
- **累计规则**（`applyTendencyDeltas` 365）：仅在 **shipCase**（出货，用 `flowResults[flow].tendencyDeltas`，630）和 **returnCase**（退货，用 `returnResult.tendencyDeltas`，665）时立即累加；记 `tendency_changed` 事件。其他操作不影响 tendency。
- **主导判断**（`getDominantTendency` 834）：取值 **>2（即 ≥3）** 的最高分 id；无则 null。
- **结局条件**（`buildEnding` 795 + endings.json `conditions.minTendency/maxTendency`）：6 个倾向各有专属结局，阈值见 §8。
- **失败报告动态内容**（`TENDENCY_FAILURE_INFO` 176）：按主导倾向（≥3）在 RUN_FAILED 页输出对应底标文案与建议流向；无主导用 `_none`。
- 失败报告渲染：`drawRunFailed`（1653）调用 `getDominantTendency` 选 `TENDENCY_FAILURE_INFO`。

---

## 7. JSON 数据文件及作用

| 文件 | 顶层结构 | 关键字段 | 作用 |
|---|---|---|---|
| `gameConfig.json` | object | `firstShiftId, defaultEndingId, initialDepositTags(5), maxDepositTags(5), defaultShiftResources, defaultActionCosts, mvpFlags` | 全局配置；`mvpFlags` 当前未被规则层读取（仅声明） |
| `tags.json` | array | `id, displayName, description, category, uiTone(valuable/risk/strange/normal)` | 标签定义；`uiTone` 决定卡面配色（`tagType` 107） |
| `flows.json` | array | `id, displayName, shortName, description, buyerName, pendingText, uiTone` | 10 个流向；视觉映射在代码 `FLOW_VISUAL`（64） |
| `cases.json` | array | `id, caseNo, displayName, summaryText, backgroundText, visibleTagIds[], hiddenTags[{id,tagId,order,revealText}], availableFlowIds[], flowResults{flow→{outcome,callbackDelay,depositDelta,tendencyDeltas,immediateText,callbackText,longTermText,resultTags}}, returnResult{depositDelta,tendencyDeltas,immediateText}` | 案件全部内容与各流向结果 |
| `shifts.json` | array（7 班）| `id, order, displayName, introText, objectiveText, summaryTitle, caseIds[], nextShiftId, availableActionIds[], availableFlowIds[], resources, actionCosts, rules{unprocessedCasePolicy,requiresInspectionBeforeShipping,requiresRevealBeforeShipping,performancePenaltyCap,...}, performanceRules[], ui` | 班次配置；班 3–7 含限时（`timeRemainingSeconds` 120/105/105/105/100） |
| `endings.json` | array（10 个）| `id, priority, title, reportHeader, bodyText, conditions{...}, resultTags[]` | 结局；按 priority 升序匹配第一个满足条件者 |
| `mascot.json` | object | `general[], byShift{}, summaryNotes{}, failedNote` | 标宝（吉祥物）台词 |

数据索引：`loadData`（2070）按 `id` 建 `tagsById/casesById/flowsById/shiftsById`（DATA.endings/mascot 不建索引，按数组用）。

---

## 8. 数据校验规则（validateData，844）

启动时执行；任一错误则停在"配置错误，详见控制台"，不进入游戏。检查项：
1. tags/flows/cases/shifts/endings **ID 唯一**。
2. `firstShiftId`、`defaultEndingId` 存在。
3. `gameConfig.defaultActionCosts.*.timeSeconds` 已废弃（出现即报错）。
4. 每班：`nextShiftId` 存在、`caseIds`/`availableFlowIds` 引用存在、`availableActionIds` ∈ ACTION_IDS。
5. 限时班：`durationSeconds` 为正有限数；`timeoutPolicy` ∈ `auto_return/block_end/ignore/force_end`；`warningThresholdSeconds < durationSeconds`。
6. 班 `actionCosts.*.timeSeconds` 已废弃。
7. 每班每案件：班 flow ∩ 案件 flow ∩ flowResults 非空（否则"无可显示流向"）。
8. 每案件：`visibleTagIds`/`hiddenTags.tagId` 存在；`availableFlowIds` 存在且 flowResults 覆盖；`flowResults.*.outcome` ∈ `success/failure/mixed/neutral`；`callbackDelay` ∈ `final/0/1/2`；`depositDelta` 为数字；`returnResult.depositDelta` 为数字。

### 结局匹配条件（endings.json，buildEnding 795）
按 priority 升序第一个满足者；都不满足用 `defaultEndingId`（ending_probation_extended）。

| id | priority | 关键条件 |
|---|---|---|
| ending_ace_operator | 3 | active, 押金≥4, 完成7班, 失误≤1 |
| ending_qualified_operator | 8 | active, 押金≥3, 完成7班, 失误≤3 |
| ending_cold_precision | 20 | active, 押金≥1, cold_precision≥6 |
| ending_gambler_tendency | 30 | active, 押金≥1, gambler_tendency≥5 |
| ending_traffic_instinct | 40 | active, 押金≥1, traffic_instinct≥5 |
| ending_endorsement_worship | 50 | active, 押金≥1, endorsement_worship≥4 |
| ending_over_caution | 60 | active, 押金≥1, over_caution≥4 |
| ending_residual_empathy | 70 | active, 押金≥1, residual_empathy≥4 |
| ending_retained | 85 | active, 押金≥2, 完成7班 |
| ending_probation_extended | 100（默认）| active, 押金≥1 |

押金 ≤0 → 直接 RUN_FAILED（不进结局匹配）。

---

## 9. 完整游戏流程

```
boot() → drawLoading → fonts.ready → loadData(fetch 7 JSON) → validateData
  └─ 有错：drawLoading("配置错误") 停
  └─ 无错：phase=TITLE → gameLoop 启动

TITLE ──"开始上工"──▶ startRun()
  startRun: newPlayerState() → enterShift(firstShiftId)

enterShift(shiftId):
  设班次资源/计时器/activeCaseIds，初始化 runtimeCases
  回单到期检查（dueShiftOrder==currentShiftOrder → ready，case→CALLBACK_READY）
  _mascotPending=true，phase=SHIFT_START，buildScene

SHIFT_START ──"开始处理"──▶ beginShiftWork()
  有到期回单 → CALLBACK_REVIEW（逐条 acknowledgeCallback）→ 清空后 SHIFT_ACTIVE
  无 → SHIFT_ACTIVE（限时班启动计时器）

SHIFT_ACTIVE（循环）:
  点来货堆顶 → selectCase → openActiveCard（卡滑入中心）
  卡底 tab：扒底 inspectCase / 揭标 revealHiddenTag / 退货 returnCase
  拖卡到流向柜台 → shipCase；拖到退货箱 → returnCase
  扒底/揭标/出货/退货 → ACTION_RESULT 反馈条 → "继续"/任意键 closeActionResult
    closeActionResult: 若 callbackDelay==0 出货 → CALLBACK_REVIEW；否则回 SHIFT_ACTIVE，checkAutoEndShift
  所有案件处理完 → checkAutoEndShift 自动 endShift
  "收班"按钮：有剩余案件 → 确认对话框（block_end 则提示无法收班）；无剩余 → endShift

endShift:
  auto_return/强制：剩余案件自动退货（applyDepositDelta）
  绩效结算（min_shipped/max_returned/required_processed，扣罚受 performancePenaltyCap 限）
  写 shiftSummary，phase=SHIFT_SUMMARY

SHIFT_SUMMARY ──按钮──▶
  有 nextShiftId → startNextShift → enterShift(next)（回到 SHIFT_START）
  无（第7班后）→ enterFinalCallbacksOrEnding
    有未结回单 → FINAL_CALLBACK_REVIEW（逐条确认）→ finishFinalCallbackReview
    无 → ENDING_BUILD → buildEnding

buildEnding: 押金≤0→RUN_FAILED；否则匹配结局，runStatus=completed，ENDING_DISPLAY

ENDING_DISPLAY ──"再来一次"──▶ restartRun()=startRun()
RUN_FAILED ──"重新报到"──▶ restartRun()

任意时刻押金归零（applyDepositDelta ≤0）→ runStatus=failed, RUN_FAILED（中断当前流程）
限时归零（updateShiftTimer）→ expireShiftTimer → endShift(forcedByTimeout)
```

---

## 10. 主循环（gameLoop，1918）

`requestAnimationFrame(gameLoop)`：
1. `dt = min(0.05, (ts−lastTime)/1000)`（首帧 0.016）
2. `updateAnims(dt)`（动画推进，UI.elapsed 累加）
3. `updateShiftTimer(STATE, dt)`（仅 SHIFT_ACTIVE & running & 未 expired 时倒数；触发警告/归零）
4. `ctx.setTransform(scaleX,0,0,scaleY,0,0)`（缩放）
5. `drawFrame()`：清空 clickTargets → 按 phase 分派渲染 → drawToast
6. 再次 `requestAnimationFrame(gameLoop)`

---

## 11. 输入与拖拽流程（1928–2058）

事件绑定：`canvas` mousedown/mousemove + `window` mouseup/keydown。
坐标：`getCanvasPos`（除以 scaleX/Y 回到 1280×720 基准系）。

- **clickTargets**：每帧渲染时由 `button()`/各叠层页 push 的命中矩形 `{x,y,w,h,fn}`；`handleClickTargets` 逆序命中（后绘制者优先）。mousedown 先处理 clickTargets。
- **onMouseDown**：clickTargets 命中即返回；否则仅 SHIFT_ACTIVE 下：①命中卡 tab → handleTab；②命中来货堆顶 → selectCase(首个)；③命中活动卡体（slideT>0.5）→ 进入 DRAGGING（记 offX/offY）。
- **handleTab**：inspect（已扒底则翻面，否则 inspectCase）/ reveal（revealHiddenTag）/ return（returnCase）。
- **onMouseMove**：DRAGGING 时更新卡位置 + 计算 hoveredZone（退货箱或可用流向柜台），光标 grabbing；否则按命中给光标（pointer/grab）+ stackHover。
- **onMouseUp**：仅 DRAGGING 时结算 —— hoveredZone='return'→returnCase；命中流向→canShip 通过则 shipCase，否则 toast + snapCardBack（卡滑回中心）；未命中→snapCardBack。
- **onKeyDown**：ACTION_RESULT 相位下任意键 → closeActionResult。

命中测试：卡片做了旋转，`cardLocal` 把全局坐标转卡局部坐标后再矩形判定（`hitCardBody`/`hitCardTab`）。

---

## 12. 动画类型（视图状态，独立于 PlayerState）

`UI` 对象（904）持有所有动画状态。`updateAnims(dt)`（971）推进：

| 动画 | 字段 | 触发 | 时长/行为 |
|---|---|---|---|
| 活动卡滑入/翻面 | `UI.activeCard{slideT,flip,flipTarget,rotation...}` | openActiveCard / 扒底翻面 | 滑入 0.3s easeOut；flip 朝 flipTarget 插值 |
| 出货盖章 | `UI.stamp{flowId,caseId,t,dur=0.9}` | startStampAnim（shipCase） | 0.9s：盖章下压→墨迹→卡飞向柜台淡出 |
| 退货 | `UI.returnAnim{caseId,t,dur=0.4}` | startReturnAnim（returnCase） | 0.4s：卡缩小旋转飞向退货箱 |
| 押金扣除 | `UI.depositAnim{t,dur=0.7,delta}` | queueDepositAnim（押金减少时） | 0.7s：红色 delta 数字上浮 + 押金图标闪烁 |
| 揭标弹出 | `UI.revealPop{caseId,id,t}` | revealHiddenTag | 0.35s：新底标标签缩放弹入 |
| Toast | `UI.toast{text,t}` | showToast（失败/提示） | ~2.4s 淡入淡出 |
| 标宝气泡 | `UI.mascotBubble{text,t}` | 每班开始 / 押金剩 2 枚 | ~6.5s；可点击关闭 |
| 收班确认框 | `UI.confirmEndShift` (bool) | 有剩余案件点收班 | 模态叠层 |
| LED 滚动行情 | `tickerOffset`（模块级）| 常驻 | 状态栏滚动（纯装饰，硬编码 TICKER_ITEMS）|
| 限时闪烁 | 依赖 `UI.elapsed` | 限时 ≤30s | 状态栏计时器 ~1.5Hz 闪烁 |

> 注：LED 行情条 `TICKER_ITEMS`（1034）与失败页部分文案为**硬编码装饰**，非 data 驱动。

---

## 13. 重构注意点（供后续步骤参考，不改变行为）

- 规则层已较纯净，但**直接调用了 UI/动画函数**（见 §2 末）。core 化时改为发事件，由 presentation 订阅。
- `new Date()` / `Date.now()`（logEvent、runId）属平台无关可保留，但 core 不应依赖 DOM。
- `Math.random()`（pickMascotLine、mascot 抽取）在 core/presentation 边界需明确归属。
- `clone = JSON.parse(JSON.stringify())` 纯逻辑，可入 core。
- 视觉常量（COLORS/FLOW_VISUAL/LABEL_COLORS）属 presentation。
- `FLOW_ORDER`/`FLOW_VISUAL` 的流向顺序与配色为代码硬编码，非 data。
</content>
</invoke>
