# App 开发说明：Web UI → iOS 应用 / 微信小程序

面向 App 开发团队：如何将当前「外汇期权计算器」Web 界面做成可在 **iOS** 上使用、或在 **微信小程序** 中使用的移动端形态。

---

## 一、当前 Web 技术栈与可复用部分

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | 组件与类型定义 |
| 构建 | Vite 5 | 开发/生产构建 |
| 入口 | `src/main.tsx` → `App.tsx` | 路由为内联 Tab（Vanilla / 组合期权） |
| 页面 | `VanillaPricing.tsx`, `CombinationPricing.tsx` | 表单 + 计算 + 结果展示 |
| 业务逻辑 | `models/`（TS 模块） | 定价与 Greeks，**与平台无关，可直接复用** |
| 工具 | `utils/`（dateUtils、validation、tradingCalendar、persistForm） | 日期、校验、交易日、本地持久化 |
| 样式 | 内联 style + `index.css` | 无复杂 CSS 框架，便于迁移 |

**可完全复用的部分（无需改平台）：**

- `models/` 下全部定价与 Greeks 计算（纯 TypeScript）
- `utils/` 中除依赖 `localStorage` 的持久化外，其余均可复用
- 校验规则（`validation.ts`）、交易日历（`tradingCalendar.ts`）、日期解析（`dateUtils.ts`）

**需要按目标平台适配的部分：**

- 入口与渲染方式（浏览器 DOM / iOS WebView / 小程序组件）
- 路由与导航（若拆成多页）
- 本地存储（Web: localStorage → iOS: 同 WebView 或 Native 存储 → 小程序: wx.setStorage）
- 部分 UI 组件（日期选择器、下拉框等）需用各平台原生或组件库

---

## 二、目标一：iOS 上可用

### 方案对比（简要）

| 方案 | 工作量 | 体验 | 上架 | 适用场景 |
|------|--------|------|------|----------|
| **Capacitor 套壳** | 低 | 接近现有 Web | 可上架 App Store | **推荐**：最快把现有 Web 打包成 iOS App |
| **PWA（添加到主屏）** | 极低 | 依赖 Safari，能力受限 | 不上架，仅主屏图标 | 内部分发、不求上架时 |
| **React Native 重写** | 高 | 原生体验最好 | 可上架 | 长期要原生体验、有 RN 人力时 |

### 推荐：Capacitor 套壳（现有 Vite + React 直接打包）

