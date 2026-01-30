# Issue：normalCdf 负值实现错误导致近平价 Delta 接近 100%

- **日期**：2026-01-30
- **分类**：计算模块

---

## 现象

- Vanilla-Web 界面：即期 6.9487、执行价 6.9387（近平价）、Short Call USDCNY。
- 预期：每单位 Delta 绝对值约 50%，头寸 Delta 为负。
- 实际：每单位 Delta 显示 0.992758（约 99%），头寸 Delta -992757.99（符号正确但绝对值错误）。

---

## 原因

- `models/common/normalCdf.ts` 中原 A&S 近似实现有误：对 **x < 0** 使用了 `N(x) = 1 - y`，而正确公式应为 **N(x) = φ(x)·y**。
- 原实现中 `y = 1 - (多项式)*exp(-x²/2)`，当 x 为小负值时多项式≈1，y≈0，导致 `1-y≈1`，即 N(-0.004) 被算成 1 而非约 0.498。
- 近平价时 d1 接近 0（本例 d1≈-0.004），N(d1) 被错误算成约 0.996，进而 Delta = exp(-r_f*T2)*N(d1) 接近 1。

---

## 解决方案

1. 将 `normalCdf` 替换为 Abramowitz & Stegun 26.2.17 的标准形式：
   - `t = 1 / (1 + 0.2316419|x|)`
   - `y = t*(b1 + t*(b2 + t*(b3 + t*(b4 + t*b5))))`（系数 b1…b5 见 A&S）
   - **x ≥ 0**：`N(x) = 1 - φ(x)·y`
   - **x < 0**：`N(x) = φ(x)·y`（不得使用 1-y）
2. 修改文件：`models/common/normalCdf.ts`，采用上述公式并保留 `normalPdf` 及边界判断（x≥6 返回 1，x≤-6 返回 0）。
3. 修复后同一参数下：N(d1)≈0.498，每单位 Delta≈0.497，头寸 Delta≈-497,018（Short 为负、绝对值约 50% 名义）。

---

## 相关链接 / 参考

- Abramowitz & Stegun 26.2.17；[Abramowitz and Stegun approximation for cumulative normal distribution](https://math.stackexchange.com/questions/888165/abramowitz-and-stegun-approximation-for-cumulative-normal-distribution)

---

## 备注

- 定价模型团队已按上述方案修改 `normalCdf`，Garman-Kohlhagen 及依赖 N(x) 的其它模型（如数字期权）一并修正。
