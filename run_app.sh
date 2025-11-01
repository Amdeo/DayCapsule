#!/bin/bash

# MemoryCapsule 应用启动脚本

echo "=========================================="
echo "MemoryCapsule - React Native 应用启动"
echo "=========================================="
echo ""

# 设置 Android 环境
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# 增加文件描述符限制
ulimit -n 10000

# 检查模拟器连接
echo "检查模拟器连接..."
DEVICES=$($ANDROID_HOME/platform-tools/adb devices | grep -c "device$")

if [ $DEVICES -eq 0 ]; then
    echo "✗ 模拟器未连接"
    echo "请先启动模拟器: ./start_emulator.sh"
    exit 1
fi

echo "✓ 模拟器已连接"
echo ""

# 进入应用目录
cd app

# 启动 Metro bundler
echo "启动 Metro bundler..."
echo ""

node node_modules/.bin/react-native start --reset-cache &
METRO_PID=$!

echo "Metro PID: $METRO_PID"
echo ""

# 等待 Metro 启动
echo "等待 Metro 启动..."
sleep 30

# 构建并运行应用
echo "构建并运行应用..."
echo ""

node node_modules/.bin/react-native run-android

# 清理
kill $METRO_PID 2>/dev/null || true

