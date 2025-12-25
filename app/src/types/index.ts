/**
 * MemoryCapsule 应用核心类型定义
 */

// 记录类型枚举
export enum EntryType {
  TEXT = 'text',
  PHOTO = 'photo',
  VOICE = 'voice',
  MIXED = 'mixed',
}

// 同步状态枚举
export enum SyncStatus {
  DRAFT = 'draft',
  PENDING_SYNC = 'pending_sync',
  SYNCED = 'synced',
  FAILED = 'failed',
}

// 心情枚举
export enum MoodType {
  HAPPY = '😀',
  EXCITED = '🤩',
  SAD = '😢',
  ANGRY = '😠',
  NEUTRAL = '😐',
  LOVE = '😍',
  SURPRISED = '😲',
  THINKING = '🤔',
}

// 位置信息
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

// 天气信息
export interface Weather {
  temperature: number;
  condition: string;
  humidity: number;
  icon: string;
}

// 媒体附件
export interface MediaAttachment {
  id: string;
  entryId: string;
  type: 'photo' | 'audio';
  uri: string;
  thumbnailUri?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number; // 音频时长(秒)
  width?: number;
  height?: number;
  encryptionKey?: string;
  createdAt: Date;
}

// 标签
export interface Tag {
  id: string;
  name: string;
  type: 'manual' | 'ai';
  color?: string;
  usageCount: number;
  createdAt: Date;
}

// 生活记录条目
export interface LifeLogEntry {
  id: string;
  type: EntryType;
  title?: string;
  content: string;
  mood: MoodType;
  tags: string[]; // Tag IDs
  location?: Location;
  weather?: Weather;
  mediaAttachments: MediaAttachment[];
  syncStatus: SyncStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncAt?: Date;
  aiTags?: string[]; // AI生成的标签建议
}

// 时间线视图状态
export enum TimelineView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

// 时间线筛选器
export interface TimelineFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  mood?: MoodType[];
  location?: string;
  entryType?: EntryType[];
}

// 搜索结果
export interface SearchResult {
  entry: LifeLogEntry;
  score: number;
  matchedFields: string[];
  highlights: {
    field: string;
    value: string;
  }[];
}

// 同步队列项目
export interface SyncQueueItem {
  id: string;
  entryId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  retryCount: number;
  lastAttemptAt?: Date;
  createdAt: Date;
}

// 用户设置
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  language: 'zh-CN' | 'en-US';
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string;
    oneYearAgoReminder: boolean;
  };
  privacy: {
    biometricLock: boolean;
    passwordLock: boolean;
    autoLockTimeout: number; // 分钟
    encryptData: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    lastBackupAt?: Date;
  };
  permissions: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
    photoLibrary: boolean;
  };
}

// 应用状态
export interface AppState {
  version: string;
  isInitialized: boolean;
  isLocked: boolean;
  lastActivityAt: Date;
}

// 性能指标
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// 导出选项
export interface ExportOptions {
  format: 'pdf' | 'word' | 'csv' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMedia: boolean;
  includeMetadata: boolean;
  tags?: string[];
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Redux 状态类型
export interface RootState {
  entries: EntriesState;
  timeline: TimelineState;
  search: SearchState;
  settings: SettingsState;
  sync: SyncState;
  app: AppReducerState;
}

// Redux Slice 状态
export interface EntriesState {
  entries: LifeLogEntry[];
  loading: boolean;
  error?: string;
}

export interface TimelineState {
  currentView: TimelineView;
  currentDate: Date;
  filters: TimelineFilter;
  loading: boolean;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: TimelineFilter;
  history: string[];
  loading: boolean;
}

export interface SettingsState {
  settings: UserSettings;
  loading: boolean;
}

export interface SyncState {
  queue: SyncQueueItem[];
  isOnline: boolean;
  lastSyncAt?: Date;
  loading: boolean;
}

export interface AppReducerState {
  isInitialized: boolean;
  isLocked: boolean;
  version: string;
  error?: string;
}
