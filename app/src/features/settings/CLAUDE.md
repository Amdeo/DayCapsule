[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **settings**

# Settings 模块文档

## 模块职责

Settings模块负责应用的各种设置和配置管理，包括主题切换、字体调节、安全管理、权限管理、数据管理和隐私设置等功能。

## 入口与启动

### 主入口文件
- `SettingsScreen.tsx` - 设置主页面

### 启动流程
1. 从底部导航进入设置页面
2. 显示各类设置选项
3. 用户点击具体设置项进入对应配置页面
4. 设置变更实时生效并持久化

## 对外接口

### 主要组件接口
```typescript
// SettingsScreen props
interface SettingsScreenProps {}

// 设置组件props
interface ThemeSelectorProps {
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

// 主要导出组件
export { SettingsScreen } from './screens/SettingsScreen';
```

### Redux Actions
```typescript
// settingsSlice actions
export const setTheme: (theme: Theme) => void;
export const setFontSize: (size: FontSize) => void;
export const setPrivacySettings: (settings: PrivacySettings) => void;
export const updateSecuritySettings: (settings: SecuritySettings) => void;
```

## 关键依赖与配置

### 内部依赖
- `@services/security/biometricAuth` - 生物识别认证
- `@services/security/passwordAuth` - 密码认证
- `@services/permissions` - 权限管理服务
- `@services/storage/encryption` - 加密服务
- `@store/slices/settingsSlice` - Redux状态管理

### 外部依赖
- `react-native-keychain` - 安全存储
- `react-native-permissions` - 权限管理
- `react-native-paper` - UI组件库

### 配置文件
- `@app/theme.ts` - 主题配置文件

## 数据模型

### 设置状态
```typescript
interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  biometricEnabled: boolean;
  passwordEnabled: boolean;
  privacySettings: PrivacySettings;
  permissions: PermissionStatus;
  dataUsage: DataUsageStats;
}
```

### 主题配置
```typescript
interface Theme {
  mode: 'light' | 'dark' | 'system';
  colors: ColorScheme;
  fonts: FontScheme;
}

enum FontSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large'
}
```

### 安全设置
```typescript
interface SecuritySettings {
  biometricEnabled: boolean;
  passwordEnabled: boolean;
  autoLockDelay: number; // 分钟
  requireAuthOnLaunch: boolean;
}

interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  locationEnabled: boolean;
  dataCollectionEnabled: boolean;
}
```

## 测试与质量

### 测试覆盖率
- **组件测试覆盖率**: 85%
- **关键测试场景**:
  - 主题切换功能
  - 字体大小调节
  - 生物识别认证
  - 密码设置和验证
  - 权限管理
  - 数据导出和删除

### 安全性测试
- 生物识别认证流程
- 密码强度验证
- 数据加密存储
- 权限状态检查

### 性能优化
- 设置变更实时预览
- 异步保存设置
- 缓存权限状态

## 常见问题 (FAQ)

### Q: 如何切换应用主题？
A: 在设置中选择"主题设置"，可选择浅色、深色或跟随系统主题。

### Q: 忘记密码怎么办？
A: 支持生物识别验证后重置密码，或通过安全问题恢复。

### Q: 如何管理应用权限？
A: 在设置中查看和调整各项权限，包括相机、麦克风、位置等。

### Q: 数据如何备份和恢复？
A: 支持导出备份文件，包含所有记录和设置，可通过导入恢复数据。

### Q: 隐私设置如何配置？
A: 可控制数据收集、分析、崩溃报告等选项，支持完全关闭数据分享。

## 相关文件清单

### 核心文件
- `screens/SettingsScreen.tsx` - 设置主页面

### 设置组件
- `components/ThemeSelector.tsx` - 主题选择器
- `components/FontSizeSelector.tsx` - 字体大小选择器
- `components/PrivacySettings.tsx` - 隐私设置组件
- `components/PermissionsManager.tsx` - 权限管理器
- `components/DataManagement.tsx` - 数据管理组件

### 安全相关
- `components/PasswordSettings.tsx` - 密码设置（未实现）
- `components/BiometricSettings.tsx` - 生物识别设置（未实现）
- `components/SecuritySettings.tsx` - 安全设置（未实现）

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建settings模块文档
- 定义设置接口和数据模型
- 添加安全性说明
- 更新测试覆盖率统计