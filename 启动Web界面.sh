#!/bin/bash
# 外汇期权计算器 — 一键启动 Vanilla-Web 界面
# 用法：在终端执行 ./启动Web界面.sh  或双击 启动Web界面.command

cd "$(dirname "$0")"

# 若 5173 端口已被占用，说明服务已在运行，直接打开浏览器
if lsof -i :5173 >/dev/null 2>&1; then
  echo "开发服务器已在运行，正在打开浏览器..."
  open "http://localhost:5173/"
  exit 0
fi

# 依赖未安装时先安装
if [ ! -d "node_modules" ]; then
  echo "正在安装依赖（首次约 1–2 分钟）..."
  npm install
fi

echo "正在启动开发服务器..."
nohup npm run dev > /tmp/vanilla-web-dev.log 2>&1 &
sleep 3
open "http://localhost:5173/"
echo "已打开 Vanilla-Web 界面，服务器在后台运行。"
echo "关闭浏览器标签即可结束使用；下次直接再运行本脚本即可。"
