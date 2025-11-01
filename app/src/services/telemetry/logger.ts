/**
 * 日志脱敏工具
 * 确保敏感内容不出现在日志中
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sensitivePatterns = [
    // 手机号
    /1[3-9]\d{9}/g,
    // 邮箱
    /[\w.-]+@[\w.-]+\.\w+/g,
    // 身份证号
    /\d{17}[\dXx]/g,
    // 银行卡号
    /\d{16,19}/g,
    // API 密钥（常见格式）
    /[a-zA-Z0-9]{32,}/g,
  ];

  private sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'privateKey',
    'credential',
  ];

  /**
   * 脱敏处理
   */
  private sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data);
    }

    return data;
  }

  /**
   * 脱敏字符串
   */
  private sanitizeString(str: string): string {
    let sanitized = str;

    // 替换敏感模式
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, match => {
        const len = match.length;
        if (len <= 4) {
          return '***';
        }
        // 保留前2位和后2位
        return match.substring(0, 2) + '*'.repeat(len - 4) + match.substring(len - 2);
      });
    });

    return sanitized;
  }

  /**
   * 脱敏对象
   */
  private sanitizeObject(obj: any): any {
    const sanitized: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // 检查是否是敏感键
        if (this.isSensitiveKey(key)) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = this.sanitize(obj[key]);
        }
      }
    }

    return sanitized;
  }

  /**
   * 检查是否是敏感键
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase()));
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message: this.sanitizeString(message),
      timestamp: Date.now(),
      data: data ? this.sanitize(data) : undefined,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 在开发环境输出到控制台
    if (__DEV__) {
      const consoleMethod =
        level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](`[${level}] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Debug 日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info 日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning 日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error 日志
   */
  error(message: string, error?: Error | any): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    this.log(LogLevel.ERROR, message, errorData);
  }

  /**
   * 获取所有日志
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 导出日志（用于调试）
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 添加自定义敏感模式
   */
  addSensitivePattern(pattern: RegExp): void {
    this.sensitivePatterns.push(pattern);
  }

  /**
   * 添加自定义敏感键
   */
  addSensitiveKey(key: string): void {
    this.sensitiveKeys.push(key);
  }
}

export const logger = new Logger();
