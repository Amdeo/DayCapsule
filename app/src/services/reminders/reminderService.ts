import {databaseService} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';
import PushNotification from 'react-native-push-notification';

export interface ReminderConfig {
  entryId: string;
  remindTime: number;
  type: 'year_ago' | 'custom';
  title?: string;
  body?: string;
}

export interface ReminderRecord {
  id: string;
  entryId: string;
  remindTime: number;
  type: string;
  createdAt: number;
  sentAt?: number;
  status: 'pending' | 'sent' | 'cancelled';
}

class ReminderService {
  private reminders: Map<string, ReminderRecord> = new Map();
  private isInitialized = false;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // 配置推送通知
      PushNotification.configure({
        onNotification: (notification: any) => {
          logger.info('Notification received', {notification});
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: true,
      });

      this.isInitialized = true;
      logger.info('Reminder service initialized');

      // 加载待处理的提醒
      await this.loadPendingReminders();
    } catch (error) {
      logger.error('Failed to initialize reminder service', {error});
    }
  }

  async getYearAgoReminders(date: Date): Promise<any[]> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      // 查询一年前同月同日的记录
      const oneYearAgo = new Date(year - 1, month, day);
      const startOfDay = new Date(oneYearAgo);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(oneYearAgo);
      endOfDay.setHours(23, 59, 59, 999);

      const entries = await databaseService.queryEntries({
        startDate: startOfDay.getTime(),
        endDate: endOfDay.getTime(),
      });

      logger.info('Year ago reminders fetched', {
        date: date.toISOString(),
        count: entries.length,
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get year ago reminders', {error});
      return [];
    }
  }

  async scheduleReminder(config: ReminderConfig): Promise<string> {
    try {
      const reminderId = `reminder_${Date.now()}`;
      const reminder: ReminderRecord = {
        id: reminderId,
        entryId: config.entryId,
        remindTime: config.remindTime,
        type: config.type,
        createdAt: Date.now(),
        status: 'pending',
      };

      this.reminders.set(reminderId, reminder);

      // 计算延迟时间
      const delay = config.remindTime - Date.now();
      if (delay > 0) {
        // 安排通知
        const timeout = setTimeout(async () => {
          await this.sendNotification({
            title: config.title || '一年前的今天',
            body: config.body || '你在一年前的今天记录了什么？',
            entryId: config.entryId,
          });

          reminder.sentAt = Date.now();
          reminder.status = 'sent';
        }, delay);

        this.scheduledNotifications.set(reminderId, timeout);
      }

      logger.info('Reminder scheduled', {reminderId, remindTime: new Date(config.remindTime)});
      return reminderId;
    } catch (error) {
      logger.error('Failed to schedule reminder', {error});
      throw error;
    }
  }

  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      const reminder = this.reminders.get(reminderId);
      if (!reminder) {
        return false;
      }

      // 取消已安排的通知
      const timeout = this.scheduledNotifications.get(reminderId);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledNotifications.delete(reminderId);
      }

      reminder.status = 'cancelled';
      logger.info('Reminder cancelled', {reminderId});
      return true;
    } catch (error) {
      logger.error('Failed to cancel reminder', {error});
      return false;
    }
  }

  async updateReminder(reminderId: string, updates: Partial<ReminderConfig>): Promise<boolean> {
    try {
      const reminder = this.reminders.get(reminderId);
      if (!reminder) {
        return false;
      }

      // 取消旧的通知
      await this.cancelReminder(reminderId);

      // 创建新的提醒
      if (updates.remindTime) {
        const newReminderId = await this.scheduleReminder({
          entryId: updates.entryId || reminder.entryId,
          remindTime: updates.remindTime,
          type: (updates.type as any) || reminder.type,
          title: updates.title,
          body: updates.body,
        });

        this.reminders.delete(reminderId);
        logger.info('Reminder updated', {oldId: reminderId, newId: newReminderId});
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to update reminder', {error});
      return false;
    }
  }

  async sendNotification(config: {
    title: string;
    body: string;
    entryId: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    try {
      PushNotification.localNotification({
        title: config.title,
        message: config.body,
        userInfo: {
          entryId: config.entryId,
          ...config.data,
        },
      });

      logger.info('Notification sent', {title: config.title});
      return true;
    } catch (error) {
      logger.error('Failed to send notification', {error});
      return false;
    }
  }

  async getReminderHistory(options?: {
    type?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
    offset?: number;
  }): Promise<ReminderRecord[]> {
    try {
      let history = Array.from(this.reminders.values());

      if (options?.type) {
        history = history.filter(r => r.type === options.type);
      }

      if (options?.startDate && options?.endDate) {
        history = history.filter(
          r => r.createdAt >= options.startDate! && r.createdAt <= options.endDate!,
        );
      }

      if (options?.limit) {
        const offset = options.offset || 0;
        history = history.slice(offset, offset + options.limit);
      }

      return history;
    } catch (error) {
      logger.error('Failed to get reminder history', {error});
      return [];
    }
  }

  async getTodayReminderCount(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const reminders = Array.from(this.reminders.values()).filter(
        r => r.remindTime >= today.getTime() && r.remindTime < tomorrow.getTime(),
      );

      return reminders.length;
    } catch (error) {
      logger.error('Failed to get today reminder count', {error});
      return 0;
    }
  }

  async getWeekReminderCount(): Promise<number> {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const reminders = Array.from(this.reminders.values()).filter(
        r => r.remindTime >= weekStart.getTime() && r.remindTime < weekEnd.getTime(),
      );

      return reminders.length;
    } catch (error) {
      logger.error('Failed to get week reminder count', {error});
      return 0;
    }
  }

  async getMonthReminderCount(): Promise<number> {
    try {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const reminders = Array.from(this.reminders.values()).filter(
        r => r.remindTime >= monthStart.getTime() && r.remindTime <= monthEnd.getTime(),
      );

      return reminders.length;
    } catch (error) {
      logger.error('Failed to get month reminder count', {error});
      return 0;
    }
  }

  async getTotalReminderCount(): Promise<number> {
    return this.reminders.size;
  }

  private async loadPendingReminders(): Promise<void> {
    try {
      // 从数据库加载待处理的提醒
      // 这里应该从数据库查询
      logger.info('Pending reminders loaded');
    } catch (error) {
      logger.error('Failed to load pending reminders', {error});
    }
  }
}

export const reminderService = new ReminderService();

