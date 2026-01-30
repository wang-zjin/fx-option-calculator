# 外汇期权计算器 — iOS App 开发说明

按 **App开发说明-Web转iOS与微信小程序.md** 设计，采用 **Capacitor 套壳** 将现有 Vite + React Web 打包为 iOS 应用。

---

## 一、环境要求

- **Node.js**（含 npm）：用于构建 Web 与执行 Capacitor CLI
- **macOS**：用于编译与运行 iOS 工程
- **Xcode**：从 App Store 安装完整 Xcode（非仅 Command Line Tools），用于签名与真机/模拟器运行
- **CocoaPods**（可选）：`sudo gem install cocoapods`，用于安装 iOS 原生依赖；若 `npx cap sync ios` 提示未安装，可在 Xcode 打开工程后再安装

---

## 二、首次配置（已完成部分）

以下步骤已在仓库中完成：

1. **Capacitor 依赖**：`@capacitor/core`、`@capacitor/cli`、`@capacitor/ios` 已加入 `package.json`
2. **Capacitor 配置**：`capacitor.config.ts` 中 `appId: 'com.bocom.fxoption'`、`appName: '外汇期权计算器'`、`webDir: 'dist'`
3. **iOS 平台**：已执行 `npx cap add ios`，生成 `ios/` 原生工程
4. **npm 脚本**：`build:ios`（构建 Web 并同步到 iOS）、`open:ios`（用 Xcode 打开 iOS 工程）

---

## 三、日常开发流程

### 1. 构建 Web 并同步到 iOS

```bash
npm install
npm run build:ios
```

- `npm run build:ios` 内部执行 `npm run build`（生成 `dist/`）再 `npx cap sync ios`（将 `dist/` 拷贝到 `ios/App/App/public` 并更新配置）。
- 若本机未安装 CocoaPods，`cap sync` 可能提示 `Skipping pod install`；可在装有 Xcode 的 Mac 上打开工程后执行 `pod install`（进入 `ios/App` 再运行）。

### 2. 用 Xcode 打开并运行

```bash
npx cap open ios
```

- 在 Xcode 中：选择 Team、配置 Bundle ID（与 `capacitor.config.ts` 中 `appId` 一致或按行内规范修改）、选择模拟器或真机，点击 Run。
- 真机需在「签名与能力」中配置好开发证书/描述文件。

### 3. 修改 Web 后的同步

- 修改 `src/` 或 `models/` 后，重新执行 **构建并同步**：
  ```bash
  npm run build:ios
  ```
- 若未改原生代码，只需在 Xcode 中再次 Run，无需改 Xcode 工程。

---

## 四、配置说明

| 项 | 位置 | 说明 |
|----|------|------|
| App 名称 | `capacitor.config.ts` → `appName` | 显示在 iOS 主屏与设置中的名称 |
| Bundle ID | `capacitor.config.ts` → `appId` | 可按行内规范改为如 `com.bocom.fxoption` |
| Web 资源目录 | `capacitor.config.ts` → `webDir` | 固定为 `dist`（Vite 构建输出） |

---

## 五、上架 App Store

1. 在 Xcode 中配置好发布用证书与描述文件。
2. 菜单 **Product → Archive**，归档完成后在 Organizer 中 **Distribute App**，选择 App Store Connect。
3. 在 App Store Connect 中填写隐私说明、描述、截图等，提交审核。

---

## 六、问题记录

- **键盘遮挡、触控区域、安全区**等移动端专属问题，可记录到 **Issues/移动端与小程序/**，便于复现与 AI 检索。
- 定价结果与 Web 不一致时，优先在 `models/` 或数据流上排查，Issue 可挂在 **Issues/计算模块/**。

---

**文档结束。** 更多方案对比（PWA、React Native、微信小程序）见 **App开发说明-Web转iOS与微信小程序.md**。
