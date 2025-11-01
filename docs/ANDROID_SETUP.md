# Android 模拟器运行指南

本指南将帮助您在 Android 模拟器上运行 MemoryCapsule 应用。

## 📋 前置要求

### 1. 安装 Android Studio

从 [Android Studio 官网](https://developer.android.com/studio) 下载并安装最新版本。

### 2. 安装 Android SDK

在 Android Studio 中：
1. 打开 **SDK Manager**（Tools → SDK Manager）
2. 安装以下组件：
   - **Android SDK Platform 33** 或更高版本
   - **Android SDK Build-Tools 33.0.0** 或更高版本
   - **Android Emulator**
   - **Android SDK Platform-Tools**

### 3. 配置环境变量

在 `~/.zshrc` 或 `~/.bash_profile` 中添加：

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

然后运行：
```bash
source ~/.zshrc  # 或 source ~/.bash_profile
```

### 4. 验证安装

```bash
# 检查 Android SDK
adb --version

# 检查模拟器
emulator -version
```

---

## 🚀 创建 Android 虚拟设备 (AVD)

### 方法 1: 使用 Android Studio GUI

1. 打开 Android Studio
2. 点击 **Tools → Device Manager**
3. 点击 **Create Device**
4. 选择设备类型（推荐 **Pixel 5** 或 **Pixel 6**）
5. 选择系统镜像（推荐 **Android 13** 或更高版本）
6. 完成创建

### 方法 2: 使用命令行

```bash
# 列出可用的系统镜像
sdkmanager --list | grep "system-images"

# 下载系统镜像（例如 Android 13）
sdkmanager "system-images;android-33;google_apis;arm64-v8a"

# 创建虚拟设备
avdmanager create avd -n MemoryCapsule -k "system-images;android-33;google_apis;arm64-v8a" -d "Pixel 5"
```

---

## 🎮 启动 Android 模拟器

### 方法 1: 使用 Android Studio

1. 打开 Android Studio
2. 点击 **Device Manager**
3. 找到您创建的虚拟设备
4. 点击 **Play** 按钮启动

### 方法 2: 使用命令行

```bash
# 列出所有虚拟设备
emulator -list-avds

# 启动虚拟设备
emulator -avd MemoryCapsule
```

**等待模拟器完全启动**（通常需要 1-2 分钟）

---

## 📱 运行 MemoryCapsule 应用

### 步骤 1: 确保模拟器正在运行

```bash
adb devices
```

您应该看到类似的输出：
```
List of attached devices
emulator-5554          device
```

### 步骤 2: 增加文件描述符限制

```bash
ulimit -n 10000
```

### 步骤 3: 启动 Metro Bundler

在一个终端中运行：
```bash
cd app
npm start -- --reset-cache
```

等待看到：
```
Welcome to Metro v0.80.12
Fast - Scalable - Integrated
```

### 步骤 4: 在另一个终端中构建并运行应用

```bash
cd app
npm run android
```

这将：
1. 构建 Android APK
2. 安装到模拟器
3. 启动应用

---

## ✅ 验证应用运行

应用成功运行时，您应该看到：

1. **Metro 终端输出**：
   ```
   ✓ Transforming 123 files
   ✓ Bundle complete
   ```

2. **模拟器屏幕**：
   - MemoryCapsule 应用启动
   - 显示欢迎屏幕或首页

---

## 🐛 常见问题和解决方案

### 问题 1: "ANDROID_HOME not set"

**解决方案**：
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### 问题 2: "adb: command not found"

**解决方案**：
```bash
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 问题 3: "EMFILE: too many open files"

**解决方案**：
```bash
ulimit -n 10000
```

### 问题 4: 模拟器无法启动

**解决方案**：
1. 检查虚拟化是否启用（Intel VT-x 或 AMD-V）
2. 尝试删除并重新创建虚拟设备
3. 检查磁盘空间（需要至少 10GB）

### 问题 5: 应用无法安装

**解决方案**：
```bash
# 清除应用缓存
npm run clean

# 重新安装依赖
npm install

# 重新运行
npm run android
```

### 问题 6: Metro 连接失败

**解决方案**：
1. 确保 Metro 正在运行
2. 检查防火墙设置
3. 尝试重置 Metro 缓存：`npm start -- --reset-cache`

---

## 🔧 高级配置

### 使用特定的 Android 版本

编辑 `app/android/build.gradle`：

```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        targetSdkVersion 33
        minSdkVersion 21
    }
}
```

### 启用 USB 调试（真实设备）

1. 在设备上打开 **设置 → 关于手机**
2. 连续点击 **Build Number** 7 次
3. 返回 **设置 → 开发者选项**
4. 启用 **USB 调试**

### 连接真实设备

```bash
# 列出连接的设备
adb devices

# 运行应用到真实设备
npm run android
```

---

## 📊 性能优化

### 模拟器性能提升

1. **启用 GPU 加速**：
   ```bash
   emulator -avd MemoryCapsule -gpu on
   ```

2. **分配更多 RAM**：
   编辑 `~/.android/avd/MemoryCapsule.avd/config.ini`：
   ```
   hw.ramSize=4096
   ```

3. **使用 ARM64 架构**：
   创建虚拟设备时选择 `arm64-v8a`

---

## 📚 相关文档

- [React Native 官方文档](https://reactnative.dev/docs/environment-setup)
- [Android 开发者指南](https://developer.android.com/docs)
- [Metro Bundler 文档](https://facebook.github.io/metro/)

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 [快速开始指南](./quickstart.md)
2. 检查 [README.md](../README.md)
3. 查看应用日志：`adb logcat`
4. 提交 Issue：[GitHub Issues](https://github.com/yourusername/MemoryCapsule/issues)

---

**祝您使用愉快！🎉**

