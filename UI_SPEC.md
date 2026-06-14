# UI_SPEC.md — 人生标签交易所：试用期（Canvas 渲染版）

*给 Claude Code 的界面规格文档。颜色、字体基础定义另见 VISUAL_STYLE.md，Canvas 版本的覆盖规则见本文 §1.3。*

*优先级：本文档 > VISUAL_STYLE.md（视觉部分）；TECH_SPEC.md > 本文档（机制部分）。*

---

## 1. 强制渲染架构约束（最高优先级，不可妥协）

### 1.1 渲染方式

```
所有游戏内容使用 Canvas 2D API 渲染。
禁止使用任何 HTML DOM 元素作为游戏 UI。
HTML 文件只有一个 <canvas> 标签，铺满全屏。
禁止使用：<div> <button> <input> <p> <img>（游戏内容部分）
```

HTML 结构仅允许：

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #2A2017; overflow: hidden; }
    canvas { display: block; }
  </style>
  <!-- 字体加载 link 标签（允许） -->
</head>
<body>
  <canvas id="game"></canvas>
  <script src="game.js"></script>
  <!-- 或内嵌 <script> -->
</body>
</html>
```

### 1.2 空间布局约束

```
游戏场景是固定的桌面俯视图，坐标系在 Canvas 内管理。
禁止 DOM 文档流布局，所有对象用 x, y, width, height 坐标定位。
场景不可滚动，viewport 锁死。
```

基准分辨率：**1280 × 720**。Canvas 元素铺满 window，通过 `ctx.scale(scaleX, scaleY)` 自适应缩放：

```javascript
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scaleX = window.innerWidth / 1280;
  scaleY = window.innerHeight / 720;
}
window.addEventListener('resize', resize);
resize();
```

所有坐标值均以 **1280 × 720 基准坐标系**书写，渲染时自动缩放。

### 1.3 视觉基础约束（覆盖 VISUAL_STYLE.md 对应项）

```
背景色（桌面）：#2A2017（深棕木质桌面，覆盖 VISUAL_STYLE §2.1 主背景色）
纸张底色：#D4C5A9（绝不使用纯白 #FFFFFF，覆盖 VISUAL_STYLE §2.1 案件卡色）
主字体（文件内容）：'Courier New'（系统字体，用于案件内容区域）
UI 数字字体：'Press Start 2P'（像素字体，用于押金数量、倒计时、班次编号）
所有文件对象有 1–3 度的随机旋转角和投影（见 §4.1）
自定义鼠标样式：默认手形，持有文件时抓取形（见 §7）
```

VISUAL_STYLE.md 中的颜色体系（标签语义色、流向品牌色、品牌红等）**继续有效**，在 Canvas 中以 `ctx.fillStyle` / `ctx.strokeStyle` 形式使用。

### 1.4 交互约束

```
核心操作是拖拽（mousedown → mousemove → mouseup），不是点击表单。
禁止使用 HTML 原生 tooltip、alert、confirm。
所有提示信息在 Canvas 内绘制。
```

---

## 2. 画布坐标系与场景分区

所有坐标以 1280 × 720 基准坐标系定义：

```
(0,0)──────────────────────────────────────(1280,0)
│  STATUS BAR                          (y:0–52)    │
│  [品牌+吉祥物] [班次] [行情字幕] [押金标签]        │
├────────────────────────────────────────────────────┤
│  CASE     │                           │  TRACKING  │
│  STACK    │   DESK AREA               │   BOARD    │
│  (w:196)  │   (w:752)                 │   (w:332)  │
│  x:0      │   x:196                   │   x:948    │
│  y:52–622 │   y:52–622                │   y:52–622 │
│           │   [当前案件展开在此]        │            │
│           │   [操作标签 tab 在卡底部]   │            │
│  [退货箱]  │                           │            │
│  y:560–622│                           │            │
├───────────┴───────────────────────────┴────────────┤
│  FLOW ZONES                          (y:622–720)   │
│  [大厂 x:8] [创业 x:326] [婚恋 x:644] [流量 x:962] │
└──────────────────────────────────────────────────(1280,720)
```

精确分区定义：

| 分区 | x | y | w | h | 说明 |
|------|---|---|---|---|------|
| Status Bar | 0 | 0 | 1280 | 52 | 状态栏 |
| Case Stack | 0 | 52 | 196 | 570 | 来货案件堆栈 |
| Return Box | 12 | 562 | 172 | 54 | 退货箱（在堆栈区底部） |
| Desk Area | 196 | 52 | 752 | 570 | 主工作台 |
| Tracking Board | 948 | 52 | 332 | 570 | 跟单板 |
| 大厂 Zone | 8 | 626 | 310 | 88 | 流向目标区 |
| 创业 Zone | 326 | 626 | 310 | 88 | 流向目标区 |
| 婚恋 Zone | 644 | 626 | 310 | 88 | 流向目标区 |
| 流量 Zone | 962 | 626 | 310 | 88 | 流向目标区 |

---

## 3. 绘制层级（Draw Order）

每帧按以下顺序绘制，后绘制的内容覆盖先绘制的内容：

```
Layer 0：桌面背景（#2A2017 填充全画布）
Layer 1：分区底纹（各区域的底层填充色和边框线）
Layer 2：Flow Zones（四个流向托盘，含高亮状态）
Layer 3：Tracking Board 内容（跟单条目列表）
Layer 4：Case Stack 内容（叠放的案件纸堆，最多显示 3 张边角）
Layer 5：Return Box（退货箱图标）
Layer 6：Status Bar 内容（最后画，确保覆盖在最顶层）
Layer 7：Desk Area 中的当前案件（案件卡展开态）
Layer 8：拖拽中的案件（始终在最顶层，跟随鼠标位置）
Layer 9：动画叠加层（盖章印记、飞出标签、押金扣除动画等）
Layer 10：Tooltip 文字（如有，绘制在最上层）
```

---

## 4. 核心场景对象绘制规格

### 4.1 桌面基础渲染

```javascript
// 桌面背景
ctx.fillStyle = '#2A2017';
ctx.fillRect(0, 0, 1280, 720);

