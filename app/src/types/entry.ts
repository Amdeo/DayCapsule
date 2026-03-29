/**
 * 扩展的 Entry 数据模型
 * 支持文本、照片、语音等多种媒体类型
 */

export type MediaIntegrityStatus =
  | 'healthy'
  | 'missing'
  | 'upload_mismatch'
  | 'download_mismatch'
  | 'cloud_content_suspect'
  | 'repair_prompt_required'
  | 'repair_pending'
  | 'repair_failed';

export type PhotoRepairSource = 'local-original';

export interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string; // 文本内容或媒体文件 URI
  timestamp: number;
  tags?: string[];

  // 多媒体扩展字段
  media?: MediaInfo[];  // photos: 1–9 items; voice: always 1 item

  // 语音转文字
  transcription?: TranscriptionInfo;

  // 录音状态（仅在 type 为 'voice' 时使用）
  recordingStatus?: 'recording' | 'paused' | 'uploading' | 'stopping' | 'completed';
  recordingDuration?: number; // 录音时长（秒）

  // 编辑与同步
  editedAt?: number;
  updatedAt?: number; // 最近一次修改时间（来自 updated_at）
  lastEditedDeviceId?: string; // 最后修改设备（云同步用，可选）
  baseUpdatedAt?: number; // 编辑时的基线版本，用于构造同步请求
  conflictedCopyOf?: string; // 若为冲突副本，则指向原 entryId
  userId?: string; // 当前记录所属账号（云同步用，可选）
  deleted?: boolean; // 软删除标记，用于本地优先同步
  syncOp?: 'create' | 'update' | 'delete';
  syncStatus: 'pending' | 'pending_upload' | 'uploading' | 'synced' | 'failed' | 'pending_delete' | 'conflict-local-copy';
  localReadyState?: 'processing' | 'ready';
}

/**
 * 媒体信息
 */
export interface MediaInfo {
  uri: string; // 本地文件路径
  remoteUri?: string; // 云端原始地址（若存在）
  mimeType: string; // 媒体类型 (image/jpeg, audio/m4a)
  size: number; // 文件大小（字节）
  duration?: number; // 音频/视频时长（秒）
  thumbnail?: string; // 缩略图 URI
  remoteThumbnail?: string; // 云端缩略图地址（若存在）

  metadata?: {
    width?: number; // 图片宽度
    height?: number; // 图片高度
    aspectRatio?: number; // 宽高比 (width / height)
    bitrate?: number; // 音频比特率
    sampleRate?: number; // 采样率
    localMediaId?: string; // 本地稳定媒体 ID
    sourceHash?: string; // 拍照/选图原始文件 hash
    persistedHash?: string; // 本地保存后的文件 hash
    remoteHash?: string; // 服务端确认的远端文件 hash
    downloadedHash?: string; // 下载后本地文件 hash
    integrityStatus?: MediaIntegrityStatus; // 当前完整性状态
    integrityReason?: string | null; // 完整性异常原因
    lastVerifiedAt?: number; // 最近一次校验时间
    repairable?: boolean; // 是否具备修复条件
    repairSource?: PhotoRepairSource; // 当前可用修复源
    createdAt: number; // 创建时间
    modifiedAt: number; // 修改时间
  };

  compression?: {
    originalSize: number; // 原始大小
    compressionRatio: number; // 压缩比
    quality: 'low' | 'medium' | 'high'; // 压缩质量
  };
}

/**
 * 语音转文字信息
 */
export interface TranscriptionInfo {
  text: string; // 转文字结果
  language: string; // 语言代码 (e.g., 'zh-CN', 'en-US')
  confidence: number; // 置信度 (0-1)
  model: string; // 转录模型 (e.g., 'local' or 'cloud')
  duration: number; // 转录耗时（毫秒）
}

/**
 * 媒体文件记录
 */
export interface MediaFile {
  id: string;
  entryId: string; // 关联的 entry ID
  type: 'photo' | 'voice' | 'video';
  uri: string; // 本地存储路径
  size: number;
  mimeType: string;

  compression?: {
    originalSize: number;
    compressionRatio: number;
    quality: 'low' | 'medium' | 'high';
  };

  state: 'local' | 'cached' | 'uploaded' | 'archived';
  createdAt: number;
  accessedAt?: number; // 最后访问时间
}

/**
 * 权限状态
 */
export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'undetermined';
  mediaLibrary: 'granted' | 'denied' | 'undetermined';
  microphone: 'granted' | 'denied' | 'undetermined';
  photoLibrary: 'granted' | 'denied' | 'undetermined';
}

export type PermissionType = keyof PermissionStatus;

/**
 * 媒体错误
 */
export interface MediaError extends Error {
  code:
    | 'PERMISSION_DENIED'
    | 'DEVICE_STORAGE_FULL'
    | 'INVALID_FILE'
    | 'CODEC_ERROR'
    | 'NETWORK_ERROR'
    | 'MICROPHONE_ERROR'
    | 'CAMERA_ERROR'
    | 'DEVICE_ERROR'
    | 'UNKNOWN';
  userMessage: string;
  recoveryAction?: () => void;
}

/**
 * 压缩选项
 */
export interface CompressionOptions {
  quality: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  format?: 'JPEG' | 'PNG' | 'WEBP';
}

/**
 * 音频压缩选项
 */
export interface AudioCompressionOptions {
  bitrate?: number; // 比特率 (kbps)
  sampleRate?: number; // 采样率 (Hz)
  quality: 'low' | 'medium' | 'high';
}

export interface EntryFilters {
  type?: 'text' | 'photo' | 'voice';
  startTime?: number;
  search?: string;
  tags?: string[];
}
