# 人生标签交易所：试用期

## 项目类型
单文件 HTML 游戏（game.html）。Canvas 2D 渲染，无任何框架。

## 规格文档（开始任何任务前必须阅读）
- docs/UI_SPEC.md — 布局、组件、动画、交互规格（最高优先级）
- docs/VISUAL_STYLE.md — 颜色、字体、视觉风格
- docs/TECH_SPEC.md — 游戏机制、状态机、操作规则
- docs/DATA_SCHEMA.md — 数据结构定义与校验规则
- docs/世界观设定与术语.md — 术语表与世界设定

## 游戏数据
data/ 目录下的 JSON 文件是游戏内容，程序启动时加载。
不得硬编码任何游戏内容（案件、班次、标签、流向、回单文本）。

## 最高优先级约束
- 渲染：所有游戏内容用 Canvas 2D API，禁止 DOM 元素作为游戏 UI
- HTML 只有一个 <canvas> 标签
- 核心交互：拖拽（mousedown→mousemove→mouseup），不是表单
- 背景色：#2A2017，纸张色：#D4C5A9
- 禁止 localStorage / sessionStorage / alert / confirm

## 输出目标
game.html（单文件，CSS 和 JS 内嵌）