// 各分区底纹（轻微深浅区分）
// Case Stack 区：略浅
ctx.fillStyle = '#31271A';
ctx.fillRect(0, 52, 196, 570);

// Desk Area：稍浅，中心感
ctx.fillStyle = '#2E2315';
ctx.fillRect(196, 52, 752, 570);

// Tracking Board：略暗，像壁挂板
ctx.fillStyle = '#251D10';
ctx.fillRect(948, 52, 332, 570);

// 分区间隔线（细深线）
ctx.strokeStyle = '#1A1208';
ctx.lineWidth = 1.5;
// 绘制竖向分隔线
```

### 4.2 案件卡（Case Card）

案件卡是画在 Canvas 上的纸张对象，携带随机旋转角和投影。

**基础绘制函数：**

```javascript
function drawCaseCard(ctx, card, state) {
  const { x, y, w, h, rotation } = card;

  ctx.save();

  // 旋转中心 = 卡片中心
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotation * Math.PI / 180);

  // 投影（Papers Please 风格：偏左下方的硬阴影）
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = state === 'dragging' ? 18 : 6;
  ctx.shadowOffsetX = state === 'dragging' ? 5 : 3;
  ctx.shadowOffsetY = state === 'dragging' ? 8 : 4;

  // 纸张底色
  ctx.fillStyle = '#D4C5A9';
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fill();

  // 关闭阴影（后续内容不带阴影）
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // 顶部红色横条（品牌红，高 28px）
  ctx.fillStyle = '#D32F2F';
  ctx.fillRect(-w / 2, -h / 2, w, 28);

  // 顶条左侧文字
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '9px "Noto Sans SC"';
  ctx.fillText('人生标签交易所 批发区档案', -w / 2 + 8, -h / 2 + 17);

  // 顶条右侧案件编号
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '9px "Courier New"';
  ctx.textAlign = 'right';
  ctx.fillText(card.id, w / 2 - 8, -h / 2 + 17);
  ctx.textAlign = 'left';

  // 案件名称
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 18px "Courier New"';
  ctx.fillText(card.name, -w / 2 + 12, -h / 2 + 56);

  // 分隔线
  ctx.strokeStyle = '#B8A88A';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 10, -h / 2 + 66);
  ctx.lineTo(w / 2 - 10, -h / 2 + 66);
  ctx.stroke();
  ctx.setLineDash([]);

  // 档案摘要
  ctx.fillStyle = '#424242';
  ctx.font = '11px "Courier New"';
  wrapText(ctx, card.summary, -w / 2 + 12, -h / 2 + 82, w - 24, 16);

  // 标签区（见 §4.3）
  drawLabels(ctx, card.labels, card.bottomLabels, -w / 2 + 12, -h / 2 + 130, w - 24);

  // 底部操作标签页（见 §4.4）
  if (state === 'active') {
    drawCardTabs(ctx, card, -w / 2, h / 2 - 28, w);
  }

  ctx.restore();
}
```

**旋转角规则：**
- 案件堆中的卡片：随机 ±3° 旋转，在 `cases_data.json` 加载时生成，每张卡片固定
- 当前展开在桌面上的卡片：旋转角范围缩小至 ±1°（仍有轻微歪斜）
- 拖拽中的卡片：快速线性插值回到 ±0.5° 范围（拖起时更正）

**尺寸规格（基准坐标系）：**
- 叠放在堆栈中（缩略）：w=160, h=100（仅显示顶条+名称）
- 展开在工作台（完整）：w=480, h=340，居中在 Desk Area

### 4.3 标签挂牌（Label Tags）

在案件卡上绘制的彩色挂牌。

```javascript
function drawLabel(ctx, text, x, y, type) {
  const colors = getLabelColors(type); // 见下方颜色表
  const w = Math.min(ctx.measureText(text).width + 20, 110);
  const h = 24;

  // 挂牌背景
  ctx.fillStyle = colors.bg;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();

  // 挂牌边框
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 顶部小圆孔（装饰）
  ctx.fillStyle = colors.border;
  ctx.beginPath();
  ctx.arc(x + w / 2, y, 3, 0, Math.PI * 2);
  ctx.fill();

  // 文字
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 10px "Noto Sans SC"';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + 14);
  ctx.textAlign = 'left';
}
```

标签颜色对照（类型 → 颜色，见 VISUAL_STYLE.md §2.3）：

| type | bg | border | text |
|------|----|--------|------|
| temporal（年龄/时间） | #FBE9E7 | #F4511E | #BF360C |
| capability（能力/工作） | #E3F2FD | #1E88E5 | #0D47A1 |
| trait（个性/特征） | #E8F5E9 | #43A047 | #1B5E20 |
| social（社会/形象） | #F3E5F5 | #8E24AA | #4A148C |
| risk（风险/雷区） | #FFEBEE | #E53935 | #B71C1C |
| viral（流量/情绪） | #FCE4EC | #F06292 | #880E4F |
| hidden（底标未揭示） | #EEEEEE | #9E9E9E | #757575（显示"?"） |
| revealed-low | #FFEBEE | #EF9A9A | #C62828 |
| revealed-mid | #FFCDD2 | #E53935 | #B71C1C |
| revealed-high | #C62828 | #B71C1C | #FFFFFF |

### 4.4 案件卡操作标签页（Card Action Tabs）

绘制在案件卡底部，像文件夹分页标签。仅当案件卡为当前展开态（active）时显示。

每个 Tab：宽约 100px，高 28px，圆角上方两角，绘制在卡片底边。

```
[  ▽ 扒底  ] [  ⬡ 揭标 ×N  ] [  ✕ 退货  ]
```

绘制规格：
- 背景色：`#B8A88A`（略深于纸张色，表示"标签页"），悬停时 `#A09070`
- 字体：`11px "Courier New"`，`#3A2E1A`
- 图标字符 + 文字组合
- `揭标` Tab 右上角角标显示剩余次数 `×N`，`Press Start 2P` 字体 9px 红色 `#C62828`
- 已使用的操作（扒底已翻面/揭标用尽）：Tab 变灰 `#8A7A68`，文字淡化，不响应点击

