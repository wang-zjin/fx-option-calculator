# Issue：Time Decay Bump T1、Volga/Vanna 分离、Rho/Phi 符号、Vega 含方向、Premium(外币)

- **日期**：2026-01-30
- **分类**：计算模块、前端与UI

---

## 现象与需求

1. **Vega 为 Short 时应为负**：头寸 Vega 已按方向取负；需在「每单位名义」也展示含方向（Short 时为负）。
2. **添加 Premium（外币）**：本币期权费 ÷ 即期 = 外币等值，需在输出区展示。
3. **Time Decay 计算误差大**：改用与 Fenics/QuantLib 一致的 **Bump T1**：(V(T1−1/365)−V(T1+1/365))/2，替代仅用解析 Theta。
4. **VolGamma 与 Vanna 不是同一概念**：需分开计算与展示。**Vanna** = ∂²V/(∂S∂σ)，**Volga/VolGamma** = ∂²V/∂σ²。
5. **Rho 和 Phi 计算有问题**：Rho_d（Rho）应为 Call 正、Put 负；Rho_f（Phi）为 Call 负、Put 正；原实现 Rho_d 符号反了。
6. **Theta 单位**：输出应为「按 1 天」，即 (∂V/∂t)/365。

---

## 原因与方案

- **Rho_d**：∂V/∂r_d 对 Call 为正（本币利率升→执行价折现变小→Call 价值升），原代码返回了负值，已改为 `+K*T2*D_d*N(d2)`（Call）、`-K*T2*D_d*N(-d2)`（Put）。
- **Time Decay**：新增 `timeDecayBumpT1(params, optionType)`，用 T1±1/365 做中心差分，与参考脚本「Time Decay (Analytic Bump T1)」一致。
- **Volga**：新增 `volga(params) = vega * d1 * d2 / σ`；原 `volGamma` 实为 Vanna，重命名为 `vanna`。
- **Theta**：解析 Theta 返回值除以 365，得到「按 1 天」。
- **前端**：Premium（外币）= premium/spot；Vega 每单位名义展示「含方向」= raw.vega × sign；Time Decay 展示用 `timeDecayBump`；Vanna 与 Volga 分两行展示。

---

## 解决方案（已实施）

1. **models/types.ts**：VanillaResult 增加 `timeDecayBump`、`vanna`、`volga`，移除 `volGamma`。
2. **models/vanilla/garmanKohlhagen.ts**：Rho_d 符号修正；新增 `vanna`、`volga`、`timeDecayBumpT1`；Theta 返回值除以 365。
3. **src/pages/VanillaPricing.tsx**：输出增加 Premium（外币）；Vega（每单位名义）展示含方向；Time Decay 用 `timeDecayBump`；Vanna 与 VolGamma/Volga 分开展示。

---

## 相关链接

- 验证脚本：`验证Fenics Theta_9M_ITM.py`（Time Decay Bump T1、Theta 口径）。
- 需求书：Vanilla-Web 输出规格（Rho/Phi、Time Decay、VolGamma/Vanna）。
