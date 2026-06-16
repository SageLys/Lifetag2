# 结局分支设计文档
# 人生标签交易所：试用期

版本：v1.0  
适用对象：写作 Agent、编程 Agent、策划  
关联文件：`data/endings.json`、`TECH_SPEC.md §8`、`DATA_SCHEMA.md §8`

---

## 第一部分：倾向可达性统计

### 1.1 方法说明

对 21 个案件（7 班 × 平均 3 案，G 班 4 案），按"最大化该倾向"的打法逐案统计：
每案选择出货流向或退货操作中倾向增量最高的一个操作，累计得分即为该倾向全局理论上限。
退货记倾向时，手动退货（非收班自动退货）才累计。

### 1.2 统计结果

| 倾向 ID | 中文名 | 理论最大分 | 主要来源 | 备注 |
|---|---|---:|---|---|
| `cold_precision` | 冷血精准 | **20** | 出货到 startup / romance / downshift / self_employed / overseas | 仅 C-03（黑红体质）无任何 +cold_precision 出货路径 |
| `gambler_tendency` | 赌徒倾向 | **18** | 出货到对当前案件必然失误的流向（大厂/婚恋/体制/学术） | 但每次失误 depositDelta=-1，实际可达极低（≤8 左右）而不破产 |
| `traffic_instinct` | 流量嗅觉 | **18** | 出货到 flow_traffic 或 flow_knowledge_economy | A班/B班（前2班）无流量流向，从第3班起才可积累 |
| `residual_empathy` | 残余共情 | **14** | 手动退货（14个案件退货给 +1） | 大量退货触发绩效扣罚，实际可达约 8-10 |
| `endorsement_worship` | 背书崇拜 | **13** | 出货到大厂/体制/学术；D-01体制→+2，E-01学术→+2 | 两枚特殊 +2 需精确出货 |
| `over_caution` | 过度谨慎 | **10** | 手动退货（仅10个案件退货给 +1，其余给 residual_empathy） | 对应案件：A-02/03, B-02, C-02/03, D-01/02, E-02, F-02/03 |

### 1.3 设计推论

- **cold_precision / gambler / traffic**：上限高（18-20），阈值可设在 5-7 之间而不失公平。
- **residual_empathy / endorsement**：上限中等（13-14），阈值建议 4-5。
- **over_caution**：上限最低（10），阈值 ≥4 即要求退货超过 40%，已属高强度倾向表达，不宜再提高。
- 第一版倾向阈值**宜保守**：让玩家有合理机会触达，避免"绕了一整局发现没触发任何专属结局"的挫败感。

---

## 第二部分：结局分支设计

### 2.1 总体优先级逻辑

```
押金归零（RUN_FAILED，优先于一切，不进入 endings.json）
  ↓ 若未破产，进入 endings.json 判定：
优秀表现转正（priority 3 / 8）
  ↓ 不满足转正条件时：
强倾向专属结局（priority 20–70，主导倾向达阈值即触发）
  ↓ 无主导倾向时：
普通留用（priority 85）
  ↓ 兜底：
延长试用（priority 100，defaultEndingId）
```

**防护规则**：
- 押金只剩 1 枚不应触发"优秀转正"→ 转正结局要求 `minDepositTags ≥ 3`
- 押金只剩 1 枚但有强倾向→ 可触发倾向专属结局（这是设计内的黑色幽默：你险死，但系统觉得你有特色）
- 禁止出现"押金归零但仍走普通结局"→ 由 TECH_SPEC §8.1 保证

### 2.2 结局列表与触发条件

