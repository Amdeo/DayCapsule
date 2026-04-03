/**
 * 推送通知服务
 * 负责请求权限、调度/取消每日提醒
 */

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = 'daily-memory-reminder';
const DEFAULT_HOUR = 20; // 晚上 8 点

export class NotificationService {
  /** 请求通知权限，返回是否已授权 */
  static async requestPermission(): Promise<boolean> {
    if (process.env.EXPO_OS === 'web') return false;

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /** 调度每日定时提醒（默认晚上 8 点） */
  static async scheduleDailyReminder(hour = DEFAULT_HOUR): Promise<void> {
    await this.cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: '记录今天的记忆 📝',
        body: '今天有什么值得记录的瞬间吗？',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  }

  /** 取消每日提醒 */
  static async cancelDailyReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  }

  /** 检查每日提醒是否已调度 */
  static async isReminderScheduled(): Promise<boolean> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((n) => n.identifier === DAILY_REMINDER_ID);
  }
}
