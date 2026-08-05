# Unity / C# 移植指南（UNITY_MIGRATION_GUIDE）

本项目分层即为移植做准备：`core` 平台无关，可几乎 1:1 翻译为 C#；表现/输入按 Unity 习惯重写。

## 可直接移植（core，平台无关）
- `src/core/model/*` → C# 类/结构体（PlayerState、TendencyState、Stats、RuntimeCaseState、CallbackState、GameReports、GameEnums）。
- `src/core/protocol/*` → C# 命令/事件类型（建议 sealed class + 模式匹配，或 struct + enum 标签）。
- `src/core/systems/*`、`GameEngine`、`StateMachine`、`GameContext` → 同名类，逻辑逐行对应。
- `src/data/*`（类型、索引、校验、schema、限时解析）→ C# 模型 + Newtonsoft/JsonUtility 反序列化 + 校验器。

移植要点：
- 引擎是纯函数式核心：`CommandResult Dispatch(GameCommand cmd)`，内部改 `State`、收集 `List<GameEvent>`。
- 无随机性、无时间依赖影响判定（`Date.now()` 仅用于 runId；`Math.random()` 只在 presentation 的标宝台词，不在 core）。因此可用 fixtures 做跨语言一致性校验。
- 深拷贝 `clone`：JS 用 `JSON.parse(JSON.stringify())`；C# 用序列化深拷贝或手写。

## 需在 Unity 侧重写（presentation / input / app）
- 渲染：`src/presentation/canvas/*` 是 Canvas 2D 绘制，C# 端改为 Unity UI / Sprite / 自绘。保留 `ViewState`、`PresentationController`（事件→表现）、`AnimationSystem`（deltaTime）这套**结构**。
- 输入：`src/input/*` 改为 Unity 的指针/拖拽；保留"输入→命令、命中区由布局提供、放下提交命令、拒绝弹回"的模式。
- 主循环：Unity 用 `Update(deltaTime)`，顺序同 `GameLoop`：先 `engine.Dispatch(Tick(dt))`，再推进动画，再渲染。

## 跨平台一致性测试（fixtures）
`tests/fixtures/*.json` 为纯数据场景（命令序列 + 期望终态快照）：
```json
{ "name": "...", "description": "...", "commands": [ {"type":"startRun"}, ... ], "expect": { "phase":"...", "deposit":5, "tendencies":{...}, ... } }
```
C# 端实现同一引擎后，读取这些 JSON、回放 `commands`、对最终状态取相同 `expect` 快照字段做断言，即可验证移植与 TS 版行为一致。快照字段定义见 `tests/core/helpers.ts` 的 `snapshot()`。

8 个场景：inspect_case / reveal_hidden_tag / successful_shipment / failed_callback / tendency_accumulation / timeout_shift / successful_run（完整成功）/ failed_run（完整失败）。

## tendency 系统（务必完整保留）
- 6 个 ID、名称、PlayerState.tendencies、tendencyDeltas、累计规则（仅出货/退货）、主导判断（≥3）、结局条件（minTendency/maxTendency）、失败报告（TENDENCY_FAILURE_INFO）——全部在 `core/model/TendencyState.ts`，移植时一并搬运，勿删改语义。详见 DATA_SCHEMA.md。
