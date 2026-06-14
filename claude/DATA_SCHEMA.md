# 《人生标签交易所：试用期》数据结构文档

版本：v0.3 / HTML MVP 修订版  
适用对象：编程 Agent、写作 Agent、策划、测试  
文档性质：JSON 数据接口协议  
对应机制规格：`TECH_SPEC.md`

---

## 0. 总原则

### 0.1 数据分层

项目数据分为两类：

1. **静态配置数据**：写在 `/data/*.json` 中，由策划和写作 Agent 维护。
2. **运行时状态数据**：运行中生成，保存在内存 `PlayerState` 中，MVP 不持久化。

### 0.2 MVP 必需文件

```text
data/
  gameConfig.json
  shifts.json
  cases.json
  tags.json
  flows.json
  endings.json
```

MVP 中 `tags.json` 是必需文件。原因：`Case.visibleTagIds[]` 与 `Case.hiddenTags[].tagId` 必须引用标签表，写作 Agent 与编程 Agent 需要同一套标签 ID。

### 0.3 MVP 可选预留文件

```text
data/
  marketTrends.json
  tutorials.json
  textStyleExamples.json
```

这些文件可后续添加，MVP 不要求实现。

### 0.4 ID 命名规则

所有内部 ID 使用英文 snake_case。

```text
case_a17_young_elite
shift_01_orientation
flow_big_company
tag_elite_school
```

中文只出现在显示字段中，例如：

```text
displayName
summaryText
backgroundText
immediateText
callbackText
```

### 0.5 Schema 表达方式

本文档使用四种方式描述数据：

1. 字段表。
2. TypeScript-like interface。
3. JSON 示例。
4. 简化 JSON Schema。

编程 Agent 可以据此写运行时校验器；不要求必须引入第三方 JSON Schema 库。

### 0.6 必须校验的跨表引用

程序启动时必须校验：

1. `GameConfig.firstShiftId` 必须存在于 `shifts.json`。
2. `GameConfig.defaultEndingId` 必须存在于 `endings.json`。
3. `Shift.nextShiftId` 如存在，必须存在于 `shifts.json`。
4. `Shift.caseIds[]` 中每个 ID 必须存在于 `cases.json`。
5. `Shift.availableFlowIds[]` 中每个 ID 必须存在于 `flows.json`。
6. `Shift.availableActionIds[]` 中每个 ID 必须是合法 `ActionId`。
7. `Case.designedForShiftId` 如存在，必须存在于 `shifts.json`。
8. `Case.availableFlowIds[]` 中每个 ID 必须存在于 `flows.json`。
9. 对于 `Shift.caseIds[]` 中的每个案件，`Case.availableFlowIds` 与 `Shift.availableFlowIds` 至少有一个交集。
10. `Case.flowResults` 的 key 必须是合法 `flowId`。
11. `Case.flowResults` 必须覆盖 `Case.availableFlowIds[]` 中的所有流向。
12. UI 实际显示的出货流向必须同时存在于 `Shift.availableFlowIds` 与 `Case.availableFlowIds`，且存在对应 `Case.flowResults[flowId]`。
13. `Case.visibleTagIds[]` 必须存在于 `tags.json`。
14. `Case.hiddenTags[].tagId` 必须存在于 `tags.json`。
15. 所有静态配置 ID 在各自文件内必须唯一。

---

## 1. 基础枚举

### 1.1 GamePhase

```ts
type GamePhase =
  | "APP_BOOT"
  | "TITLE"
  | "RUN_INIT"
  | "SHIFT_START"
  | "CALLBACK_REVIEW"
  | "SHIFT_ACTIVE"
  | "ACTION_RESULT"
  | "SHIFT_SUMMARY"
  | "FINAL_CALLBACK_REVIEW"
  | "ENDING_BUILD"
  | "ENDING_DISPLAY"
  | "RUN_FAILED";
```

### 1.2 CaseRuntimeStatus

```ts
type CaseRuntimeStatus =
  | "UNTOUCHED"
  | "INSPECTED"
  | "PARTIALLY_REVEALED"
  | "FULLY_REVEALED"
  | "SHIPPED_PENDING_CALLBACK"
  | "CALLBACK_READY"
  | "CALLBACK_RESOLVED"
  | "RETURNED"
  | "LOCKED";
```

注意：`SELECTED` 不属于案件生命周期状态。当前选中案件只由 `PlayerState.selectedCaseId` 表示。

### 1.3 ActionId

```ts
type ActionId =
  | "selectCase"
  | "inspectCase"
  | "revealHiddenTag"
  | "shipCase"
  | "returnCase"
  | "buyTagForCase"
  | "sellTagFromCase"
  | "endShift";
```

MVP 必须实现：

```text
selectCase
inspectCase
revealHiddenTag
shipCase
returnCase
endShift
```

三楼预留：

```text
buyTagForCase
sellTagFromCase
```

### 1.4 FlowOutcome

