import { Linking } from 'react-native';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : null;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message.length > 0 ? message : null;
  }

  return null;
}

function createPrimaryOnlyFeedback(
  title: string,
  message: string,
  dedupeKey: string,
): ErrorFeedbackRequest {
  return {
    title,
    message,
    dedupeKey,
    actions: [{ label: '知道了', role: 'primary' }],
  };
}

export function buildAppInitializationFailedFeedback(): ErrorFeedbackRequest {
  return createPrimaryOnlyFeedback(
    '初始化失败',
    '应用启动遇到问题，请重启应用。如果问题持续，请联系支持。',
    'app-initialization-failed',
  );
}

export function buildLoginFailedFeedback(error: unknown, isRegister = false): ErrorFeedbackRequest {
  return createPrimaryOnlyFeedback(
    isRegister ? '注册失败' : '登录失败',
    getErrorMessage(error) ?? '请检查网络连接后重试。',
    isRegister ? 'auth-register-failed' : 'auth-login-failed',
  );
}

export function buildCloudSyncFailedFeedback(error: unknown): ErrorFeedbackRequest {
  return createPrimaryOnlyFeedback(
    '云同步失败',
    getErrorMessage(error) ?? '请检查网络连接后重试。',
    'cloud-sync-failed',
  );
}

export function buildNotificationPermissionFeedback(): ErrorFeedbackRequest {
  return {
    title: '权限不足',
    message: '请在系统设置中允许通知权限后再开启。',
    dedupeKey: 'notification-permission-denied',
    actions: [
      { label: '取消', role: 'secondary' },
      {
        label: '去设置',
        role: 'primary',
        onPress: () => Linking.openURL('app-settings:'),
      },
    ],
  };
}

export function buildBackupExportFailedFeedback(): ErrorFeedbackRequest {
  return createPrimaryOnlyFeedback(
    '保存失败',
    '无法将备份保存到所选目录，请重试。',
    'backup-export-save-failed',
  );
}

export function buildBackupImportFailedFeedback(error: unknown): ErrorFeedbackRequest {
  return createPrimaryOnlyFeedback(
    '导入失败',
    getErrorMessage(error) ?? '无法解析备份文件，请确认格式正确。',
    'backup-import-failed',
  );
}