| 结局 ID | 标题 | priority | 关键触发条件 |
|---|---|---:|---|
| `run_failed` | **押金归零·档案流转** | ∞（RUN_FAILED 直接触发，不经 endings） | depositTags.current ≤ 0 |
| `ending_ace_operator` | A级转正 | 3 | minDeposit 4，全7班，maxFailed 1 |
| `ending_qualified_operator` | 标准转正 | 8 | minDeposit 3，全7班，maxFailed 3 |
| `ending_cold_precision` | 冷血精准·快速通道 | 20 | minDeposit 1，cold_precision ≥ 6 |
| `ending_gambler_tendency` | 赌徒倾向·免责协议 | 30 | minDeposit 1，gambler_tendency ≥ 5 |
| `ending_traffic_instinct` | 流量嗅觉·调三楼 | 40 | minDeposit 1，traffic_instinct ≥ 5 |
| `ending_endorsement_worship` | 背书崇拜·范围限定 | 50 | minDeposit 1，endorsement_worship ≥ 4 |
| `ending_over_caution` | 过度谨慎·调仓储 | 60 | minDeposit 1，over_caution ≥ 4 |
| `ending_residual_empathy` | 残余共情·不适配 | 70 | minDeposit 1，residual_empathy ≥ 4 |
| `ending_retained` | 留用观察 | 85 | minDeposit 2，全7班 |
| `ending_probation_extended` | 延长试用（兜底） | 100 | minDeposit 1 |

**阈值设计依据（相对于理论最大的百分比）**：
- cold_precision ≥ 6 / 20 = 30%
- gambler_tendency ≥ 5 / 18 = 28%
- traffic_instinct ≥ 5 / 18 = 28%
- endorsement_worship ≥ 4 / 13 = 31%
- over_caution ≥ 4 / 10 = 40%
- residual_empathy ≥ 4 / 14 = 29%

所有阈值在 28-40% 区间，第一版足够保守。

### 2.3 失败结局专项设计（RUN_FAILED）

失败结局不进入 `endings.json`，由 `RUN_FAILED` 状态直接显示。核心设计原则：

**玩家案件化**——本次试用期的核心叙事反转。
玩家处理了整局别人的案件；押金归零时，系统用同一套语言把玩家处理了。

结构：
1. 紧急通知头（Core 声音）：押金归零确认
2. 档案流转卡（伪·案件格式）：案件编号 T-00，初步标签，建议流向
3. 吉祥物附注（Shell 声音）：反差制造幽默

"案件编号 T-00" 中：T = 试用员，00 = 归零/终止，既是编号也是状态

初步可见标签设计（静态通用版，不需要代码分支）：
- 押金归零（客观事实标签）
- 七班次记录不完整（系统观察）
- 再就业意向待确认（带讽刺）

建议流向：**重新报到通道（暂存·等待下轮配置）**

---

## 第三部分：全部文案

### 3.0 失败结局（RUN_FAILED 状态）

> 此文案用于 RUN_FAILED 阶段的 UI 显示，不在 endings.json 中。  
> 建议硬编码在 game.html 中，或作为 gameConfig.json 的 `failureEndingText` 字段。

---

**【通知抬头】**  
押金标签归零处理通知 · 自动生成 · 不可申诉

---

**【正文】**

押金标签余额已核实为零。

依据《交易所试用期操作规程》第 4.3 条，押金标签归零即刻终止当前操盘员身份。剩余回单处理程序已中止。班次记录封存。

本轮试用期档案已移交内部流转。

---

**〔 档案流转通知单 〕**

```
案件编号：T-00
显示名称：押金归零案
档案摘要：试用期操盘员，押金标签于操作期间耗尽，
          七班次处理记录不完整。
```

**初步可见标签**

▸ 押金归零  
▸ 七班次记录存疑  
▸ 再就业意向待确认

**初步底标（已触发自动揭示）**

▸ 本人曾任操盘员（试用级）  
▸ 押金标签管理记录：不理想

**建议流向**

重新报到通道（暂存 · 等待下轮配置）

**买家回单（即时）**

收到 T-00 档案。  
试用操盘员身份核实完毕，原押金配额清零。  
重新报到后，将发放标准押金标签五枚。  
档案保留期：本轮。下轮开始时归档销毁。  
交易所备注：已完成结算，不承担本案后续叙事责任。

---

**〔 标宝附注 〕**

感谢您为人生流通作出贡献！  
押金归零属于正常流转节点，本交易所视此为统计数据的一部分。  
下一轮押金标签将于重新报到时发放，请放心。  
T-00 档案将在下轮开始时归档销毁——本交易所不留记录，但您可以留。

**〔 操作按钮 〕**：重新报到 / Restart

