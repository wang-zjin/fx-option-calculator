import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // 使用相对路径，部署在任意子路径（如 xxx.github.io/仓库名/ 或 自定义域名/仓库名/）都能正确加载资源
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@models': path.resolve(__dirname, './models'),
    },
  },
});