**Tab 命中检测**：
- 计算每个 Tab 在画布坐标系中的实际矩形（考虑卡片的旋转和位移）
- 使用 inverse transform 将鼠标坐标转换到卡片本地坐标系再检测

### 4.5 流向目标区（Flow Zones）

四个流向托盘绘制在画布底部。

**常态绘制：**

```javascript
function drawFlowZone(ctx, zone, state) {
  const { x, y, w, h, name, color, icon } = zone;

  // 托盘底部背景（略深于桌面，像凹进去的托盘）
  ctx.fillStyle = darken(color, 0.4);  // 流向色压暗 40%
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  // 托盘顶部高光条（3px，模拟立体感）
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 3);

  // 流向名称（ZCOOL KuaiLe，大字，白色）
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '15px "ZCOOL KuaiLe"';
  ctx.textAlign = 'center';
  ctx.fillText(name, x + w / 2, y + 38);

  // 副文字（状态描述）
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '9px "Noto Sans SC"';
  ctx.fillText(zone.statusText, x + w / 2, y + 58);

  ctx.textAlign = 'left';

  // 流向图标（简笔 SVG path，白色线条，见 §4.5.1）
  drawFlowIcon(ctx, zone.type, x + 14, y + 14, 20);
}
```

**高亮态**（拖拽案件悬停在此区域时）：
- 背景亮度提升：原色直接填充（不压暗）
- 外边框：`ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;`
- 顶部显示 `"放入 [流向名]"` 提示文字（Press Start 2P 10px 白色）

