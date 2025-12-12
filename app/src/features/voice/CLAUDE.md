[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [features](../) > **voice**

# Voice 模块文档

## 模块职责

Voice模块专门处理语音录制、播放和转写功能，提供高质量的音频录制体验，支持实时转写和多语言识别，并包含录音中断处理等高级功能。

## 入口与启动

### 主入口文件
- `VoiceRecordScreen.tsx` - 语音录制专用页面

### 启动流程
1. 从HomeScreen选择语音录制或进入专门的语音页面
2. 请求麦克风权限
3. 开始录音，显示波形和计时
4. 录音结束后自动触发转写
5. 显示转写结果并支持编辑

## 对外接口

### 主要组件接口
```typescript
// VoiceRecordScreen props
interface VoiceRecordScreenProps {}

// 录音组件props
interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number;
}

// 主要导出组件
export { VoiceRecordScreen } from './screens/VoiceRecordScreen';
```

### Hooks接口
```typescript
// 语音转写Hook
interface UseTranscriptionReturn {
  transcribe: (audioUri: string, language?: string) => Promise<TranscriptionResult>;
  isTranscribing: boolean;
  progress: number;
  error: string | null;
}

// 录音中断处理Hook
interface UseRecordingInterruptionReturn {
  handleInterruption: () => void;
  resumeRecording: () => void;
  isInterrupted: boolean;
}
```

## 关键依赖与配置

### 内部依赖
- `@services/speechToText` - 语音转写服务
- `@services/storage/audioStorage` - 音频存储服务
- `@hooks/useTranscription` - 转写Hook

### 外部依赖
- `react-native-audio-recorder-player` - 音频录制播放
- `react-native-permissions` - 权限管理
- `react-native-fs` - 文件系统操作

### 配置文件
- `@services/speechToText/config.ts` - 转写服务配置
- `@config/tencentCloud.ts` - 腾讯云ASR配置

## 数据模型

### 录音配置
```typescript
interface RecordingConfig {
  sampleRate: number;
  bitRate: number;
  channels: number;
  format: 'aac' | 'mp4' | 'wav';
  quality: 'low' | 'medium' | 'high';
}
```

### 转写结果
```typescript
interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}
```

### 语音条目
```typescript
interface VoiceEntry extends LifelogEntry {
  voicePath: string;
  duration: number;
  transcription?: string;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
  waveform?: number[];
}
```

## 测试与质量

### 测试覆盖率
- **组件测试覆盖率**: 75%
- **关键测试场景**:
  - 语音录制功能
  - 实时波形显示
  - 录音中断处理
  - 语音转写准确性
  - 音频播放功能
  - 多语言支持

### 性能优化
- 实时音频数据压缩
- 波形数据采样优化
- 转写进度实时反馈
- 音频文件缓存管理

### Hook优化
- `useTranscription` - 转写功能Hook
- `useRecordingInterruption` - 录音中断处理Hook
- `useVoicePerformance` - 性能监控Hook

## 常见问题 (FAQ)

### Q: 支持哪些语言的语音转写？
A: 支持中文、英文等多种语言，可在录制前或录制后选择转写语言。

### Q: 录音时被打断怎么办？
A: 系统会自动保存已录制的内容，支持恢复录音或保存当前片段。

### Q: 转写结果不准确如何处理？
A: 提供文本编辑功能，支持手动修改转写结果，保留原始音频文件。

### Q: 音频文件如何存储？
A: 音频文件保存在应用私有目录，使用压缩格式减少存储空间。

### Q: 如何处理长语音录制？
A: 支持30秒到5分钟的录音长度，超过最大时长会自动停止并保存。

## 相关文件清单

### 核心文件
- `screens/VoiceRecordScreen.tsx` - 语音录制主页面

### 录音组件
- `components/VoiceRecorder.tsx` - 语音录制组件
- `components/RecordButton.tsx` - 录音按钮组件
- `components/AudioPlayer.tsx` - 音频播放器组件
- `components/WaveformVisualizer.tsx` - 波形可视化组件

### 转写相关组件
- `components/TranscriptEditor.tsx` - 转录文本编辑器
- `components/TranscriptionProgress.tsx` - 转写进度显示

### Hooks
- `hooks/useTranscription.ts` - 转写功能Hook
- `hooks/useRecordingInterruption.ts` - 录音中断处理Hook
- `hooks/useVoicePerformance.ts` - 性能监控Hook

## 变更记录 (Changelog)

### 2025-11-03 05:40:04
- 创建voice模块文档
- 定义语音录制和转写接口
- 添加性能优化说明
- 更新测试覆盖率统计