```ts
type FlowOutcome = "success" | "failure" | "mixed" | "neutral";
```

判定规则：

```text
outcome == "failure" => 出货失误
```

押金变化仍由 `depositDelta` 决定。

### 1.5 CallbackDelay

```ts
type CallbackDelay = 0 | 1 | 2 | "final";
```

MVP 支持：

```text
0：同班即时回单，关闭即时反馈后进入 CALLBACK_REVIEW
1：下一班开始时回单
2：两班后回单
"final"：结局前进入 FINAL_CALLBACK_REVIEW
```

### 1.6 CallbackStatus

```ts
type CallbackStatus = "pending" | "ready" | "resolved";
```

### 1.7 UnprocessedCasePolicy

```ts
type UnprocessedCasePolicy = "block_end" | "auto_return" | "ignore";
```

MVP 推荐：

```text
block_end 或 auto_return
```

`ignore` 不推荐，用于 Debug 或特殊班次。

### 1.8 PerformanceRuleType

```ts
type PerformanceRuleType =
  | "min_shipped_cases"
  | "max_returned_cases"
  | "required_cases_processed";
```

MVP 不支持“按回单成功数检查班次绩效”，因为多数回单是延迟到后续班次才结算。

### 1.9 RunStatus

```ts
type RunStatus = "not_started" | "active" | "completed" | "failed";
```

---

## 2. 通用结构

### 2.1 ActionCost

```ts
interface ActionCost {
  investigationPoints?: number;
  marketActionPoints?: number;
  timeSeconds?: number;
}
```

字段含义：

| 字段 | 类型 | 说明 |
|---|---:|---|
| `investigationPoints` | number | 调查机会消耗，用于扒底、揭标 |
| `marketActionPoints` | number | 三楼行动点消耗，MVP 默认隐藏 |
| `timeSeconds` | number | 限时班次消耗，MVP 默认关闭 |

负数表示消耗，例如：

```json
{ "investigationPoints": -1 }
```

### 2.2 ActionCostMap

```ts
type ActionCostMap = Partial<Record<ActionId, ActionCost>>;
```

### 2.3 ResourceState

```ts
interface ResourceState {
  investigationPoints: number;
  marketActionPoints?: number;
  timeRemainingSeconds?: number | null;
}
```

MVP 必需字段：

```text
investigationPoints
```

### 2.4 LocalizedText

MVP 直接使用中文字符串，不强制多语言。

```ts
type LocalizedText = string;
```

---

## 3. gameConfig.json

### 3.1 用途

定义新局默认参数、默认操作成本、默认资源、起始班次和兜底结局。

### 3.2 Interface

```ts
interface GameConfig {
  id: string;
  version: string;
  title: string;
  firstShiftId: string;
  defaultEndingId: string;

  initialDepositTags: number;
  maxDepositTags: number;

  defaultShiftResources: ResourceState;
  defaultActionCosts: ActionCostMap;

  mvpFlags: {
    enableMarketActions: boolean;
    enableRealTimer: boolean;
    enableSave: boolean;
  };
}
```

### 3.3 示例

```json
{
  "id": "life_tag_trial_mvp",
  "version": "0.3.0",
  "title": "人生标签交易所：试用期",
  "firstShiftId": "shift_01_orientation",
  "defaultEndingId": "ending_probation_extended",
  "initialDepositTags": 5,
  "maxDepositTags": 5,
  "defaultShiftResources": {
    "investigationPoints": 2,
    "marketActionPoints": 0,
    "timeRemainingSeconds": null
  },
  "defaultActionCosts": {
    "inspectCase": { "investigationPoints": -1 },
    "revealHiddenTag": { "investigationPoints": -1 },
    "shipCase": {},
    "returnCase": {},
    "endShift": {}
  },
  "mvpFlags": {
    "enableMarketActions": false,
    "enableRealTimer": false,
    "enableSave": false
  }
}
```

### 3.4 校验规则

1. `firstShiftId` 必须存在。
2. `defaultEndingId` 必须存在。
3. `initialDepositTags > 0`。
4. `maxDepositTags >= initialDepositTags`。
5. `mvpFlags.enableSave` 在 MVP 中必须为 `false`。

---

## 4. tags.json

### 4.1 用途

定义所有可引用标签，包括正面标签和底标使用的标签。

### 4.2 Interface

```ts
interface TagDef {
  id: string;
  displayName: string;
  description?: string;
  category?: "visible" | "hidden" | "both";
  uiTone?: "normal" | "risk" | "valuable" | "strange";
}
```

### 4.3 示例

```json
[
  {
    "id": "tag_young",
    "displayName": "年轻",
    "category": "visible",
    "uiTone": "valuable"
  },
  {
    "id": "tag_elite_school",
    "displayName": "名校",
    "category": "visible",
    "uiTone": "valuable"
  },
  {
    "id": "tag_resume_padding",
    "displayName": "履历注水",
    "category": "hidden",
    "uiTone": "risk"
  }
]
```

