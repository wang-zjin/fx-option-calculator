import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 配置：将 Web 构建产物 dist/ 套壳为 iOS App
 * 参见 App开发说明-Web转iOS与微信小程序.md
 */
const config: CapacitorConfig = {
  appId: 'com.bocom.fxoption',
  appName: '外汇期权计算器',
  webDir: 'dist',
  server: {
    // 本地开发时可选：android 用 10.0.2.2，iOS 模拟器用 localhost
    // 生产构建后从 file/capacitor 协议加载，无需配置
  },
};

export default config;
