/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    test: {
        include: ['models/**/*.test.ts'],
        environment: 'node',
    },
    // 使用相对路径，部署在任意子路径都能正确加载资源
    base: './',
    build: {
        rollupOptions: {
            output: {
                entryFileNames: 'assets/index.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@models': path.resolve(__dirname, './models'),
        },
    },
});