### 4.4 校验规则

1. `id` 唯一。
2. `displayName` 非空。
3. 被 `Case.visibleTagIds[]` 与 `Case.hiddenTags[].tagId` 引用的标签必须存在。

---

## 5. flows.json

### 5.1 用途

定义人生流向。

### 5.2 Interface

```ts
interface FlowDef {
  id: string;
  displayName: string;
  shortName?: string;
  description: string;
  buyerName?: string;
  pendingText?: string;
  uiIcon?: string;
  uiTone?: string;
}
```

### 5.3 示例

```json
[
  {
    "id": "flow_big_company",
    "displayName": "大厂流向",
    "shortName": "大厂",
    "description": "标准化用人体系。偏好年轻、名校、能加班、抗压。",
    "buyerName": "大厂收购站",
    "pendingText": "背调中",
    "uiTone": "corporate"
  },
  {
    "id": "flow_startup",
    "displayName": "创业流向",
    "shortName": "创业",
    "description": "高压低保障用人体系。偏好能加班、低薪接受、抗压。",
    "buyerName": "创业孵化厂",
    "pendingText": "签单审核中",
    "uiTone": "pressure"
  }
]
```

### 5.4 校验规则

1. `id` 唯一。
2. `displayName` 非空。
3. 被 `Shift.availableFlowIds[]` 或 `Case.availableFlowIds[]` 引用的流向必须存在。

---

## 6. Case Schema

### 6.1 用途

`Case` 是手工设计的核心内容单位。每个案件包含正面标签、底标、底细、可出货流向、各流向预设结果、退货结果。

### 6.2 Interface

```ts
interface CaseDef {
  id: string;
  caseNo: string;
  displayName: string;
  summaryText: string;

  designedForShiftId?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;

  visibleTagIds: string[];
  hiddenTags: HiddenTagEntry[];
  backgroundText: string;

  availableFlowIds: string[];
  flowResults: Record<string, FlowResult>;
  returnResult: ReturnResult;

  ui?: {
    cardTone?: string;
    portraitKey?: string;
    stampText?: string;
  };

  authorNotes?: string;
}
```

### 6.3 HiddenTagEntry

```ts
interface HiddenTagEntry {
  id: string;
  tagId: string;
  revealText?: string;
  order: number;
}
```

字段说明：

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 案件内底标条目 ID，例如 `hidden_a17_resume_padding` |
| `tagId` | string | 是 | 引用 `tags.json` 中的标签 ID |
| `revealText` | string | 否 | 揭标时显示的文字；缺省时显示标签名 |
| `order` | number | 是 | ordered 揭标模式下的揭露顺序 |

### 6.4 FlowResult

```ts
interface FlowResult {
  outcome: FlowOutcome;
  immediateText: string;
  callbackDelay: CallbackDelay;
  callbackText: string;
  longTermText?: string;
  depositDelta: number;
  resultTags?: string[];
  debugNote?: string;
}
```

字段说明：

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `outcome` | FlowOutcome | 是 | `failure` 表示出货失误 |
| `immediateText` | string | 是 | 出货后立即显示的反馈 |
| `callbackDelay` | CallbackDelay | 是 | 回单延迟 |
| `callbackText` | string | 是 | 买家回单正文 |
| `longTermText` | string | 否 | 长期回响，可在回单中附带显示 |
| `depositDelta` | number | 是 | 回单确认时应用的押金变化 |
| `resultTags` | string[] | 否 | 最终报告展示用标签，不参与规则计算 |
| `debugNote` | string | 否 | 给测试和策划看的备注，不显示给玩家 |

### 6.5 ReturnResult

```ts
interface ReturnResult {
  immediateText: string;
  depositDelta: number;
  debugNote?: string;
}
```

字段说明：

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `immediateText` | string | 是 | 退货后显示的反馈 |
| `depositDelta` | number | 是 | 退货时应用的押金变化，MVP 通常为 0 |
| `debugNote` | string | 否 | 给测试和策划看的备注 |

### 6.6 Case JSON 示例

