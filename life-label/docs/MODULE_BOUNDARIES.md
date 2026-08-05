# 模块边界（MODULE_BOUNDARIES）

依赖方向：`data → core →（presentation / input）→ app`。下表给出每层**允许 / 禁止**。

| 层 | 允许依赖 | 禁止 |
|---|---|---|
| data | （无上层依赖） | 依赖 core/presentation/input/app；fetch 以外的 IO |
| core | data | Canvas、DOM、`window`、`document`、ViewState、动画、Toast、鼠标、`requestAnimationFrame`、字体、光标、`localStorage` |
| presentation | data、core（只读类型/状态/事件/纯函数） | 修改 PlayerState / 规则；调用 `engine.dispatch` |
| input | data、core（命令/守卫类型）、presentation（CanvasLayout/HitMap、ViewState） | 直接改 PlayerState；自行判定出货成败 |
| app | 全部 | 把规则写进 app（规则属于 core） |

## 关键边界约定

### core 绝不触碰表现
- core 不 import 任何 `src/presentation`、`src/input`、`src/app`、浏览器 API。
- 原 game.html 中混在规则里的 UI 副作用（翻面、盖章、Toast、标宝）已改为 `GameEvent`，由 presentation 订阅。

### 唯一权威实现（无重复定义）
| 概念 | 唯一来源 |
|---|---|
| tendency ID / 名称 / 增量 / 主导计算 / 失败报告数据 | `core/model/TendencyState.ts` |
| GamePhase / RunStatus / RuntimeCaseStatus / 终止状态集 / Outcome / CallbackDelay / CallbackStatus / TimeoutPolicy | `core/model/GameEnums.ts` |
| ActionId（类型与值） | 派生自 `data/schema.ts` 的 `VALID_ACTION_IDS`（`GameEnums` re-export） |
| schema 词表（合法 action/outcome/callbackDelay/timeoutPolicy） | `data/schema.ts` |
| 限时解析 `resolveShiftTimerConfig` | `data/schema.ts`（core 的 PlayerState re-export） |
| JSON 加载 | `data/GameDataLoader.ts`（唯一 fetch） |
| 按 id 索引 | `data/GameDataIndex.ts`（唯一建索引） |
| 数据校验 | `data/GameDataValidator.ts` |
| 规则（每个操作/系统） | `core/systems/*` 各一处 |
| 渲染（每个屏幕/组件） | `presentation/canvas/screens|components|effects/*` 各一处 |

### 状态分离
- **PlayerState**（core）：仅规则状态，可序列化，无浏览器对象。
- **ViewState**（presentation）：仅表现状态（卡位/动画/Toast/气泡/行情偏移/标宝触发标志）。
- 二者分开更新：GameLoop 先 `tick`(PlayerState) 再 `updateAnimations`(ViewState)。

### 输入边界
- 输入只产生 `GameCommand`，经 `GameController.submit` → `engine.dispatch`。
- 命中区来自 `CanvasLayout.buildHitMap`（显式），不存在"绘制时 push clickTargets"。
- 拖拽放下：合法性由引擎判断；`CommandResult.ok===false` 时 presentation/输入侧让卡片弹回。