**无可用案件时**：`ctx.globalAlpha = 0.4`，绘制后恢复

**§4.5.1 流向图标（Canvas 简笔路径）：**

所有图标用 `stroke`（`fill: none; stroke: white; stroke-width: 1.5; lineCap: round`）绘制，尺寸约 20×20px：

- 大厂：方形外框 + 内部 3×2 小矩形格（办公楼窗口）
- 创业：三角形火箭体 + 底部两侧小翼
- 婚恋：两段弧线合并为心形（canvas 贝塞尔曲线）
- 流量：三段同心弧（Wi-Fi 信号形状）

### 4.6 状态栏（Status Bar）

绘制在画布最顶部，高 52px。背景：品牌红 `#D32F2F`。

从左到右：

```
[标宝图标 36px] [交易所名称] [班次信息] [━━ 行情字幕区 ━━] [押金标签 ×5]
```

**品牌区（x:0–220）：**
- 标宝图标 SVG 路径，高 36px，见 VISUAL_STYLE.md §6
- 文字：`人生标签交易所`（ZCOOL KuaiLe 15px 白色）+ `二楼批发区`（Courier New 9px 半透明白）

**班次区（x:220–360）：**
- `第 N 班`（Press Start 2P 11px 白色）
- `第 N 天`（Press Start 2P 9px 半透明白）
- 有计时时显示：`⏱ 04:32`（Press Start 2P 11px，<60s 时变行情金 `#F9A825`）

**行情字幕区（x:360–1020，黑色嵌入屏幕）：**
- 在状态栏内嵌一块 `#080C08` 背景矩形（y:8 到 y:44，共 36px 高，圆角 3px）
- 字幕内容用 `offsetX` 每帧递减实现横向滚动
- 格式：`【名校】▲ +15%　　【35+】▼ -8%　　`（循环）
- 颜色：上涨 `#00E676`，下跌 `#FF4444`，标签名 `#FFFFFF`
- 字体：`11px "Courier New"`