```json
{
  "id": "case_a17_young_elite",
  "caseNo": "A-17",
  "displayName": "年轻名校案",
  "summaryText": "履历干净得像刚洗过。",
  "designedForShiftId": "shift_01_orientation",
  "difficulty": 1,
  "visibleTagIds": ["tag_young", "tag_elite_school"],
  "hiddenTags": [
    {
      "id": "hidden_a17_resume_padding",
      "tagId": "tag_resume_padding",
      "revealText": "【履历注水】",
      "order": 1
    }
  ],
  "backgroundText": "三段实习都只持续两周。推荐信的语气和模板库高度相似。",
  "availableFlowIds": ["flow_big_company", "flow_startup", "flow_traffic"],
  "flowResults": {
    "flow_big_company": {
      "outcome": "failure",
      "immediateText": "买家已接收档案，要求进入背调。",
      "callbackDelay": 1,
      "callbackText": "背调发现履历注水。本次出货失误。",
      "longTermText": "系统备注：背书标签不可替代背调流程。",
      "depositDelta": -1,
      "resultTags": ["背调失败"]
    },
    "flow_startup": {
      "outcome": "success",
      "immediateText": "买家备注：学历可以重写，工时不能少。",
      "callbackDelay": 1,
      "callbackText": "买家完成签单。本次出货成立。",
      "depositDelta": 0,
      "resultTags": ["签单成立"]
    },
    "flow_traffic": {
      "outcome": "mixed",
      "immediateText": "流量池将该案标记为“学历泡沫受害者”。",
      "callbackDelay": "final",
      "callbackText": "短期发酵成功，后续被平台降权。",
      "longTermText": "交易所备注：已完成结算，不承担后续叙事责任。",
      "depositDelta": 0,
      "resultTags": ["短期发酵", "后续降权"]
    }
  },
  "returnResult": {
    "immediateText": "案卷退回仓储区。",
    "depositDelta": 0
  },
  "ui": {
    "cardTone": "clean",
    "stampText": "待背调"
  },
  "authorNotes": "教学用案件：正面标签很诱人，但底细暗示履历风险。"
}
```

### 6.7 Case 校验规则

1. `id` 唯一。
2. `caseNo` 非空。
3. `displayName` 非空。
4. `summaryText` 非空。
5. `visibleTagIds` 至少 1 个。
6. `visibleTagIds[]` 必须存在于 `tags.json`。
7. `hiddenTags[].id` 在单个案件内唯一。
8. `hiddenTags[].tagId` 必须存在于 `tags.json`。
9. `hiddenTags[].order` 必须为正整数。
10. `backgroundText` 非空。
11. `availableFlowIds` 至少 1 个。
12. `availableFlowIds[]` 必须存在于 `flows.json`。
13. `flowResults` 必须覆盖所有 `availableFlowIds`。
14. `flowResults` 中每个 key 必须是合法 flowId。
15. 每个 `FlowResult.outcome` 必须合法。
16. 每个 `FlowResult.callbackDelay` 必须合法。
17. 每个 `FlowResult.depositDelta` 必须是数字。
18. `returnResult` 必须存在。
19. `returnResult.depositDelta` 必须是数字。

---

## 7. Shift Schema

### 7.1 用途

`Shift` 是固定关卡单位。它定义本班案件、资源、可用操作、可用流向、特殊规则和班次绩效要求。

### 7.2 Interface

```ts
interface ShiftDef {
  id: string;
  order: number;
  displayName: string;
  introText: string;
  objectiveText: string;
  summaryTitle?: string;

  caseIds: string[];
  nextShiftId?: string | null;

  availableActionIds: ActionId[];
  availableFlowIds: string[];

  resources: ResourceState;
  actionCosts?: ActionCostMap;

  rules: ShiftRules;
  performanceRules?: PerformanceRule[];

  marketText?: string;
  tutorialText?: string;
  ui?: {
    backgroundKey?: string;
    boardTitle?: string;
  };
}
```

### 7.3 ShiftRules

```ts
interface ShiftRules {
  unprocessedCasePolicy: UnprocessedCasePolicy;
  hiddenTagRevealMode: "ordered" | "player_choice";
  requiresInspectionBeforeShipping: boolean;
  requiresRevealBeforeShipping: boolean;
  performancePenaltyCap: number;
  allowEndShiftWhenCallbacksPending?: boolean;
}
```

字段说明：

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `unprocessedCasePolicy` | UnprocessedCasePolicy | 是 | 收班时未处理案件如何处理 |
| `hiddenTagRevealMode` | string | 是 | 揭标顺序模式，MVP 默认 `ordered` |
| `requiresInspectionBeforeShipping` | boolean | 是 | 出货前是否必须扒底 |
| `requiresRevealBeforeShipping` | boolean | 是 | 出货前是否必须揭标 |
| `performancePenaltyCap` | number | 是 | 本班绩效扣罚上限，MVP 推荐 1 |
| `allowEndShiftWhenCallbacksPending` | boolean | 否 | 是否允许还有跟单中案件时收班，MVP 默认 true |

### 7.4 PerformanceRule

```ts
interface PerformanceRule {
  id: string;
  type: PerformanceRuleType;
  target: number;
  depositDelta: number;
  failText: string;
  passText?: string;
}
```

字段说明：

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 规则 ID |
| `type` | PerformanceRuleType | 是 | 绩效规则类型 |
| `target` | number | 是 | 目标值 |
| `depositDelta` | number | 是 | 未达成时押金变化，通常为 -1 |
| `failText` | string | 是 | 未达成时显示文本 |
| `passText` | string | 否 | 达成时显示文本 |

规则解释：

```text
min_shipped_cases：本班出货数必须 >= target
max_returned_cases：本班退货数必须 <= target
required_cases_processed：本班处理案件数必须 >= target
```

处理案件数包括：

