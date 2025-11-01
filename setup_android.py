#!/usr/bin/env python3
"""
MemoryCapsule Android 环境配置和启动脚本
"""

import os
import subprocess
import sys
import time
from pathlib import Path

def run_command(cmd, shell=False):
    """运行命令并返回输出"""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timeout"
    except Exception as e:
        return -1, "", str(e)

def setup_android_env():
    """设置 Android 环境变量"""
    print("=" * 50)
    print("MemoryCapsule Android 环境配置")
    print("=" * 50)
    print()
    
    # 1. 设置 ANDROID_HOME
    android_home = os.path.expanduser("~/Library/Android/sdk")
    os.environ["ANDROID_HOME"] = android_home
    print(f"✓ ANDROID_HOME: {android_home}")
    
    # 2. 添加到 PATH
    emulator_path = os.path.join(android_home, "emulator")
    platform_tools = os.path.join(android_home, "platform-tools")
    tools = os.path.join(android_home, "tools")
    tools_bin = os.path.join(android_home, "tools/bin")
    
    os.environ["PATH"] = f"{emulator_path}:{platform_tools}:{tools}:{tools_bin}:{os.environ.get('PATH', '')}"
    print("✓ PATH 已更新")
    
    return android_home

def check_adb(android_home):
    """检查 ADB 是否可用"""
    print()
    print("检查 ADB...")
    adb_path = os.path.join(android_home, "platform-tools", "adb")
    
    if not os.path.exists(adb_path):
        print(f"✗ ADB 未找到: {adb_path}")
        return False
    
    returncode, stdout, stderr = run_command([adb_path, "--version"])
    if returncode == 0:
        print(f"✓ ADB 已安装: {stdout.split(chr(10))[0]}")
        return True
    else:
        print(f"✗ ADB 检查失败: {stderr}")
        return False

def list_avds(android_home):
    """列出可用的虚拟设备"""
    print()
    print("可用的虚拟设备:")
    
    emulator_path = os.path.join(android_home, "emulator", "emulator")
    returncode, stdout, stderr = run_command([emulator_path, "-list-avds"])
    
    if returncode == 0:
        avds = [line.strip() for line in stdout.strip().split('\n') if line.strip()]
        if avds:
            for avd in avds:
                print(f"  - {avd}")
            return avds
        else:
            print("  (无虚拟设备)")
            return []
    else:
        print(f"✗ 列出虚拟设备失败: {stderr}")
        return []

def start_emulator(android_home, avd_name):
    """启动模拟器"""
    print()
    print(f"启动虚拟设备: {avd_name}")
    print("这可能需要 1-2 分钟...")
    print()
    
    emulator_path = os.path.join(android_home, "emulator", "emulator")
    
    # 后台启动模拟器
    try:
        process = subprocess.Popen(
            [emulator_path, "-avd", avd_name, "-no-snapshot-load"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"✓ 模拟器进程已启动 (PID: {process.pid})")
        return True
    except Exception as e:
        print(f"✗ 启动模拟器失败: {e}")
        return False

def wait_for_emulator(android_home):
    """等待模拟器连接"""
    print()
    print("等待模拟器启动...")
    
    adb_path = os.path.join(android_home, "platform-tools", "adb")
    
    for i in range(60):
        returncode, stdout, stderr = run_command([adb_path, "devices"])
        
        if returncode == 0:
            # 检查是否有设备连接
            lines = stdout.strip().split('\n')
            device_count = sum(1 for line in lines if 'device' in line and 'List' not in line)
            
            if device_count > 0:
                print("✓ 模拟器已连接")
                print()
                print("连接的设备:")
                print(stdout)
                return True
        
        if i % 5 == 0:
            print(f"  等待中... ({i}/60)")
        
        time.sleep(1)
    
    print("✗ 模拟器连接超时")
    return False

def main():
    """主函数"""
    try:
        # 1. 设置环境
        android_home = setup_android_env()
        
        # 2. 检查 ADB
        if not check_adb(android_home):
            print("\n✗ ADB 检查失败，请确保 Android SDK 已正确安装")
            sys.exit(1)
        
        # 3. 列出虚拟设备
        avds = list_avds(android_home)
        
        if not avds:
            print("\n⚠️  没有找到虚拟设备")
            print("请使用 Android Studio 创建虚拟设备")
            sys.exit(1)
        
        # 4. 启动第一个虚拟设备
        avd_name = avds[0]
        if not start_emulator(android_home, avd_name):
            sys.exit(1)
        
        # 5. 等待模拟器连接
        if not wait_for_emulator(android_home):
            print("\n⚠️  模拟器启动超时")
            print("请检查 Android Studio 中的模拟器状态")
            sys.exit(1)
        
        # 6. 完成
        print("=" * 50)
        print("✓ Android 模拟器已启动")
        print("=" * 50)
        print()
        print("现在可以运行应用:")
        print("  cd app")
        print("  npm start")
        print("  npm run android")
        print()
        
    except KeyboardInterrupt:
        print("\n\n✗ 用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

