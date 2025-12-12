[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **capture**

# Capture 模块文档

## 模块职责

Capture模块负责处理生活记录的创建功能，支持拍照、文字和语音三种记录方式，提供快速记录体验和AI智能辅助功能。

## 入口与启动

### 主入口文件
- `HomeScreen.tsx` - 模块主页面，提供快速记录入口
- `CaptureScreen.tsx` - 专门的记录创建页面
- `EntryDetail.tsx` - 记录详情页面

### 启动流程
1. 应用启动后导航到HomeScreen
2. 用户选择记录类型（拍照/文字/语音）
3. 打开对应的记录对话框或页面
4. 完成记录后保存并更新状态

## 对外接口

### 主要组件接口
```typescript
// HomeScreen props
interface HomeScreenProps {}

// EntryDetail props
interface EntryDetailProps {
  entryId: string;
}

// 主要导出组件
export { HomeScreen } from './screens/HomeScreen';
export { CaptureScreen } from './screens/CaptureScreen';
export { EntryDetail } from './screens/EntryDetail';
```

### Redux Actions
```typescript
// captureSlice actions
export const createPhotoEntry: (data: PhotoEntryData) => AppThunk;
export const createTextEntry: (data: TextEntryData) => AppThunk;
export const createVoiceEntry: (data: VoiceEntryData) => AppThunk;
export const updateEntry: (data: UpdateEntryData) => AppThunk;
export const deleteEntry: (id: string) => AppThunk;
```

## 关键依赖与配置

### 内部依赖
- `@services/camera` - 相机功能服务
- `@services/ai/tagSuggestion` - AI标签建议服务
- `@store/slices/captureSlice` - Redux状态管理
- `@hooks/useTranscription` - 语音转写Hook

### 外部依赖
- `react-native-image-picker` - 图片选择
- `react-native-vision-camera` - 相机功能
- `react-native-audio-recorder-player` - 音频录制播放

### 配置文件
- 无特定配置文件，使用全局配置

## 数据模型

### LifelogEntry 接口
```typescript
interface LifelogEntry {
  id: string;
  type: 'photo' | 'text' | 'voice';
  content: string;
  timestamp: number;
  location?: LocationData;
  tags: string[];
  mediaPath?: string;
  thumbnailPath?: string;
  voiceDuration?: number;
  transcription?: string;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
  weather?: WeatherData;
  mood?: Mood;
  createdAt: number;
  updatedAt: number;
}
```

### 输入数据类型
```typescript
interface PhotoEntryData {
  photoPath: string;
  content?: string;
  tags?: string[];
  mood?: Mood;
}

interface TextEntryData {
  content: string;
  tags?: string[];
  mood?: Mood;
}

interface VoiceEntryData {
  voicePath: string;
  duration: number;
  content?: string;
  tags?: string[];
  mood?: Mood;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
}
```

## 测试与质量

### 测试文件结构
```
__tests__/
├── EntryDetail.test.tsx         # 详情页面测试
├── MoodSelector.test.tsx        # 心情选择器测试
├── TagInput.test.tsx            # 标签输入测试
├── TranscriptionEditor.test.tsx # 转录编辑器测试
├── TranscriptionLanguageSelector.test.tsx # 语言选择测试
└── TranscriptionProgress.test.tsx # 转录进度测试
```

### 测试覆盖率
- **组件测试覆盖率**: 80%
- **关键测试场景**:
  - 拍照记录创建流程
  - 文字记录自动保存
  - 语音录制和转写
  - 标签建议功能
  - 心情选择功能

### 性能优化
- 使用React.memo()优化组件渲染
- 图片懒加载和缩略图生成
- 语音录制实时进度反馈
- 自动保存草稿功能

## 常见问题 (FAQ)

### Q: 拍照后图片保存在哪里？
A: 图片保存在应用的私有目录中，同时在数据库中保存路径引用。原始图片和缩略图分别存储。

### Q: 语音转写失败怎么办？
A: 系统会自动重试3次，失败后保留原始音频文件，用户可以手动重新转写或编辑内容。

### Q: 如何处理大量标签的情况？
A: 标签输入支持自动补全和历史标签快速选择，AI会根据内容智能推荐相关标签。

### Q: 离线时能否创建记录？
A: 可以，记录会保存在本地，标记为"待同步"状态，联网后自动尝试同步。

## 相关文件清单

### 核心文件
- `screens/HomeScreen.tsx` - 主页面组件
- `screens/CaptureScreen.tsx` - 记录创建页面
- `screens/EntryDetail.tsx` - 记录详情页面

### 组件文件
- `components/PhotoPicker.tsx` - 图片选择组件
- `components/TextEditor.tsx` - 文本编辑组件
- `components/VoiceRecorder.tsx` - 语音录制组件
- `components/TagInput.tsx` - 标签输入组件
- `components/MoodSelector.tsx` - 心情选择组件
- `components/AITagSuggestions.tsx` - AI标签建议组件
- `components/EntryList.tsx` - 记录列表组件

### 语音相关组件
- `components/TranscriptionEditor.tsx` - 转录编辑器
- `components/TranscriptionLanguageSelector.tsx` - 语言选择器
- `components/TranscriptionProgress.tsx` - 转录进度显示

### Hooks
- `hooks/useAITags.ts` - AI标签建议Hook
- `hooks/useAutoSave.ts` - 自动保存Hook
- `hooks/useSaveEntry.ts` - 保存记录Hook

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建capture模块文档
- 整理模块结构和接口定义
- 更新测试覆盖率统计
- 添加常见问题解答