---

### 3.1 ending_ace_operator（A级转正）

```json
{
  "id": "ending_ace_operator",
  "priority": 3,
  "title": "卓越试用期记录 · 正式录用（A级）",
  "reportHeader": "试用期终期归档 · 优先级处理通道",
  "bodyText": "七班处理记录封存完毕。\n\n押金标签留存充足。出货失误次数在阈值以内。七班均已完成，无遗留未处理案件。调查机会使用记录未见违规。\n\n系统评定：转为正式操盘员，A级配置。\n\n建议：调入二楼批发区优先处理通道，配额独立，绩效评估周期延长。\n\n附注：原名予以保留，便于签署后续合同。首份附件为责任豁免协议（标准版），签署后生效，不签署亦可继续工作，但后续叙事责任由本人承担。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 4,
    "minCompletedShifts": 7,
    "maxFailedShipments": 1
  },
  "resultTags": ["在册操盘员·A级", "优先通道已开放", "豁免协议待签"]
}
```

**文案说明**：  
A 级转正应是最"正面"的结局，但后缀"豁免协议"已暗示这份工作对本人权益的冷漠。  
"不签亦可继续工作，但叙事责任由本人承担"——这是对全游戏主题的总结陈词。

---

### 3.2 ending_qualified_operator（标准转正）

```json
{
  "id": "ending_qualified_operator",
  "priority": 8,
  "title": "试用期评估通过 · 正式录用",
  "reportHeader": "试用期终期归档",
  "bodyText": "七班处理记录封存完毕。\n\n押金标签留存，出货失误次数未超过留用阈值。七班均已完成。\n\n系统评定：转为正式操盘员，标准配置。\n\n建议：继续处理二楼批发区常规案件。\n\n附注：原名予以保留。后续合同另行签署。责任豁免协议（标准版）已列入入职文件包，签署前可阅读，阅读不计时。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 3,
    "minCompletedShifts": 7,
    "maxFailedShipments": 3
  },
  "resultTags": ["在册操盘员", "试用期合格", "可继续配置"]
}
```

---

### 3.3 ending_cold_precision（冷血精准）

```json
{
  "id": "ending_cold_precision",
  "priority": 20,
  "title": "精准配置确认 · 冷血精准操盘员",
  "reportHeader": "操作倾向归档 · 冷血精准类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工在信息不完整的条件下出货次数高于同期均值。调查机会使用率低于标准水平。出货决策与案件可见标签高度相关，底细及底标信息对最终出货方向影响程度可忽略不计。\n\n本交易所将该操作模式归档为：冷血精准型。\n\n系统评定：转为正式操盘员，配置二楼批发区快速处理通道。\n\n建议：跳过扒底与揭标程序。快速处理通道不配备调查机会补给，因为系统评估该员工不需要。\n\n附注：高风险案件的处理损耗由快速通道的效率指标覆盖，本交易所不单独核算。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "cold_precision": 6 }
  },
  "resultTags": ["冷血精准·在册", "快速通道已开放", "调查豁免申请备案中"]
}
```

---

### 3.4 ending_gambler_tendency（赌徒倾向）

```json
{
  "id": "ending_gambler_tendency",
  "priority": 30,
  "title": "高风险操作记录备案通知",
  "reportHeader": "操作倾向归档 · 赌徒倾向类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工在信息不完整的条件下出货高风险流向的频次高于同期均值。押金扣损与出货失误存在直接关联。押金在此失误频率下仍有留存，属于统计意义上的偏右分布结果。\n\n本交易所将该操作模式归档为：赌徒倾向型。\n\n系统评定：予以留用，附加条件。\n\n建议：需于归档后五个工作日内签署额外免责协议（附件 7-C）。\n\n附注：附件 7-C 第三页第二段明确说明，本交易所对因同类判断导致的后续押金损耗不负额外连带责任。该附件的签署与否不影响本员工继续上班。本交易所感谢您自愿承担统计上的尾部风险。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "gambler_tendency": 5 }
  },
  "resultTags": ["赌徒倾向·已备案", "附件7-C待签署", "高风险账户标记"]
}
```

---