```text
出货案件 + 手动退货案件 + 自动退货案件
```

### 7.5 Shift JSON 示例

```json
{
  "id": "shift_01_orientation",
  "order": 1,
  "displayName": "第一班：入职窗口",
  "introText": "二楼批发区九点开门。你的工位在回单管道旁边。",
  "objectiveText": "处理 4 个案件，保住押金标签。",
  "summaryTitle": "第一班收班记录",
  "caseIds": [
    "case_a17_young_elite",
    "case_b09_stable_body",
    "case_c04_emotion_clean",
    "case_d12_overtime_ready"
  ],
  "nextShiftId": "shift_02_background",
  "availableActionIds": [
    "selectCase",
    "inspectCase",
    "shipCase",
    "returnCase",
    "endShift"
  ],
  "availableFlowIds": [
    "flow_big_company",
    "flow_startup",
    "flow_marriage",
    "flow_traffic"
  ],
  "resources": {
    "investigationPoints": 2,
    "marketActionPoints": 0,
    "timeRemainingSeconds": null
  },
  "actionCosts": {
    "inspectCase": { "investigationPoints": -1 },
    "shipCase": {},
    "returnCase": {}
  },
  "rules": {
    "unprocessedCasePolicy": "block_end",
    "hiddenTagRevealMode": "ordered",
    "requiresInspectionBeforeShipping": false,
    "requiresRevealBeforeShipping": false,
    "performancePenaltyCap": 1,
    "allowEndShiftWhenCallbacksPending": true
  },
  "performanceRules": [
    {
      "id": "perf_shift01_min_ship_2",
      "type": "min_shipped_cases",
      "target": 2,
      "depositDelta": -1,
      "failText": "本班出货数量不足。押金标签扣除 1 枚。",
      "passText": "本班出货数量达标。"
    }
  ],
  "marketText": "今日行情：名校标签仍被高估。",
  "tutorialText": "扒底能看到软信息，但不会直接告诉你答案。",
  "ui": {
    "backgroundKey": "office_floor_2_day",
    "boardTitle": "二楼批发区"
  }
}
```

### 7.6 Shift 校验规则

1. `id` 唯一。
2. `order` 唯一且为正整数。
3. `displayName` 非空。
4. `introText` 非空。
5. `objectiveText` 非空。
6. `caseIds` 至少 1 个。
7. `caseIds[]` 必须存在于 `cases.json`。
8. `nextShiftId` 如存在，必须存在于 `shifts.json`。
9. `availableActionIds[]` 必须是合法 `ActionId`。
10. `availableFlowIds[]` 必须存在于 `flows.json`。
11. `resources.investigationPoints` 必须是非负数字。
12. `rules.unprocessedCasePolicy` 合法。
13. `rules.hiddenTagRevealMode` 合法。
14. `rules.performancePenaltyCap` 必须是非负整数。
15. `performanceRules[].type` 必须合法。
16. `performanceRules[].depositDelta` 必须是数字。
17. 本班每个案件至少存在 1 个可显示出货流向。

---

## 8. endings.json

### 8.1 用途

定义普通结局。失败结局由 `RUN_FAILED` 直接显示，可以不放在 `endings.json` 中，也可以配置为单独结局文本。

### 8.2 Interface

```ts
interface EndingDef {
  id: string;
  priority: number;
  title: string;
  reportHeader?: string;
  bodyText: string;
  conditions: EndingConditions;
  resultTags?: string[];
}

interface EndingConditions {
  minDepositTags?: number;
  maxDepositTags?: number;
  requiredRunStatus?: RunStatus;
  minCompletedShifts?: number;
  maxFailedShipments?: number;
  maxPerformancePenalties?: number;
}
```

### 8.3 示例

```json
[
  {
    "id": "ending_regularized_operator",
    "priority": 10,
    "title": "转为正式操盘员",
    "reportHeader": "试用期归档报告",
    "bodyText": "系统建议：转为正式操盘员。备注：保留原名，便于签署后续责任豁免文件。",
    "conditions": {
      "requiredRunStatus": "active",
      "minDepositTags": 4,
      "minCompletedShifts": 5,
      "maxFailedShipments": 1
    },
    "resultTags": ["在册员工", "可继续签署"]
  },
  {
    "id": "ending_probation_extended",
    "priority": 100,
    "title": "延长试用",
    "reportHeader": "试用期归档报告",
    "bodyText": "系统建议：延长试用。备注：押金尚存，但处理记录不足以完成转正。",
    "conditions": {
      "requiredRunStatus": "active",
      "minDepositTags": 1
    },
    "resultTags": ["临时操盘员", "继续观察"]
  }
]
```

### 8.4 结局选择规则

1. 只在 `depositTags.current > 0` 时选择普通结局。
2. 按 `priority` 从小到大排序。
3. 选择第一条满足 `conditions` 的结局。
4. 如果没有结局满足，使用 `GameConfig.defaultEndingId`。

---

