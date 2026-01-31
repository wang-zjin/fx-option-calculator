# Issue：数字期权 Cash-or-Nothing 外币 Put Delta 符号错误

- **日期**：2025-01-30
- **分类**：计算模块

---

## 现象

- 数字期权 Cash-or-Nothing、支付货币为外币（foreign）、看跌（put）时，`deltaCashForeign` 中 Put 的 Delta 公式符号错误。
- 正确：Put 价值 V = D·S·e^{-r_f·T}·N(-d1)，故 ∂V/∂S = D·e^{-r_f·T}·[N(-d1) − φ(d1)/(σ√T)]。
- 原实现：Put 返回 `params.D * D_f * (n - 1 + phi / sigmaSqrtT)` = D·e^{-r_f·T}·[-N(-d1) + φ/(σ√T)]，即 φ 项符号反了（应为减号，写成了加号）。

---

## 原因

- `deltaCashForeign` 中 Put 分支误用了与 Call 类似的「n - 1 + phi/sigmaSqrtT」形式；Put 的 Delta 应为 N(-d1) − φ/(σ√T)，即 (1−N(d1)) − φ/(σ√T)。

---

## 解决方案

1. 在 `models/digital/cashOrNothing.ts` 的 `deltaCashForeign` 中，Put 分支改为：
   - `return params.D * D_f * (normalCdf(-_d1) - phi / sigmaSqrtT);`
2. 回归：用同一组 DigitalParams（payoffCurrency='foreign', optionType='put'）对比修复前后 Delta 符号与数值；或与解析/数值差分结果对比。

---

## 相关链接 / 参考

- 需求书-数字期权模块；功能规格「数字期权」；models/digital/cashOrNothing.ts。

---

## 备注

- 测试团队在数字期权模块回归测试中发现；已按上述方案修改，Put Delta 改为 N(-d1) − φ/(σ√T)。
