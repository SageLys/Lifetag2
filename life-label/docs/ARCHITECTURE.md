# 架构（ARCHITECTURE）

重构后的分层架构。依赖方向严格单向：

```
data → core →（presentation / input）→ app
```

- 上层可依赖下层；下层**绝不**依赖上层。
- `core` 平台无关，可在无浏览器/Canvas 环境运行（Node + Vitest），为日后移植 Unity C# 做准备。

## 分层职责

### data 层（`src/data/`）——平台无关
JSON 内容的加载、索引、类型、schema、跨表校验。
- `GameDataTypes.ts` — 所有 JSON 实体的 TypeScript 接口。
- `GameDataLoader.ts` — `loadGameData()`，**唯一** JSON 入口（fetch）。
- `GameDataIndex.ts` — `indexGameData()`，按 id 建索引（唯一建索引处）。
- `GameDataValidator.ts` — `validateGameData()`，跨表与字段校验，错误即阻止启动。
- `schema.ts` — schema 词表（合法 action id / outcome / callbackDelay / timeoutPolicy）与
  `resolveShiftTimerConfig()`（限时解析），**数据层权威来源**；core 由此派生（core → data）。

### core 层（`src/core/`）——平台无关，禁止 Canvas/DOM/ViewState/动画/Toast/鼠标/rAF
规则引擎与状态。
- `model/` — `PlayerState`、`GameEnums`、`TendencyState`、`RuntimeCaseState`、`CallbackState`、`Stats`、`GameReports`。纯类型 + 工厂，可独立 JSON 序列化。
- `protocol/` — `GameCommand`、`GameEvent`、`CommandResult`（见 COMMAND_EVENT_PROTOCOL.md）。
- `GameEngine.ts` — 唯一对外接口 `dispatch(command): CommandResult`；编排 systems。
- `StateMachine.ts` — `applyPhase`（相位 + 计时器联动）、`formatTime`、`isTerminalCaseStatus`。
- `GameContext.ts` — 静态数据上下文（config / index / endings）。
- `systems/` — 按领域拆分：Run / Shift / CaseAction / Callback / Deposit / Tendency / Timer / Performance / Ending。

### presentation 层（`src/presentation/`）——只读 core 状态 + 处理 core 事件
- `ViewState.ts` — 纯表现状态（卡位/翻转/拖拽视觉/动画进度/Toast/标宝气泡/行情偏移…），与 PlayerState 分离。
- `PresentationController.ts` — 消费 `GameEvent` 触发表现（翻面/盖章/退货动画/押金效果/Toast/标宝/buildScene）。
- `animation/AnimationSystem.ts` — 基于 deltaTime 推进动画；**绘制不推进时间**。
- `canvas/` — `CanvasContext`、`VisualTheme`、`CanvasLayout`（几何 + `buildHitMap`）、`CanvasRenderer`、`RenderContext`、`components/`、`effects/`、`screens/`。渲染只读。

### input 层（`src/input/`）——把操作转成 core 命令
- `HitTest` / `HitMap` — 显式命中区域（由 `CanvasLayout.buildHitMap` 提供），取代"绘制时写 clickTargets"。
- `DragController` — 拖拽只更新视觉；放下只提交命令，被引擎拒绝则弹回。
- `PointerInput` / `KeyboardInput` — 事件 → 命令。输入不直接改 PlayerState、不自行判断出货成功。

### app 层（`src/app/`）——连接各层
- `GameController.ts` — 唯一改 PlayerState 的途径是 `engine.dispatch`；把输入动作翻译成命令，把事件交给 PresentationController；提供只读规则查询（守卫）供渲染。
- `GameLoop.ts` — 固定帧序：`dt → 提交时间更新(PlayerState) → 更新动画(ViewState) → 表现帧更新 → 应用变换 → 渲染 → 下一帧`。
- `GameApp.ts` — 装配各层并启动。
- `src/main.ts` — 仅获取 Canvas、创建并启动应用、处理顶层错误。

## 数据流（一次玩家操作）
```
鼠标/键盘 → input(命中/拖拽) → GameController.submit(command)
        → GameEngine.dispatch → systems 改 PlayerState、产出 events
        → CommandResult{state, events, ok}
        → PresentationController.handleEvents(events) 改 ViewState（动画/Toast/标宝）
        → GameLoop 下一帧：AnimationSystem 推进 ViewState → CanvasRenderer 只读渲染
```

## 不变量
- 规则只在 core；presentation/input **不得**直接改 PlayerState/tendency/押金/案件/相位。
- 渲染只读；动画推进只在 AnimationSystem（deltaTime 驱动）。关闭动画不影响规则结果。
- tendency 系统唯一定义来源：`src/core/model/TendencyState.ts`。
- 限时解析、schema 词表唯一来源：`src/data/schema.ts`。
- 案件终止状态、GamePhase、ActionId 唯一来源：`src/core/model/GameEnums.ts`（ActionId 值派生自 data/schema）。

详见 docs/MODULE_BOUNDARIES.md、docs/COMMAND_EVENT_PROTOCOL.md、docs/UNITY_MIGRATION_GUIDE.md、docs/TESTING.md。
