/**
 * 腾讯云 ASR 配置
 *
 * 使用腾讯云语音识别 API 进行语音转文字
 * 文档: https://cloud.tencent.com/document/product/1093
 */

export interface TencentCloudConfig {
  // 腾讯云 API 密钥
  secretId: string;
  secretKey: string;
  // 地域
  region: string;
  // 项目 ID
  projectId: string;
}

export interface SpeechToTextOptions {
  // 语言代码 (zh-CN, en-US, etc.)
  language?: string;
  // 是否返回词级别的时间戳
  wordInfo?: boolean;
  // 是否过滤脏话
  filterDirty?: boolean;
  // 是否过滤语气词
  filterModal?: boolean;
  // 是否过滤标点符号
  filterPunc?: boolean;
  // 是否返回句子级别的置信度
  sentenceInfo?: boolean;
}

export interface TranscriptionResult {
  // 转录文本
  text: string;
  // 置信度 (0-100)
  confidence: number;
  // 语言
  language: string;
  // 处理时间（毫秒）
  duration: number;
  // 词级别信息
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  // 句子级别信息
  sentences?: Array<{
    sentence: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

export interface TranscriptionError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 默认配置
export const DEFAULT_SPEECH_TO_TEXT_OPTIONS: SpeechToTextOptions = {
  language: 'zh-CN',
  wordInfo: false,
  filterDirty: true,
  filterModal: true,
  filterPunc: false,
  sentenceInfo: false,
};

// 支持的语言列表
export const SUPPORTED_LANGUAGES = {
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文',
  'en-US': '英文',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'th-TH': '泰语',
  'vi-VN': '越南语',
  'ms-MY': '马来语',
  'id-ID': '印尼语',
  'fil-PH': '菲律宾语',
  'pt-BR': '葡萄牙语',
  'es-ES': '西班牙语',
  'fr-FR': '法语',
  'de-DE': '德语',
  'it-IT': '意大利语',
  'ru-RU': '俄语',
  'ar-SA': '阿拉伯语',
  'hi-IN': '印地语',
};

// 错误代码
export const ERROR_CODES = {
  INVALID_AUDIO: 'INVALID_AUDIO',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  UNKNOWN: 'UNKNOWN',
};
