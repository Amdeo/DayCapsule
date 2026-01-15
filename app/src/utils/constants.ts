/**
 * 应用常量定义
 */

/**
 * 图片压缩预设
 */
export const COMPRESSION_PRESETS = {
  // 高质量（原始保存）
  HIGH: {
    quality: 0.95,
    width: 3000,
    format: 'JPEG' as const,
    description: '高质量 (95%)',
  },

  // 平衡（显示用）
  MEDIUM: {
    quality: 0.75,
    width: 1080,
    format: 'JPEG' as const,
    description: '平衡质量 (75%)',
  },

  // 低质量（缩略图）
  LOW: {
    quality: 0.5,
    width: 256,
    format: 'JPEG' as const,
    description: '低质量 (50%)',
  },

  // Web 优化
  WEB: {
    quality: 0.7,
    width: 800,
    format: 'WEBP' as const,
    description: 'Web 优化',
  },
};

/**
 * 音频编码预设
 */
export const AUDIO_PRESETS = {
  // 高质量（无损）
  HIGH: {
    bitrate: 320,
    sampleRate: 48000,
    quality: 'high' as const,
    description: '高质量 (320kbps)',
  },

  // 平衡
  MEDIUM: {
    bitrate: 128,
    sampleRate: 44100,
    quality: 'medium' as const,
    description: '平衡质量 (128kbps)',
  },

  // 低质量（节省空间）
  LOW: {
    bitrate: 64,
    sampleRate: 22050,
    quality: 'low' as const,
    description: '低质量 (64kbps)',
  },
};

/**
 * 存储配额设置
 */
export const STORAGE_QUOTA = {
  // 单个文件限制
  MAX_PHOTO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB

  // 总容量限制
  MAX_TOTAL_SIZE: 2 * 1024 * 1024 * 1024, // 2GB

  // 缓存限制
  MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
};

/**
 * 文件类型 MIME 类型
 */
export const MIME_TYPES = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  MP3: 'audio/mpeg',
  M4A: 'audio/mp4',
  AAC: 'audio/aac',
  OGG: 'audio/ogg',
  WAV: 'audio/wav',
};

/**
 * 文件扩展名
 */
export const FILE_EXTENSIONS = {
  JPEG: 'jpg',
  PNG: 'png',
  GIF: 'gif',
  WEBP: 'webp',
  MP3: 'mp3',
  M4A: 'm4a',
  AAC: 'aac',
  OGG: 'ogg',
  WAV: 'wav',
};

/**
 * 超时设置
 */
export const TIMEOUTS = {
  PHOTO_CAPTURE: 30000, // 30秒
  PHOTO_UPLOAD: 60000, // 60秒
  AUDIO_RECORDING: 3600000, // 1小时
  AUDIO_UPLOAD: 120000, // 2分钟
  FILE_OPERATION: 10000, // 10秒
};

/**
 * 缓存策略
 */
export const CACHE_POLICY = {
  // 缓存保留时间
  THUMBNAIL_TTL: 7 * 24 * 60 * 60 * 1000, // 7天
  TEMP_FILE_TTL: 24 * 60 * 60 * 1000, // 1天
  METADATA_TTL: 30 * 24 * 60 * 60 * 1000, // 30天

  // LRU 缓存限制
  MAX_ITEMS: 1000,
  MAX_MEMORY: 100 * 1024 * 1024, // 100MB
};

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  PERMISSION_DENIED: '权限被拒绝，请在设置中允许访问',
  STORAGE_FULL: '存储空间不足，请清理一些文件',
  INVALID_FILE: '无效的文件格式',
  FILE_TOO_LARGE: '文件过大，请选择更小的文件',
  DEVICE_ERROR: '设备错误，请重试',
  NETWORK_ERROR: '网络错误，请检查连接',
  UNKNOWN_ERROR: '发生未知错误，请重试',
  CODEC_ERROR: '不支持的音频格式',
  CAMERA_ERROR: '相机错误，请检查相机权限',
  MICROPHONE_ERROR: '麦克风错误，请检查麦克风权限',
};

/**
 * 成功提示
 */
export const SUCCESS_MESSAGES = {
  PHOTO_SAVED: '照片已保存',
  VOICE_SAVED: '语音已保存',
  FILE_DELETED: '文件已删除',
  CACHE_CLEARED: '缓存已清理',
  UPLOAD_COMPLETE: '上传完成',
};

/**
 * 记录类型配置
 */
export const ENTRY_TYPES = {
  TEXT: {
    id: 'text',
    label: '文本',
    icon: '📝',
    color: '#6200ee',
  },
  PHOTO: {
    id: 'photo',
    label: '照片',
    icon: '📷',
    color: '#00bcd4',
  },
  VOICE: {
    id: 'voice',
    label: '语音',
    icon: '🎤',
    color: '#ff6f00',
  },
  VIDEO: {
    id: 'video',
    label: '视频',
    icon: '🎬',
    color: '#d32f2f',
  },
};

/**
 * UI 配置
 */
export const UI_CONFIG = {
  THUMBNAIL_SIZE: 256,
  PREVIEW_SIZE: 1080,
  ANIMATION_DURATION: 300,
  DEBOUNCE_TIME: 300,
  TOAST_DURATION: 2000,
};

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

/**
 * 性能指标阈值
 */
export const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 1000, // 毫秒
  SLOW_RENDER: 500, // 毫秒
  LARGE_FILE: 10 * 1024 * 1024, // 10MB
};
