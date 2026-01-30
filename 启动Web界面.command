#!/bin/bash
# 双击此文件会在终端中启动 Web 界面并打开浏览器
cd "$(dirname "$0")"
chmod +x 启动Web界面.sh 2>/dev/null
./启动Web界面.sh
echo ""
read -p "按回车键关闭此窗口（Web 界面会继续在浏览器中运行）..."
