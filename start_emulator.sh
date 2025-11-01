#!/bin/bash

# 设置 Android 环境
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo "=========================================="
echo "启动 Android 模拟器"
echo "=========================================="
echo ""

# 列出可用的虚拟设备
echo "可用的虚拟设备:"
$ANDROID_HOME/emulator/emulator -list-avds

echo ""
echo "启动第一个虚拟设备..."

# 获取第一个虚拟设备
AVD_NAME=$($ANDROID_HOME/emulator/emulator -list-avds | head -1)

if [ -z "$AVD_NAME" ]; then
    echo "错误: 没有找到虚拟设备"
    echo "请使用 Android Studio 创建虚拟设备"
    exit 1
fi

echo "启动: $AVD_NAME"
echo ""

# 启动模拟器
$ANDROID_HOME/emulator/emulator -avd "$AVD_NAME" -no-snapshot-load