## 9. PlayerState Schema

### 9.1 用途

`PlayerState` 是运行时状态，只存在于内存中。MVP 不存档、不持久化。

### 9.2 Interface

```ts
interface PlayerState {
  runId: string;
  runStatus: RunStatus;
  phase: GamePhase;

  currentShiftId: string | null;
  currentShiftOrder: number;
  completedShiftIds: string[];

  depositTags: {
    current: number;
    max: number;
  };

  resources: ResourceState;

  selectedCaseId: string | null;
  activeCaseIds: string[];
  runtimeCases: Record<string, RuntimeCaseState>;

  pendingCallbacks: PendingCallback[];
  readyCallbackIds: string[];

  stats: PlayerStats;
  lastActionResult: ActionResult | null;
  finalReport: FinalReport | null;

  eventLog: GameEvent[];
  turnIndex: number;
}
```

### 9.3 RuntimeCaseState

```ts
interface RuntimeCaseState {
  caseId: string;
  status: CaseRuntimeStatus;

  backgroundRevealed: boolean;
  revealedHiddenTagIds: string[];

  addedTagIds: string[];
  removedTagIds: string[];

  shippedToFlowId?: string | null;
  shippedAtShiftId?: string | null;
  shippedAtShiftOrder?: number | null;
  outcome?: FlowOutcome | null;

  returnedAtShiftId?: string | null;
  returnedAtShiftOrder?: number | null;
  autoReturned?: boolean;

  callbackResolvedAtShiftId?: string | "final" | null;
}
```

MVP 中 `addedTagIds` 与 `removedTagIds` 默认保持空数组，用于后续进货 / 甩货预留。

### 9.4 PendingCallback

```ts
interface PendingCallback {
  id: string;
  caseId: string;
  flowId: string;
  outcome: FlowOutcome;

  callbackText: string;
  longTermText?: string;
  depositDelta: number;
  resultTags?: string[];

  createdAtShiftId: string;
  createdAtShiftOrder: number;
  dueShiftOrder: number | "final";

  status: CallbackStatus;
  resolvedAtShiftOrder?: number | "final" | null;
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `id` | 回单运行时 ID |
| `caseId` | 对应案件 |
| `flowId` | 出货流向 |
| `outcome` | 预设结果 |
| `callbackText` | 买家回单正文 |
| `longTermText` | 长期回响 |
| `depositDelta` | 确认回单时应用的押金变化 |
| `resultTags` | 最终报告展示用标签，不参与规则计算 |
| `dueShiftOrder` | 到期班次，或 `final` |
| `status` | `pending` / `ready` / `resolved` |

### 9.5 PlayerStats

```ts
interface PlayerStats {
  casesSelected: number;
  casesInspected: number;
  hiddenTagsRevealed: number;
  casesShipped: number;
  casesReturned: number;
  casesAutoReturned: number;
  callbacksResolved: number;
  failedShipments: number;
  performancePenalties: number;
  depositLostTotal: number;
}
```

统计规则：

```text
failedShipments：确认 outcome == "failure" 的回单时 +1。
depositLostTotal：每次 depositDelta < 0 时累加绝对值。
```

### 9.6 ActionResult

```ts
interface ActionResult {
  ok: boolean;
  actionId: ActionId | string;
  message: string;
  detailText?: string;
  caseId?: string;
  flowId?: string;
  resourceDeltas?: Partial<ResourceState>;
  depositDelta?: number;
  nextPhaseAfterClose?: GamePhase;
  errors?: string[];
}
```

`nextPhaseAfterClose` 用于明确关闭结果弹窗后的目标阶段。

### 9.7 GameEvent

```ts
interface GameEvent {
  id: string;
  turnIndex: number;
  phase: GamePhase;
  shiftId?: string | null;
  caseId?: string | null;
  actionId?: string | null;
  eventType: string;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}
