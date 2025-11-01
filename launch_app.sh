#!/bin/bash

# 设置环境
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# 增加文件描述符限制
launchctl limit maxfiles 10000 10000

echo "=========================================="
echo "MemoryCapsule - 启动应用"
echo "=========================================="
echo ""

# 进入应用目录
cd /Users/looper/Documents/code/work/cooper/MemoryCapsule/app

# 启动 Metro bundler
echo "1️⃣  启动 Metro bundler..."
node node_modules/.bin/react-native start --reset-cache &
METRO_PID=$!
echo "   Metro PID: $METRO_PID"
echo ""

# 等待 Metro 启动
echo "2️⃣  等待 Metro 启动 (40 秒)..."
sleep 40

# 构建并运行应用
echo "3️⃣  构建并运行应用..."
echo ""

node node_modules/.bin/react-native run-android

# 清理
echo ""
echo "清理进程..."
kill $METRO_PID 2>/dev/null || true

echo "完成！"