### 3.5 ending_traffic_instinct（流量嗅觉）

```json
{
  "id": "ending_traffic_instinct",
  "priority": 40,
  "title": "操盘员岗位调配通知 · 即时生效",
  "reportHeader": "操作倾向归档 · 流量嗅觉类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工出货流量相关流向的频次高于标准配置操盘员均值。对流量爆点及内容发酵周期的判断形成可记录数据，已纳入三楼岗位评估指标。\n\n本交易所将该操作模式归档为：流量嗅觉型。\n\n系统评定：调入三楼流量变现协作岗，负责内容案件二次分发与爆点识别辅助。即时生效。\n\n附注：调配生效后，本员工不再接触二楼批发区常规流向案件。此项调配为单向，不设返回通道。三楼的工作内容、薪资结构及叙事责任划分，本交易所在调配前不作说明，调配后亦不作说明，但可在内部系统中自行检索（检索成功率未知）。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "traffic_instinct": 5 }
  },
  "resultTags": ["流量嗅觉·在册", "已调三楼", "二楼接触权限终止"]
}
```

---

### 3.6 ending_endorsement_worship（背书崇拜）

```json
{
  "id": "ending_endorsement_worship",
  "priority": 50,
  "title": "操作风格备案说明 · 案件接触范围限定通知",
  "reportHeader": "操作倾向归档 · 背书崇拜类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工出货决策与案件可见标签中名校、大厂、党员、体制经历、海归背景等显性背书标签的相关度显著高于均值。调查机会使用率偏低。无显性背书案件的处理结果准确度未达标准线。\n\n本交易所将该操作模式归档为：背书崇拜型。\n\n系统评定：试用期通过，但操作风格存在已记录的系统性偏差。\n\n建议：予以留用，案件接触范围限定——仅处理包含至少两枚正向可见标签的案件，直至内部评估通过为止。\n\n附注：无显性背书案件的单独处理评估，时间另行通知。若超过三个月未收到通知，可向标宝询问，标宝将记录在案，并转交至"待处理意见队列"，该队列当前积压约四千七百条。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "endorsement_worship": 4 }
  },
  "resultTags": ["背书崇拜·已记录", "案件范围限定", "内部评估申请中（第4701号）"]
}
```

---

### 3.7 ending_over_caution（过度谨慎）

```json
{
  "id": "ending_over_caution",
  "priority": 60,
  "title": "岗位重新评估通知 · 出货效率不足",
  "reportHeader": "操作倾向归档 · 过度谨慎类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工手动退货次数高于同期均值，出货率低于标准配置操盘员水平。调查机会使用率正常，但信息采集与出货决策之间存在脱节记录。部分班次因出货数量不足触发绩效扣罚。\n\n本交易所将该操作模式归档为：过度谨慎型。\n\n系统评定：押金留存，但出货量不支撑正式操盘员配置。\n\n建议：暂不转正，调入三楼仓储区，负责案件预分拣与档案整理工作。\n\n附注：仓储区不设出货绩效考核，本交易所认为该岗位与当前操作风格的适配度较高。薪资差额补偿方案目前没有，后续是否设立，也目前没有。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "over_caution": 4 }
  },
  "resultTags": ["过度谨慎·已记录", "已调仓储区", "出货权限暂停"]
}
```

---

### 3.8 ending_residual_empathy（残余共情）

```json
{
  "id": "ending_residual_empathy",
  "priority": 70,
  "title": "适配性评估结果通知 · 二楼岗位不匹配",
  "reportHeader": "操作倾向归档 · 残余共情类",
  "bodyText": "七班操作记录整理完毕。\n\n系统检测：本员工在查阅案件底细或揭示底标之后的退货率显著高于均值。部分退货发生在已完成完整信息采集的案件上。该行为模式在常规操盘员中属于低频记录。\n\n本交易所将该操作模式归档为：残余共情型。\n\n系统评定：该操作模式与二楼批发区核心工作流程不完全兼容。\n\n建议：判定不适配二楼批发区现有岗位，建议转入其他部门。\n\n附注：其他部门的名称、职能及所在楼层，请通过内部系统自行查询。本交易所在确认转部门之前不对去向作说明；转部门通知将在适当时候发出，"适当时候"的定义不由本文件说明。本员工可继续在原工位等待，亦可选择不等待，此项选择不影响通知的发出时间。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1,
    "minTendency": { "residual_empathy": 4 }
  },
  "resultTags": ["残余共情·已记录", "二楼适配性不足", "转部门处理中（时间不详）"]
}
```