**思路：** 不改业务代码，用 [Capacitor](https://capacitorjs.com/) 把现有 `npm run build` 产出的 `dist/` 包进 iOS 工程，在 WKWebView 里加载，即可得到可在 iPhone 上安装的 .ipa。

**步骤概要：**

1. **安装 Capacitor（在现有项目根目录）**

   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "外汇期权计算器" com.yourcompany.fxoption --web-dir dist
   ```

2. **添加 iOS 平台**

   ```bash
   npm install @capacitor/ios
   npx cap add ios
   ```

3. **构建 Web 并同步到 iOS 工程**

   ```bash
   npm run build
   npx cap sync ios
   ```

4. **在 Xcode 中打开、签名、运行**

   ```bash
   npx cap open ios
   ```

   在 Xcode 中配置 Team、Bundle ID，连接真机或模拟器运行。

**注意：**

- `vite.config` 里若有 `base: '/'` 或子路径，Capacitor 默认从 `file://` 或 `capacitor://localhost` 加载，需保证资源路径一致（一般默认即可）。
- 若用到 `localStorage`，在 WebView 内与浏览器行为一致；若需持久化到系统级，可后续加 Capacitor 的 [Preferences](https://capacitorjs.com/docs/apis/preferences) 插件。
- 现有表单、日期选择等在手机屏上若偏小，可在 `index.css` 或组件内用 `max-width`、`font-size`、`padding` 等做响应式或触控友好调整，无需改框架。

**上架 App Store：**  
在 Xcode 中 Archive → 上传 App Store Connect，按苹果审核要求准备隐私说明、描述等即可。

---

### 备选：PWA（仅「添加到主屏」、不上架）

- 在 `index.html` 或通过 Vite 插件增加 **Web App Manifest**（`name`、`short_name`、`icons`、`display: standalone`）和 **Service Worker**（可用 `vite-plugin-pwa`）。
- 用户用 Safari 打开部署后的 URL，选「添加到主屏幕」，即可像 App 一样从主屏打开。
- 局限：依赖网络（除非 SW 做离线缓存）、无原生能力、无法上架 App Store，适合内部分发或快速验证。

---

## 三、目标二：微信小程序

微信小程序 **不是** 标准浏览器环境：无 DOM、无完整 Web API，需在小程序自己的视图与逻辑层里实现。因此有两种路线：

### 路线 A：多端框架（用 React 语法写小程序）— 推荐

用 **Taro** 或 **uni-app** 等多端框架，用 **React + TypeScript** 写一套代码，编译出微信小程序（以及 H5 / 未来其他端）。

- **Taro（React 语法）**  
  - 与现有技术栈一致，组件写法接近 React。  
  - 业务逻辑（`models/`、`utils/` 中不依赖 DOM 的部分）可 **直接拷贝或通过 path 引用** 到 Taro 工程。  
  - 页面与表单需改为 Taro 的 `<View>`、`<Input>`、`<Picker>` 等组件，并改用 Taro 的路由与生命周期。

- **uni-app（Vue 语法为主，也支持部分类 React）**  
  - 若团队更熟 Vue，可考虑；否则为复用现有 React 页面逻辑，Taro 更顺。

**实施要点：**

1. **新建 Taro 项目**（与现有 Web 项目可同 monorepo 或独立仓库）：

   ```bash
   npx @tarojs/cli init fx-option-miniapp
   # 选择 React + TypeScript
   ```

2. **复用逻辑层**  
   - 将 `models/`、`utils/dateUtils.ts`、`utils/validation.ts`、`utils/tradingCalendar.ts` 等拷贝或链接到 Taro 工程（如 `src/models`、`src/utils`）。  
   - 去掉或替换对 `localStorage` 的依赖，改用 `Taro.setStorageSync` / `getStorageSync`。

3. **重写视图层**  
   - 用 Taro 的 `<View>`、`<Text>`、`<Input>`、`<Picker>`（日期/下拉）、`<Button>` 等重写 `VanillaPricing`、`CombinationPricing` 的 UI。  
   - 表单状态、校验与计算逻辑可尽量保持与现有 React 一致，仅把 `setState` 与事件绑定改为 Taro 的写法。

4. **构建与发布**  
   - 在 Taro 项目中执行构建微信小程序：  
     `npm run build:weapp`  
   - 用微信开发者工具打开生成的小程序目录，上传代码，在微信公众平台提交审核。

这样 **计算与校验逻辑只维护一份**，仅 UI 和存储层按小程序适配。

### 路线 B：原生小程序重写

- 用微信原生 **WXML + WXSS + JS/TS** 写页面和逻辑，将 `models/`、`utils/` 中的 TS 计算与校验逻辑移植到小程序（可继续用 TS 编写再编译为 JS）。
- 优点：无多端框架约束，包体与性能可控。  
- 缺点：UI 与交互需从零实现，与现有 Web 无法共享组件代码。

---

## 四、建议实施顺序（App 团队）

1. **短期：iOS 可用**  
   - 用 **Capacitor** 把现有 Web 打包成 iOS App，在内部或 TestFlight 验证。  
   - 视需要做简单响应式/触控优化（字体、间距、按钮大小）。

2. **中期：微信小程序**  
   - 采用 **Taro + React + TS**，复用 `models/` 与 `utils/`，用 Taro 组件重写 Vanilla / 组合定价页面。  
   - 先发体验版，再走微信审核正式发布。

3. **可选**  
   - 若 Taro 同时输出 H5，可考虑用同一套 Taro 代码替代或补充当前 Vite 版 Web，减少多套 UI 维护（需评估与现有 Vite 构建的取舍）。

---

## 五、与现有仓库的协作

- **计算与校验**：由现有 `models/`、`utils/validation`、`utils/dateUtils`、`utils/tradingCalendar` 维护；App/小程序侧通过拷贝或子模块引用，**不重复实现定价公式与日期规则**。  
- **Issue 与需求**：  
  - 移动端/小程序专属问题（如 iOS 键盘遮挡、小程序审核不通过）可放在 `Issues/` 下新建分类，如 `Issues/移动端与小程序/`。  
  - 若发现定价结果与 Web 不一致，优先在 `models/` 或数据流上排查，Issue 可挂在 `Issues/计算模块/`。  

---

## 六、文档与后续

- 本文档由 App 开发团队维护，随方案选型（如最终确定 Taro 版本、Capacitor 配置）更新。  
- 若引入 Taro/uni-app，建议在仓库中增加 `README-App.md` 或 `docs/小程序开发.md`，写明环境、构建命令、调试与发布流程。  

**文档结束。**