**押金区（x:1020–1280）：**
- 文字 `押金`（Noto Sans SC 10px 半透明白）
- 5 个押金图标（见 §4.7）横排，间距 4px

### 4.7 押金标签图标

在 Canvas 上绘制的小方形图标，尺寸 30×30px：

```javascript
function drawDepositIcon(ctx, x, y, state) {
  // 存在状态：品牌红背景 + 白色价签形状
  if (state === 'active') {
    ctx.fillStyle = '#D32F2F';
    roundRect(ctx, x, y, 30, 30, 4);
    ctx.fill();
    drawPriceTagShape(ctx, x + 4, y + 4, 22, 22, '#FFFFFF');
  }
  // 扣除状态：灰色背景 + 白色 ×
  else if (state === 'spent') {
    ctx.fillStyle = '#616161';
    roundRect(ctx, x, y, 30, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 22, y + 22);
    ctx.moveTo(x + 22, y + 8); ctx.lineTo(x + 8, y + 22);
    ctx.stroke();
  }
}
```

### 4.8 跟单板（Tracking Board）

绘制在右侧，模拟软木公告板，背景：`#1E1A0E`（深暗棕色）。

每条跟单条目像钉在板上的纸条：

```javascript
function drawTrackingItem(ctx, item, x, y, w) {
  // 纸条背景（轻微旋转，±1°）
  ctx.save();
  ctx.translate(x + w / 2, y + 18);
  ctx.rotate(item.rotation * Math.PI / 180);

  ctx.fillStyle = item.hasNewReceipt ? '#FFF9C4' : '#D4C5A9'; // 有新回单时用黄色
  roundRect(ctx, -w / 2, -18, w, 36, 2);
  ctx.fill();

  // 顶部流向色竖条（3px）
  ctx.fillStyle = item.destinationColor;
  ctx.fillRect(-w / 2, -18, 3, 36);

  // 图钉（顶部中心，小圆）
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(0, -18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#BBB';
  ctx.beginPath();
  ctx.arc(-0.5, -18.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // 文字
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 10px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(item.caseName + ' → ' + item.destinationName, 0, -6);

  ctx.fillStyle = item.hasNewReceipt ? '#C62828' : '#757575';
  ctx.font = '9px "Courier New"';
  ctx.fillText(item.hasNewReceipt ? '⚡ 回单已达' : '跟单中...', 0, 8);

  ctx.restore();
}
```

回单展开时：在跟单板上方叠加一张更大的纸条（y 偏移展开，见 §6.5）。

### 4.9 案件堆栈（Case Stack）

左侧来货区绘制叠放的案件文件，表示待处理队列：

- 最底层（第 3 张）：仅显示纸张边角，旋转 -3°
- 第 2 层：仅显示纸张边角，旋转 +2°
- 最顶层（第 1 张）：显示缩略卡（顶条 + 案件名），旋转 -1°
- 三层间有 4px 偏移

悬停在堆栈顶部卡时：卡片轻微上浮（y 减少 4px，阴影加深）

### 4.10 退货箱（Return Box）

绘制在堆栈区底部（x:12, y:562, w:172, h:54）：

- 图形：一个简笔箱子（方形 + 倾斜开口），Courier New 加上"退货"文字
- 背景：`#1A1208`（比桌面更深，像凹入的容器）
- 边框：`#8A7A68` 1px 虚线
- 悬停（或拖拽案件经过时）：边框变为 `#F9A825` 金色，显示"放入退货"提示

---

## 5. 拖拽交互系统

### 5.1 状态机

```
IDLE → [mousedown on case/stack] → HOLDING
HOLDING → [mousemove] → DRAGGING
DRAGGING → [mouseup over flow zone] → SHIPPING（出货动画）
DRAGGING → [mouseup over return box] → RETURNING（退货）
DRAGGING → [mouseup elsewhere] → SNAP_BACK（弹回原位）
SHIPPING/RETURNING → [动画完成] → IDLE
SNAP_BACK → [弹回完成] → IDLE
```

### 5.2 鼠标坐标转换

