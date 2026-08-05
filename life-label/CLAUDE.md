# 人生标签交易所：试用期

## 项目类型
Vite + TypeScript + ES Module 的 Canvas 2D 游戏（已从单文件 game.html 重构为分层架构）。
无 UI 框架；Canvas 2D 渲染。运行：`npm run dev`；测试：`npm test`；类型检查：`npm run typecheck`。

## 架构（分层，依赖方向单向：data → core →（presentation / input）→ app）
- `src/data/` — JSON 加载、按 ID 索引、类型、schema 词表、跨表校验（平台无关）
- `src/core/` — 规则引擎与系统、命令/事件协议、状态模型（平台无关，**禁止** Canvas/DOM/动画/ViewState）
- `src/presentation/` — ViewState、PresentationController、AnimationSystem、Canvas 渲染（只读 core 状态）
- `src/input/` — 指针/键盘/拖拽 → 命令；命中区 HitMap（无"绘制时写 clickTargets"）
- `src/app/` — GameApp / GameController / GameLoop 装配各层；`src/main.ts` 仅启动
详见 docs/ARCHITECTURE.md、docs/MODULE_BOUNDARIES.md、docs/COMMAND_EVENT_PROTOCOL.md。

## 规格文档（开始任何任务前必须阅读）
- docs/ARCHITECTURE.md / MODULE_BOUNDARIES.md / COMMAND_EVENT_PROTOCOL.md — 重构后架构
- docs/UI_SPEC.md — 布局、组件、动画、交互规格
- docs/VISUAL_STYLE.md — 颜色、字体、视觉风格
- docs/TECH_SPEC.md — 游戏机制、状态机、操作规则
- docs/DATA_SCHEMA.md — 数据结构（含 tendency 数据、PlayerState、结局条件、报告字段）
- docs/TESTING.md — 测试与 fixtures；docs/UNITY_MIGRATION_GUIDE.md — 移植 C# 指南
- docs/世界观设定与术语.md — 术语表与世界设定

## 游戏数据
data/ 下的 JSON 是游戏内容，启动时加载（唯一入口 `src/data/GameDataLoader`）。
不得硬编码任何游戏内容（案件、班次、标签、流向、回单文本）。

## 最高优先级约束
- 渲染：所有游戏内容用 Canvas 2D API，禁止 DOM 元素作为游戏 UI
- HTML（index.html）只有一个 `<canvas>` 标签 + 模块入口
- 核心交互：拖拽（mousedown→mousemove→mouseup），不是表单
- 背景色：#2A2017，纸张色：#D4C5A9
- 禁止 localStorage / sessionStorage / alert / confirm
- tendency 系统完整保留，唯一定义来源 `src/core/model/TendencyState.ts`
- 规则只在 core；presentation/input 不得直接改 PlayerState