---

### 3.9 ending_retained（留用）

```json
{
  "id": "ending_retained",
  "priority": 85,
  "title": "试用期结束 · 予以留用",
  "reportHeader": "试用期归档报告",
  "bodyText": "七班处理记录封存完毕。\n\n押金标签留存，七班均已完成。出货失误次数未触发留用阈值上限，未检测到主导操作倾向。\n\n系统评定：处理记录正常，押金留存量支持留用决定，不满足转正阈值。\n\n建议：予以留用，下一观察周期继续评估。\n\n附注：操盘员编号维持临时状态。下一观察周期另行通知；通知将在"下一观察周期开始时"发出，该周期的具体时间请参见内部排期，内部排期的访问权限另行开放。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 2,
    "minCompletedShifts": 7
  },
  "resultTags": ["临时操盘员·留用", "下周期继续评估", "转正资格待定"]
}
```

---

### 3.10 ending_probation_extended（兜底·延长试用）

```json
{
  "id": "ending_probation_extended",
  "priority": 100,
  "title": "试用期未达评估标准 · 延长试用",
  "reportHeader": "试用期归档报告",
  "bodyText": "七班处理记录封存完毕。\n\n押金标签尚存，但综合评定未达留用或转正阈值。\n\n系统评定：不符合转正或留用条件，延长试用。\n\n建议：于下一班次开始前重新报到，押金标签重新发放，记录从零开始。\n\n附注：押金标签余额于本轮试用期结束时归零，下轮重新发放五枚。本交易所对上轮试用期的所有操作记录不予承认，亦不予追究。如本员工对延长试用有异议，可向标宝提出申诉；标宝将记录在案，并在下一个工作日将申诉移入"已记录不予处理"文件夹，该文件夹对所有人可见，已存档条目共 21,847 条。",
  "conditions": {
    "requiredRunStatus": "active",
    "minDepositTags": 1
  },
  "resultTags": ["临时操盘员", "延长观察", "申诉已记录（第21848号）"]
}
```

---

## 第四部分：实现注意事项

### 4.1 失败结局渲染

`RUN_FAILED` 状态的 UI 渲染建议：

1. **通知头**：红色或警示色背景，Core 声音，2-3 行即止。
2. **档案流转卡**：复用游戏内的案件卡样式，但案件编号为 `T-00`，标签区用不同颜色（如灰色）区分"系统生成标签"与"游戏内正常标签"。
3. **标宝附注**：小字，Shell 声音，最后一行，作为幽默落点。
4. **重启按钮**：唯一可操作项，文字建议"重新报到"而非"重新开始"。

### 4.2 结局倾向计算

`buildEnding()` 判定逻辑时，倾向条件 `minTendency` 使用"最高分倾向优先"逻辑：

```text
遍历 endings（按 priority 升序）
  → 检查 conditions.minTendency 中每个倾向是否满足
  → 满足所有列出的条件（AND 关系）才触发
  → 多个倾向同时达阈值时，priority 小的先触发
```

由于各倾向结局的 priority 不同（20/30/40/50/60/70），同一局游戏只会触发其中优先级最高的那个——这符合游戏设计意图（体现"主导倾向"）。

### 4.3 defaultEndingId

`gameConfig.json` 中 `defaultEndingId` 应设为 `"ending_probation_extended"`，确保任何未匹配情况都有兜底。

### 4.4 结局文案的 resultTags 说明

`resultTags` 仅用于最终报告展示，不参与规则计算。它们是玩家档案的最后一行"标签"，应具有：
- **可读性**：直白的中文，不超过 6 字
- **讽刺性**：如"申诉已记录（第21848号）"
- **与正文呼应**：不重复正文，而是提炼最荒诞的那个细节