```javascript
function getCanvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / scaleX,
    y: (event.clientY - rect.top) / scaleY
  };
}
```

### 5.3 点击案件堆栈

- 点击堆栈顶部卡片：将该案件移至 Desk Area 中心展开（SLIDE_IN 动画，0.3s）
- 如 Desk Area 已有展开案件：当前案件先收回堆栈（SLIDE_OUT，0.2s），新案件再展开
- 展开时案件旋转角线性插值到 ±1° 范围（0.3s）

### 5.4 拖拽案件卡

- Mousedown on active case card：开始拖拽，记录拖拽偏移（dragOffsetX/Y）
- Mousemove：更新卡片位置为 `mousePos - dragOffset`，重绘
- 检测悬停目标：
  - 悬停在 Flow Zone：对应 Zone 高亮，cursor 变 `grabbing`
  - 悬停在 Return Box：Return Box 高亮
  - 其他：无高亮
- 拖拽中卡片：z 层级置最顶（Layer 8），阴影加深（见 §4.2）

### 5.5 操作 Tab 点击

```javascript
// 点击检测（在 mousedown 时执行，先于拖拽检测）
function hitTestCardTabs(mouseX, mouseY, card) {
  // 将鼠标坐标转换到卡片本地坐标系
  const localX = (mouseX - (card.x + card.w / 2)) * Math.cos(-card.rotation)
               + (mouseY - (card.y + card.h / 2)) * Math.sin(-card.rotation);
  const localY = -(mouseX - (card.x + card.w / 2)) * Math.sin(-card.rotation)
               + (mouseY - (card.y + card.h / 2)) * Math.cos(-card.rotation);
  // 检测 localX, localY 是否落在各 Tab 区域内
  // Tab 区域定义：相对于卡片中心的 x, y 范围
}
```

点击 `扒底 Tab`：触发翻面动画（§6.2）
点击 `揭标 Tab`：触发揭标动画（§6.3），可揭的底标数量 -1
点击 `退货 Tab` 或拖拽到 Return Box：执行退货逻辑

### 5.6 命中检测优先级

每帧 mousedown 时，按以下顺序检测（先命中先处理）：

1. 操作 Tabs（检测范围：当前活动案件卡的底部 Tab 区域）
2. 底标挂牌（"?" 标签可点击揭标，替代 Tab 点击的另一入口）
3. 活动案件卡整体（拖拽起点）
4. 案件堆栈顶部（点击展开新案件）
5. 跟单条目（点击展开/收起回单）

---

## 6. 核心动画规格

所有动画通过 `requestAnimationFrame` 游戏循环驱动，使用线性插值（lerp）或缓动函数。

### 6.1 盖章出货动画（无需确认，拖放即触发）

Papers Please 风格的核心操作反馈。在 `mouseup` 落入 Flow Zone 时立即触发。

**总时长：约 0.9s**

```
阶段 1（0–0.1s）：案件卡在落点位置稳定，轻微回弹（scale 1 → 1.02 → 1）
阶段 2（0.1–0.3s）：印章从流向区域上方出现，向下移动压向案件卡
   - 印章：圆形/方形（见下方各流向规格），流向色填充，60% 透明度
   - 起始位置：卡片上方 120px
   - 终止位置：卡片中央
   - 缓动：ease-in（加速压下）
阶段 3（0.3–0.45s）：印章"按压"
   - 印章 scale 1 → 1.2（向外扩散，ink 扩散感）
   - 同时：卡片上出现印章墨迹（半透明填充圆/方形，scale 0 → 1，0.15s）
   - 印章墨迹：流向色，透明度 0.45，绘制在卡片上（持续存在）
   - 墨迹内文字：流向名 + "已出货"（白色，ZCOOL KuaiLe 12px）
阶段 4（0.45–0.6s）：印章提起
   - 印章向上移动回流向区域方向，同时 opacity 0 → 0（消失）
阶段 5（0.6–0.9s）：案件卡飞出
   - 向出货流向对应方向滑出（大厂→右，创业→右下，婚恋→左，流量→上）
   - 带旋转：旋转角 ×3 放大，顺着飞出方向旋转
   - opacity 1 → 0
   - 对应 Flow Zone 短暂闪亮（brightness 高 → 正常，0.3s）
结束：案件加入跟单板
```

