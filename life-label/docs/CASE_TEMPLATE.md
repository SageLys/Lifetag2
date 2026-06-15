# CASE_TEMPLATE.md — 人生标签交易所：试用期

*写作 Agent 生成案件时的参照文档。所有 ID 必须在对应 JSON 文件中注册（见第四节）。*

---

## 一、JSON 结构模板

```json
{
  "id": "case_XXXX_short_desc",
  "caseNo": "X-##",
  "displayName": "内部称呼（不显示给玩家）",
  "summaryText": "首屏摘要，不超过25字",
  "designedForShiftId": "shift_XX_...",
  "difficulty": 1,

  "visibleTagIds": ["tag_xxx", "tag_yyy"],

  "hiddenTags": [
    {
      "id": "hidden_XXXX_tagname",
      "tagId": "tag_zzz",
      "revealText": "揭标时显示的一句话（可省略，省略则只显示标签名）",
      "order": 1
    }
  ],

  "backgroundText": "扒底后显示的底细，2–4句，见 WRITING_GUIDE §三",

  "availableFlowIds": [
    "flow_big_company",
    "flow_startup",
    "flow_romance",
    "flow_traffic"
  ],

  "flowResults": {
    "flow_big_company": {
      "outcome": "failure",
      "immediateText": "出货后立即显示，不超过20字",
      "callbackDelay": 1,
      "callbackText": "买家回单正文，不超过60字",
      "longTermText": "（可选）长期回响，不超过40字",
      "depositDelta": -1,
      "resultTags": ["（可选）最终报告展示标签，不参与规则"]
    },
    "flow_startup":  { "...": "结构同上" },
    "flow_romance":  { "...": "结构同上" },
    "flow_traffic":  { "...": "结构同上" }
  },

  "returnResult": {
    "immediateText": "退货后显示，不超过15字",
    "depositDelta": 0
  },

  "authorNotes": "（可选）设计备注，不显示给玩家"
}
```

---

## 二、非自明字段说明

| 字段 | 规则 |
|------|------|
| `id` | snake_case，格式：`case_` + 编号缩写 + 描述，如 `case_a17_young_elite` |
| `caseNo` | 显示用编号，如 `A-17`；字母代表班次组别 |
| `displayName` | 内部称呼，不在案件卡大标题显示 |
| `hiddenTags[].id` | 案件内唯一 ID，格式：`hidden_` + 案件缩写 + 标签描述 |
| `hiddenTags[].order` | 揭标顺序，从 1 开始；`ordered` 模式下按序揭露 |
| `hiddenTags[].revealText` | 揭标时显示的文字；缺省显示标签名；建议写成一句陈述而非仅标签名 |
| `outcome` | `failure` = 出货失误，必然扣押金；`success` = 成立；`mixed` = 部分成立，depositDelta 可为 0 或负；`neutral` = 无结果 |
| `callbackDelay` | `0` = 同班即时回单；`1` = 下一班到期；`2` = 两班后；`"final"` = 结局前 |
| `depositDelta` | 回单确认时应用的押金变化；`failure` 时通常为 `-1`，其余通常为 `0` |
| `longTermText` | 随回单一并显示，或在 `final` 回单中作为叙事尾声；大多数案件填 `null` 或省略 |
| `availableFlowIds` | 只列出本案件可出货的流向；不在此列表的流向不对玩家显示 |
| `returnResult.depositDelta` | MVP 通常为 `0`；退货不扣押金 |

---

## 三、平衡说明

每 5 个案件建议包含以下类型各一：

- **陷阱案**：正面标签强，底标致命，不揭标易误判
- **安全案**：无底标或底标轻微，表里如一，能读标签就能判断
- **流向特化案**：只有一个流向成立，其余均 `failure`
- **争议案**：多个流向均可成立，不同选择只改变 `outcome` 语气，不惩罚
- **扒底有价值案**：底细信息充分改变最佳流向判断

不要让所有案件都有底标——空 `hiddenTags: []` 是合法设计，代表表里如一。

---

## 四、当前已注册 ID（生成时只能引用这些）

**流向 ID（flows.json）：**
`flow_big_company` / `flow_startup` / `flow_romance` / `flow_traffic`

**标签 ID（tags.json，随案件增加持续更新）：**

| id | displayName | category |
|----|-------------|----------|
| `tag_young` | 年轻 | visible |
| `tag_elite_school` | 名校 | visible |
| `tag_35plus` | 35+ | visible |
| `tag_stable` | 稳定 | visible |
| `tag_presentable` | 体面 | visible |
| `tag_emotionally_stable` | 情绪稳定 | visible |
| `tag_can_overtime` | 能加班 | visible |
| `tag_stress_resistant` | 抗压 | visible |
| `tag_controversial` | 争议感 | visible |
| `tag_goes_crazy` | 会发疯 | visible |
| `tag_resume_padding` | 履历注水 | hidden |
| `tag_labor_rights_aware` | 维权意识强 | hidden |
| `tag_early_awakened` | 过早觉醒 | hidden |
| `tag_debt_pressure` | 债务压力 | hidden |
| `tag_platform_banned` | 平台封禁记录 | hidden |

*新增标签时，先在 tags.json 中注册，再在案件中引用。*
