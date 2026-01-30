# 外汇期权计算器 — Web 使用说明

## 运行方式

1. **安装依赖**（需本机已安装 Node.js 与 npm）：
   ```bash
   npm install
   ```

2. **开发模式**：
   ```bash
   npm run dev
   ```
   浏览器访问控制台提示的地址（通常为 http://localhost:5173）。

3. **构建生产包**：
   ```bash
   npm run build
   ```
   产物在 `dist/`，可部署到 Nginx 或静态托管。

4. **本地预览构建结果**：
   ```bash
   npm run preview
   ```

## 功能说明

- **Vanilla 定价页**：输入货币对（含 **EURUSD、USDJPY、USDCNY** 等）、当前日期、起息日、到期日、交割日、即期、执行价、本币/外币利率、名义本金、买卖方向、期权类型、隐含波动率；点击「计算」得到期权价格、Premium、Delta、Gamma、Vega、VolGamma、Time Decay、Phi、Rho、Theta。
- **T1/T2**：T1 = (到期日−当前日期)/365（d1/d2 与存续期），T2 = (交割日−起息日)/365（期权费折现）；与需求书及 Fenics 案例一致。
- **回归校验**：默认表单已填入《需求书-Vanilla-Web定价界面》第八节的参考案例参数（Put、Long）。若有 `验证Fenics_EURUSD_20251229.py`，可对比同一组参数下期权价格、Premium、Delta、Theta 等；若存在差异，请按 [Issues/README.md](./Issues/README.md) 记录到 `Issues/计算模块/` 或相应分类。

## 遇到问题

- 开发/联调中若出现问题，请按 **Issues 知识库** 规范记录：见 [Issues/README.md](./Issues/README.md)，使用 [Issues/_template.md](./Issues/_template.md) 填写现象、原因、解决方案，便于复现与 AI 检索。
