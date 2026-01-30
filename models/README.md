# 定价模型（models）

本目录为外汇期权计算器的**定价模型层**，与 UI 解耦，可供 Web 与后续 App 复用。

## 目录结构

```
models/
├── README.md           # 本说明
├── index.ts            # 统一导出入口（调用时从此引用）
├── types.ts            # 公共类型定义
├── common/             # 公共基础设施
│   ├── index.ts
│   ├── normalCdf.ts    # 正态 CDF N(x)
│   ├── gkParams.ts     # Garman-Kohlhagen 的 d1/d2
│   └── discount.ts     # 折现因子
├── vanilla/            # 欧式香草期权（Garman-Kohlhagen）
│   ├── index.ts
│   └── garmanKohlhagen.ts
├── digital/            # 数字期权（Cash-or-Nothing）
│   ├── index.ts
│   └── cashOrNothing.ts
├── american/           # 美式期权（二叉树）
│   ├── index.ts
│   └── binomialTree.ts
└── asian/              # 亚式期权（蒙特卡洛 / 解析近似）
    ├── index.ts
    └── asianPricing.ts
```

## 调用方式

在业务代码中按需从 `models` 或子模块引用：

```ts
// 方式一：从根入口引用
import { priceVanilla, priceDigital, priceAmerican, priceAsian } from './models';

// 方式二：按模块引用
import { priceCall, pricePut, greeks } from './models/vanilla';
import { priceDigitalCall, priceDigitalPut } from './models/digital';
import { priceAmericanPut } from './models/american';
import { priceAsianMC } from './models/asian';
```

## 模型与规格对应

| 期权类型 | 模型文件 | 功能规格章节 |
|----------|----------|--------------|
| Vanilla 欧式 | vanilla/garmanKohlhagen.ts | 二、Vanilla |
| 数字期权 | digital/cashOrNothing.ts | 三、数字期权 |
| 美式期权 | american/binomialTree.ts | 四、美式期权 |
| 亚式期权 | asian/asianPricing.ts | 五、亚式期权 |

## 验证

- 使用教材或彭博/Reuters 示例数据校验价格与 Greeks。
- 单元测试见项目根目录 `tests/` 或各模块下的 `*.test.ts`（若配置）。
