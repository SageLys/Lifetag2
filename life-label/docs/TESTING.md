# 测试（TESTING）

工具：Vitest（Node 环境，无浏览器/Canvas）。命令：
- `npm test` — 运行全部测试一次
- `npm run test:watch` — 监视模式
- `npm run typecheck` — `tsc --noEmit`

核心规则全部可在无 Canvas 环境测试（core 平台无关），这也是"规则与动画解耦"的直接证明。

## 目录
```
tests/
├── core/                       # 核心规则自动化测试
│   ├── helpers.ts              # makeEngine / cloneData / startShift1 / snapshot
│   ├── state-machine.test.ts   # 新局初始状态、合法/非法相位转移
│   ├── case-actions.test.ts    # 扒底/揭标/出货/退货 + 守卫（含 requires* 规则、克隆构造）
│   ├── callbacks-deposit.test.ts # 回单 delay 0/1/2/final、成功/失败、押金扣除/归零/失败中断
│   ├── tendency.test.ts        # 累计/多次/独立/主导/阈值/并列/结局条件/失败报告
│   ├── shift-ending.test.ts    # 绩效达标/未达标/处罚上限、超时收班、结局优先级/兜底/失败
│   ├── model.test.ts           # PlayerState 序列化（无浏览器对象）、工厂、计时器解析
│   └── fixtures.test.ts        # 回放 tests/fixtures/*.json 并断言终态
├── fixtures/                   # 8 个跨平台场景（纯数据，命令 + 期望快照）
└── data.test.ts               # 数据层：校验器（正/负向）、索引
```

## fixtures（跨平台场景）
每个 fixture：`{ name, description, commands: GameCommand[], expect: <snapshot> }`。
- `commands` 是显式命令序列（确定性，引擎无随机/时间依赖判定）。
- `expect` 是 `snapshot(state)`（phase / runStatus / deposit / tendencies / 各统计 / pendingCallbacks / endingId / forcedByTimeout）。
- 回放：新引擎按 `commands` 逐条 `dispatch`，对终态取 `snapshot` 与 `expect` 深比较。
- 供未来 Unity C# 端读取同一份做一致性校验（见 UNITY_MIGRATION_GUIDE.md）。

包含至少一条完整成功流程（`successful_run` → ENDING_DISPLAY）与一条完整失败流程（`failed_run` → RUN_FAILED）。

### 重新生成 fixtures
fixtures 由引擎实际播放生成（脚本逻辑见提交历史中的 `_genFixtures`）。如规则/数据变更导致期望变化，可重写生成器（一次性 `*.test.ts`，用策略 autoplay 引擎并 `writeFileSync` 出 JSON）后删除，再以 `fixtures.test.ts` 回放校验。

## 覆盖要点（对应规格）
- 新局与状态机：初始押金 5/5、tendency 全 0、阶段非法转移返回明确 `rejection.reason`。
- 案件操作：重复扒底/资源不足/非法流向/要求先扒底先揭标/退货均有断言。
- 回单与押金：四种延迟、成功与失败、押金扣除、归零失败中断。
- tendency：仅出货/退货累计、多倾向独立、主导阈值 ≥3、并列取靠前、结局 minTendency、失败报告映射。
- 班次与结局：绩效与处罚上限、超时强制收班 forcedByTimeout、结局优先级与兜底、押金归零失败。

## 手动回归
浏览器整体回归见 docs/MANUAL_REGRESSION_CHECKLIST.md（`npm run dev` 后逐项核对）。
