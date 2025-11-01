#!/bin/bash

# MemoryCapsule Android 环境配置和启动脚本

echo "=========================================="
echo "MemoryCapsule Android 环境配置"
echo "=========================================="
echo ""

# 1. 设置 ANDROID_HOME
export ANDROID_HOME=$HOME/Library/Android/sdk
echo "✓ ANDROID_HOME: $ANDROID_HOME"

# 2. 添加到 PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
echo "✓ PATH 已更新"

# 3. 检查 adb
echo ""
echo "检查 ADB..."
if command -v adb &> /dev/null; then
    echo "✓ ADB 已安装: $(adb --version | head -1)"
else
    echo "✗ ADB 未找到"
    exit 1
fi

# 4. 列出可用的虚拟设备
echo ""
echo "可用的虚拟设备:"
emulator -list-avds

# 5. 检查是否有虚拟设备
AVD_COUNT=$(emulator -list-avds | wc -l)
if [ $AVD_COUNT -eq 0 ]; then
    echo ""
    echo "⚠️  没有找到虚拟设备"
    echo "请使用 Android Studio 创建虚拟设备，或运行:"
    echo "  avdmanager create avd -n MemoryCapsule -k \"system-images;android-33;google_apis;arm64-v8a\" -d \"Pixel 5\""
    exit 1
fi

# 6. 获取第一个虚拟设备名称
AVD_NAME=$(emulator -list-avds | head -1)
echo ""
echo "将启动虚拟设备: $AVD_NAME"
echo ""

# 7. 启动模拟器
echo "启动 Android 模拟器..."
echo "这可能需要 1-2 分钟..."
echo ""

emulator -avd "$AVD_NAME" -no-snapshot-load &
EMULATOR_PID=$!

echo "✓ 模拟器进程 ID: $EMULATOR_PID"
echo ""

# 8. 等待模拟器启动
echo "等待模拟器启动..."
sleep 10

# 9. 检查模拟器是否已连接
echo ""
echo "检查连接的设备..."
for i in {1..30}; do
    DEVICES=$(adb devices | grep -c "device$")
    if [ $DEVICES -gt 0 ]; then
        echo "✓ 模拟器已连接"
        adb devices
        break
    fi
    echo "等待中... ($i/30)"
    sleep 2
done

echo ""
echo "=========================================="
echo "✓ Android 模拟器已启动"
echo "=========================================="
echo ""
echo "现在可以运行应用:"
echo "  cd app"
echo "  npm start"
echo "  npm run android"
echo ""

