/**
 * 日志工具
 * 开发环境显示所有日志,生产环境仅显示错误
 * 生产环境错误会自动发送到 Sentry
 */

import * as Sentry from '@sentry/react-native';

const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // 错误始终记录到控制台
    console.error(...args);

    // 生产环境发送到 Sentry
    if (!isDev) {
      const error = args[0];
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), 'error');
      }
    }
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
