import {useEffect, useCallback, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {reminderService} from '@services/reminders/reminderService';
import {logger} from '@services/telemetry/logger';

export interface ReminderNotificationConfig {
  enableYearAgoReminders?: boolean;
  enableCustomReminders?: boolean;
  checkInterval?: number; // 毫秒
  notificationTime?: string; // HH:mm 格式
}

export interface UseReminderNotificationsReturn {
  isEnabled: boolean;
  enableReminders: () => void;
  disableReminders: () => void;
  checkReminders: () => Promise<void>;
  getReminderCount: () => Promise<number>;
}

export const useReminderNotifications = (
  config: ReminderNotificationConfig = {},
): UseReminderNotificationsReturn => {
  const {
    enableYearAgoReminders = true,
    enableCustomReminders = true,
    checkInterval = 60000, // 1 分钟
    notificationTime = '09:00',
  } = config;

  const isEnabledRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // 检查提醒
  const checkReminders = useCallback(async () => {
    try {
      if (!isEnabledRef.current) {
        return;
      }

      const today = new Date();
      const currentTime = today.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // 检查是否到达通知时间
      if (currentTime !== notificationTime) {
        return;
      }

      // 获取一年前的今天的提醒
      if (enableYearAgoReminders) {
        const reminders = await reminderService.getYearAgoReminders(today);

        if (reminders.length > 0) {
          logger.info('Found year ago reminders', {count: reminders.length});

          // 发送通知
          for (const reminder of reminders) {
            await reminderService.sendNotification({
              title: '一年前的今天',
              body: `你在一年前的今天记录了: ${reminder.content?.substring(0, 50) || '一条记录'}`,
              entryId: reminder.id,
            });
          }
        }
      }

      // 检查自定义提醒
      if (enableCustomReminders) {
        const todayCount = await reminderService.getTodayReminderCount();
        logger.info('Today reminder count', {count: todayCount});
      }
    } catch (error) {
      logger.error('Failed to check reminders', {error});
    }
  }, [enableYearAgoReminders, enableCustomReminders, notificationTime]);

  // 启用提醒
  const enableReminders = useCallback(() => {
    if (isEnabledRef.current) {
      return;
    }

    isEnabledRef.current = true;

    // 启动定期检查
    checkIntervalRef.current = setInterval(() => {
      checkReminders();
    }, checkInterval);

    logger.info('Reminders enabled');
  }, [checkReminders, checkInterval]);

  // 禁用提醒
  const disableReminders = useCallback(() => {
    if (!isEnabledRef.current) {
      return;
    }

    isEnabledRef.current = false;

    // 清除定期检查
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    logger.info('Reminders disabled');
  }, []);

  // 获取提醒数量
  const getReminderCount = useCallback(async (): Promise<number> => {
    try {
      const count = await reminderService.getTotalReminderCount();
      return count;
    } catch (error) {
      logger.error('Failed to get reminder count', {error});
      return 0;
    }
  }, []);

  // 监听应用状态变化
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) === null &&
        nextAppState.match(/inactive|background/) !== null
      ) {
        // 应用进入后台
        disableReminders();
      } else if (
        appStateRef.current.match(/inactive|background/) !== null &&
        nextAppState === 'active'
      ) {
        // 应用进入前台
        enableReminders();
        // 立即检查一次
        checkReminders();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enableReminders, disableReminders, checkReminders]);

  // 初始化
  useEffect(() => {
    enableReminders();

    return () => {
      disableReminders();
    };
  }, [enableReminders, disableReminders]);

  return {
    isEnabled: isEnabledRef.current,
    enableReminders,
    disableReminders,
    checkReminders,
    getReminderCount,
  };
};