```

事件日志只用于 Debug、复盘和最终报告，不用于正式存档。

### 9.8 FinalReport

```ts
interface FinalReport {
  endingId: string;
  title: string;
  reportHeader?: string;
  bodyText: string;
  depositTagsRemaining: number;
  completedShiftCount: number;
  stats: PlayerStats;
  resultTags?: string[];
}
```

### 9.9 PlayerState 示例

```json
{
  "runId": "run_20260614_001",
  "runStatus": "active",
  "phase": "SHIFT_ACTIVE",
  "currentShiftId": "shift_01_orientation",
  "currentShiftOrder": 1,
  "completedShiftIds": [],
  "depositTags": {
    "current": 5,
    "max": 5
  },
  "resources": {
    "investigationPoints": 1,
    "marketActionPoints": 0,
    "timeRemainingSeconds": null
  },
  "selectedCaseId": "case_a17_young_elite",
  "activeCaseIds": ["case_a17_young_elite", "case_b09_stable_body"],
  "runtimeCases": {
    "case_a17_young_elite": {
      "caseId": "case_a17_young_elite",
      "status": "INSPECTED",
      "backgroundRevealed": true,
      "revealedHiddenTagIds": [],
      "addedTagIds": [],
      "removedTagIds": [],
      "shippedToFlowId": null,
      "shippedAtShiftId": null,
      "shippedAtShiftOrder": null,
      "outcome": null,
      "returnedAtShiftId": null,
      "returnedAtShiftOrder": null,
      "autoReturned": false,
      "callbackResolvedAtShiftId": null
    }
  },
  "pendingCallbacks": [],
  "readyCallbackIds": [],
  "stats": {
    "casesSelected": 1,
    "casesInspected": 1,
    "hiddenTagsRevealed": 0,
    "casesShipped": 0,
    "casesReturned": 0,
    "casesAutoReturned": 0,
    "callbacksResolved": 0,
    "failedShipments": 0,
    "performancePenalties": 0,
    "depositLostTotal": 0
  },
  "lastActionResult": null,
  "finalReport": null,
  "eventLog": [],
  "turnIndex": 3
}
```

### 9.10 PlayerState 初始化规则

新局初始化：

```ts
PlayerState = {
  runId: generateRunId(),
  runStatus: "active",
  phase: "RUN_INIT",
  currentShiftId: null,
  currentShiftOrder: 0,
  completedShiftIds: [],
  depositTags: {
    current: gameConfig.initialDepositTags,
    max: gameConfig.maxDepositTags
  },
  resources: clone(gameConfig.defaultShiftResources),
  selectedCaseId: null,
  activeCaseIds: [],
  runtimeCases: {},
  pendingCallbacks: [],
  readyCallbackIds: [],
  stats: zeroPlayerStats(),
  lastActionResult: null,
  finalReport: null,
  eventLog: [],
  turnIndex: 0
}
```

---

## 10. 简化 JSON Schema

本节给编程 Agent 写校验器使用。MVP 不要求完全实现 JSON Schema Draft 标准，但必须覆盖 `required`、类型、枚举和跨表引用。

### 10.1 CaseDef 简化 Schema

```json
{
  "type": "object",
  "required": [
    "id",
    "caseNo",
    "displayName",
    "summaryText",
    "visibleTagIds",
    "hiddenTags",
    "backgroundText",
    "availableFlowIds",
    "flowResults",
    "returnResult"
  ],
  "properties": {
    "id": { "type": "string" },
    "caseNo": { "type": "string" },
    "displayName": { "type": "string" },
    "summaryText": { "type": "string" },
    "designedForShiftId": { "type": "string" },
    "difficulty": { "type": "number", "enum": [1, 2, 3, 4, 5] },
    "visibleTagIds": { "type": "array", "items": { "type": "string" } },
    "hiddenTags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "tagId", "order"],
        "properties": {
          "id": { "type": "string" },
          "tagId": { "type": "string" },
          "revealText": { "type": "string" },
          "order": { "type": "number" }
        }
      }
    },
    "backgroundText": { "type": "string" },
    "availableFlowIds": { "type": "array", "items": { "type": "string" } },
    "flowResults": { "type": "object" },
    "returnResult": {
      "type": "object",
      "required": ["immediateText", "depositDelta"],
      "properties": {
        "immediateText": { "type": "string" },
        "depositDelta": { "type": "number" },
        "debugNote": { "type": "string" }
      }
    }
  }
}
```

### 10.2 FlowResult 简化 Schema

```json
{
  "type": "object",
  "required": [
    "outcome",
    "immediateText",
    "callbackDelay",
    "callbackText",
    "depositDelta"
  ],
  "properties": {
    "outcome": {
      "type": "string",
      "enum": ["success", "failure", "mixed", "neutral"]
    },
    "immediateText": { "type": "string" },
    "callbackDelay": {
      "oneOf": [
        { "type": "number", "enum": [0, 1, 2] },
        { "type": "string", "enum": ["final"] }
      ]
    },
    "callbackText": { "type": "string" },
    "longTermText": { "type": "string" },
    "depositDelta": { "type": "number" },
    "resultTags": { "type": "array", "items": { "type": "string" } },
    "debugNote": { "type": "string" }
  }
}
```

### 10.3 ShiftDef 简化 Schema

```json
{
  "type": "object",
  "required": [
    "id",
    "order",
    "displayName",
    "introText",
    "objectiveText",
    "caseIds",
    "availableActionIds",
    "availableFlowIds",
    "resources",
    "rules"
  ],
  "properties": {
    "id": { "type": "string" },
    "order": { "type": "number" },
    "displayName": { "type": "string" },
    "introText": { "type": "string" },
    "objectiveText": { "type": "string" },
    "summaryTitle": { "type": "string" },
    "caseIds": { "type": "array", "items": { "type": "string" } },
    "nextShiftId": { "type": ["string", "null"] },
    "availableActionIds": { "type": "array", "items": { "type": "string" } },
    "availableFlowIds": { "type": "array", "items": { "type": "string" } },
    "resources": {
      "type": "object",
      "required": ["investigationPoints"],
      "properties": {
        "investigationPoints": { "type": "number" },
        "marketActionPoints": { "type": "number" },
        "timeRemainingSeconds": { "type": ["number", "null"] }
      }
    },
    "actionCosts": { "type": "object" },
    "rules": {
      "type": "object",
      "required": [
        "unprocessedCasePolicy",
        "hiddenTagRevealMode",
        "requiresInspectionBeforeShipping",
        "requiresRevealBeforeShipping",
        "performancePenaltyCap"
      ],
      "properties": {
        "unprocessedCasePolicy": {
          "type": "string",
          "enum": ["block_end", "auto_return", "ignore"]
        },
        "hiddenTagRevealMode": {
          "type": "string",
          "enum": ["ordered", "player_choice"]
        },
        "requiresInspectionBeforeShipping": { "type": "boolean" },
        "requiresRevealBeforeShipping": { "type": "boolean" },
        "performancePenaltyCap": { "type": "number" },
        "allowEndShiftWhenCallbacksPending": { "type": "boolean" }
      }
    },
    "performanceRules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "target", "depositDelta", "failText"],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "type": "string",
            "enum": [
              "min_shipped_cases",
              "max_returned_cases",
              "required_cases_processed"
            ]
          },
          "target": { "type": "number" },
          "depositDelta": { "type": "number" },
          "failText": { "type": "string" },
          "passText": { "type": "string" }
        }
      }
    }
  }
}
```

### 10.4 PlayerState 简化 Schema

```json
{
  "type": "object",
  "required": [
    "runId",
    "runStatus",
    "phase",
    "currentShiftId",
    "currentShiftOrder",
    "completedShiftIds",
    "depositTags",
    "resources",
    "selectedCaseId",
    "activeCaseIds",
    "runtimeCases",
    "pendingCallbacks",
    "readyCallbackIds",
    "stats",
    "lastActionResult",
    "finalReport",
    "eventLog",
    "turnIndex"
  ],
  "properties": {
    "runId": { "type": "string" },
    "runStatus": {
      "type": "string",
      "enum": ["not_started", "active", "completed", "failed"]
    },
    "phase": {
      "type": "string",
      "enum": [
        "APP_BOOT",
        "TITLE",
        "RUN_INIT",
        "SHIFT_START",
        "CALLBACK_REVIEW",
        "SHIFT_ACTIVE",
        "ACTION_RESULT",
        "SHIFT_SUMMARY",
        "FINAL_CALLBACK_REVIEW",
        "ENDING_BUILD",
        "ENDING_DISPLAY",
        "RUN_FAILED"
      ]
    },
    "currentShiftId": { "type": ["string", "null"] },
    "currentShiftOrder": { "type": "number" },
    "completedShiftIds": { "type": "array", "items": { "type": "string" } },
    "depositTags": {
      "type": "object",
      "required": ["current", "max"],
      "properties": {
        "current": { "type": "number" },
        "max": { "type": "number" }
      }
    },
    "resources": { "type": "object" },
    "selectedCaseId": { "type": ["string", "null"] },
    "activeCaseIds": { "type": "array", "items": { "type": "string" } },
    "runtimeCases": { "type": "object" },
    "pendingCallbacks": { "type": "array" },
    "readyCallbackIds": { "type": "array", "items": { "type": "string" } },
    "stats": { "type": "object" },
    "lastActionResult": { "type": ["object", "null"] },
    "finalReport": { "type": ["object", "null"] },
    "eventLog": { "type": "array" },
    "turnIndex": { "type": "number" }
  }
}
```

---

## 11. 编程 Agent 实现要求

### 11.1 不得硬编码内容

以下内容必须来自 JSON：

```text
班次
案件
标签
流向
回单文本
结局文本
```

### 11.2 可以硬编码的内容

以下内容可以在代码中作为枚举或常量：

```text
GamePhase
CaseRuntimeStatus
ActionId
FlowOutcome
CallbackDelay 合法值
PerformanceRuleType
```

### 11.3 MVP 不做存档

不得把 `PlayerState` 自动写入：

```text
localStorage
sessionStorage
IndexedDB
后端 API
```

Debug 导出 JSON 只能作为手动复制文本，不属于正式存档。

### 11.4 写作 Agent 输出要求

写作 Agent 生成案件时，必须至少输出：

```text
Case.id
Case.caseNo
Case.displayName
Case.summaryText
Case.visibleTagIds
Case.hiddenTags
Case.backgroundText
Case.availableFlowIds
Case.flowResults
Case.returnResult
```

写作 Agent 生成班次时，必须至少输出：

```text
Shift.id
Shift.order
Shift.displayName
Shift.introText
Shift.objectiveText
Shift.caseIds
Shift.availableActionIds
Shift.availableFlowIds
Shift.resources
Shift.rules
```

不得在文本中使用未登记的标签 ID 或流向 ID。