各流向印章样式：

| 流向 | 印章形状 | 颜色（70% opacity） | 印章文字 |
|------|---------|-------------------|---------|
| 大厂 | 方形圆角 | `#1565C0` | "企业专区 已接收" |
| 创业 | 不规则多边形（六边形）| `#E64A19` | "创业孵化 已入仓" |
| 婚恋 | 椭圆 | `#AD1457` | "婚恋配对 已登记" |
| 流量 | 圆形 | `#6A1B9A` | "流量变现 已投放" |

### 6.2 扒底翻面动画

**总时长：0.5s**

```
阶段 1（0–0.2s）：X 轴缩放 1 → 0（模拟向后翻转，透视压缩）
阶段 2（0.2s）：在 scaleX = 0 时切换内容（正面 → 背面/底细）
阶段 3（0.2–0.4s）：X 轴缩放 0 → 1（翻转完成）
阶段 4（0.4–0.8s）：底细文字逐字"打字机"出现，每字 30ms
```

背面内容：
- 纸张背景色 `#C8B89A`（略深于正面，表示"翻面"）
- 顶部印有"底 细"字样（Courier New Bold 14px `#5D4037`，居中）
- 底细文字：Ma Shan Zheng 12px，`#5D4037`，斜体，逐字出现
- 底部仍保留操作 Tabs

### 6.3 揭标动画

**总时长：0.45s**

点击 "?" 挂牌（或揭标 Tab）：

```
阶段 1（0–0.15s）："?" 挂牌向上移动 8px + scale 0.5 + opacity 0（消失）
阶段 2（0.15–0.45s）：真实底标挂牌从原位置 scale 0 → 1 + opacity 0 → 1（出现）
                       + 横向 shake（±4px，3 次，0.3s）
```

### 6.4 押金标签扣除动画

**总时长：0.7s**

```
阶段 1（0–0.1s）：对应押金图标 shake（±3px，2次）
阶段 2（0.1–0.5s）：图标 scale 1 → 1.3，然后 translateY -60px + opacity 0（飞出画布顶部）
阶段 3（0.5–0.7s）：灰色"×"占位图标 opacity 0 → 1（淡入替代）
                    右侧押金计数数字闪烁红色（#FF4444），0.5s 后恢复白色
```

### 6.5 买家回单展开动画

**总时长：0.3s**

跟单板上对应条目：

```
阶段 1：条目边框变金色（即时），图钉变金色
阶段 2（0–0.3s）：条目高度从 36px → 自适应（ease-out），展开显示回单纸条内容
```

回单纸条绘制：
- 背景 `#FEFEFE`（近白，与跟单板暗色形成对比）
- 顶底虚线边（`#BDBDBD`）
- Courier New 10px `#212121`，行高 1.8
- 关键词：`出货失误` / `押金标签 -` → `#C62828` + bold；`出货成立` → `#2E7D32` + bold

---

## 7. 自定义鼠标样式

通过 CSS 控制 `canvas` 元素的 `cursor` 属性，在 `mousemove` 事件中动态更新：

```javascript
canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasPos(e);

  if (dragState === 'DRAGGING') {
    canvas.style.cursor = 'grabbing';
  } else if (hitTestActiveCard(pos) || hitTestStackTop(pos)) {
    canvas.style.cursor = 'grab';
  } else if (hitTestCardTabs(pos)) {
    canvas.style.cursor = 'pointer';
  } else if (hitTestTrackingItem(pos)) {
    canvas.style.cursor = 'pointer';
  } else {
    canvas.style.cursor = 'default';
  }
});
```

| 状态 | cursor 值 |
|------|----------|
| 默认（无可交互对象） | `default` |
| 悬停案件卡 / 堆栈 | `grab` |
| 拖拽中 | `grabbing` |
| 悬停 Tab / 跟单条目 | `pointer` |

---

## 8. 字体加载与 Canvas 文字渲染

### 8.1 字体加载

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&family=Press+Start+2P&display=swap" rel="stylesheet">
```

*注：Courier New 为系统字体，无需加载。*

### 8.2 字体就绪检测

在游戏主循环开始前等待字体加载完成：

```javascript
document.fonts.ready.then(() => {
  initGame();
  requestAnimationFrame(gameLoop);
});
```

加载期间显示 Loading 画面（Canvas 上绘制品牌红背景 + "人生标签交易所" Courier New 20px 白色居中）。

### 8.3 Canvas 字体声明格式

```javascript
ctx.font = '9px "Courier New"';           // 案件编号
ctx.font = 'bold 18px "Courier New"';     // 案件名称
ctx.font = '11px "Courier New"';          // 档案摘要、回单
ctx.font = '15px "ZCOOL KuaiLe"';        // 流向名称、品牌
ctx.font = '12px "Ma Shan Zheng"';       // 底细文字
ctx.font = '11px "Press Start 2P"';      // 班次编号
ctx.font = '9px "Press Start 2P"';       // 押金计数、倒计时
ctx.font = 'bold 10px "Noto Sans SC"';   // 标签挂牌文字
```

*注意：使用前须确认字体已通过 `document.fonts.ready` 加载完成，否则 Canvas 会静默回退到 serif。*

---

## 9. 游戏状态数据结构

```javascript
const gameState = {
  // 进程
  currentShift: 1,
  currentDay: 1,
  timeRemaining: null,           // null = 本班无时限

  // 生存资源
  depositTags: 5,

  // 案件
  pendingCases: [],              // 待处理（来货区堆栈）
  activeCaseId: null,            // 当前展开在桌面上的案件 ID
  activeCardState: {             // 当前案件卡的 Canvas 状态
    x: 430, y: 120,             // 卡片在基准坐标系的左上角
    w: 480, h: 340,
    rotation: -0.8,             // 当前旋转角（度）
    isFlipped: false,
    revealedLabels: []
  },

  // 跟单
  trackingCases: [],
  receipts: {},

  // 拖拽状态机
  dragState: 'IDLE',            // IDLE / HOLDING / DRAGGING / SNAP_BACK / SHIPPING
  dragCard: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  hoveredZone: null,            // null / 'corp' / 'startup' / 'romance' / 'viral' / 'return'

  // 动画队列
  animations: [],               // [{type, startTime, params}]

  // 倾向档案
  tendencyLog: [],

  // 行情字幕
  marketTicker: { text: '', offsetX: 0 },
};
```

---

## 10. 禁止事项

### 禁止 DOM 元素用于游戏 UI
- 禁止 `<div>` `<button>` `<p>` `<span>` `<input>` `<img>` 用于任何游戏内容
- 禁止 CSS 为游戏 UI 设置样式（仅允许 `body { overflow: hidden }` 和 Canvas 基础样式）
- 禁止 HTML `<marquee>`（行情字幕使用 Canvas offsetX 动画实现）

### 禁止原生交互 API
- 禁止 `alert()` `confirm()` `prompt()`
- 禁止 HTML tooltip（`title` 属性）
- 禁止任何 HTML 原生弹窗机制

### 禁止存档
- 禁止 `localStorage` / `sessionStorage`

### 禁止网页布局思维
- 禁止用 CSS Flexbox / Grid 排布游戏对象
- 禁止 DOM 文档流影响游戏布局
- 所有位置以 Canvas 坐标系内的 `x, y, w, h` 定义

### 禁止重复渲染
- 禁止在 `mousemove` 中无限制地 `clearRect` + 重绘全部内容（应使用脏区域标记或固定帧率 loop）
- 游戏主循环使用 `requestAnimationFrame`，每帧完整重绘 Canvas
