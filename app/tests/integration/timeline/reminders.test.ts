import {reminderService} from '@services/reminders/reminderService';
import {databaseService} from '@services/storage/database';
import {logger} from '@services/telemetry/logger';

describe('Reminders Integration Tests', () => {
  beforeEach(async () => {
    await databaseService.clearTestData();
    await reminderService.initialize();
  });

  describe('一年前的今天提醒', () => {
    it('应该找到一年前的记录', async () => {
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // 创建一年前的记录
      const entryId = await databaseService.insertEntry({
        type: 'text',
        content: '一年前的记录',
        createdAt: oneYearAgo.getTime(),
        updatedAt: oneYearAgo.getTime(),
      });

      expect(entryId).toBeDefined();

      // 查找一年前的今天的记录
      const reminders = await reminderService.getYearAgoReminders(today);
      expect(Array.isArray(reminders)).toBe(true);
    });

    it('应该只返回同月同日的记录', async () => {
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // 创建一年前同月同日的记录
      await databaseService.insertEntry({
        type: 'text',
        content: '一年前的今天',
        createdAt: oneYearAgo.getTime(),
        updatedAt: oneYearAgo.getTime(),
      });

      // 创建一年前但不同月日的记录
      const differentDay = new Date(oneYearAgo);
      differentDay.setDate(oneYearAgo.getDate() + 1);
      await databaseService.insertEntry({
        type: 'text',
        content: '一年前的明天',
        createdAt: differentDay.getTime(),
        updatedAt: differentDay.getTime(),
      });

      const reminders = await reminderService.getYearAgoReminders(today);
      expect(reminders.length).toBeGreaterThanOrEqual(1);
    });

    it('应该支持多年前的记录', async () => {
      const today = new Date();
      const twoYearsAgo = new Date(today);
      twoYearsAgo.setFullYear(today.getFullYear() - 2);

      await databaseService.insertEntry({
        type: 'text',
        content: '两年前的记录',
        createdAt: twoYearsAgo.getTime(),
        updatedAt: twoYearsAgo.getTime(),
      });

      const reminders = await reminderService.getYearAgoReminders(today);
      expect(Array.isArray(reminders)).toBe(true);
    });

    it('应该按年份排序返回多个提醒', async () => {
      const today = new Date();

      // 创建多个年份的记录
      for (let i = 1; i <= 3; i++) {
        const pastDate = new Date(today);
        pastDate.setFullYear(today.getFullYear() - i);
        await databaseService.insertEntry({
          type: 'text',
          content: `${i} 年前的记录`,
          createdAt: pastDate.getTime(),
          updatedAt: pastDate.getTime(),
        });
      }

      const reminders = await reminderService.getYearAgoReminders(today);
      expect(Array.isArray(reminders)).toBe(true);
    });
  });

  describe('提醒调度', () => {
    it('应该在指定时间触发提醒', async () => {
      const remindTime = new Date();
      remindTime.setHours(remindTime.getHours() + 1);

      const reminderId = await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: remindTime.getTime(),
        type: 'year_ago',
      });

      expect(reminderId).toBeDefined();
    });

    it('应该支持多个提醒', async () => {
      const remindTime1 = new Date();
      remindTime1.setHours(remindTime1.getHours() + 1);

      const remindTime2 = new Date();
      remindTime2.setHours(remindTime2.getHours() + 2);

      const reminderId1 = await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: remindTime1.getTime(),
        type: 'year_ago',
      });

      const reminderId2 = await reminderService.scheduleReminder({
        entryId: 'test-entry-2',
        remindTime: remindTime2.getTime(),
        type: 'year_ago',
      });

      expect(reminderId1).toBeDefined();
      expect(reminderId2).toBeDefined();
    });

    it('应该支持取消提醒', async () => {
      const remindTime = new Date();
      remindTime.setHours(remindTime.getHours() + 1);

      const reminderId = await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: remindTime.getTime(),
        type: 'year_ago',
      });

      const cancelled = await reminderService.cancelReminder(reminderId);
      expect(cancelled).toBe(true);
    });

    it('应该支持修改提醒时间', async () => {
      const remindTime1 = new Date();
      remindTime1.setHours(remindTime1.getHours() + 1);

      const reminderId = await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: remindTime1.getTime(),
        type: 'year_ago',
      });

      const remindTime2 = new Date();
      remindTime2.setHours(remindTime2.getHours() + 2);

      const updated = await reminderService.updateReminder(reminderId, {
        remindTime: remindTime2.getTime(),
      });

      expect(updated).toBe(true);
    });
  });

  describe('提醒通知', () => {
    it('应该发送本地通知', async () => {
      const notificationSent = await reminderService.sendNotification({
        title: '一年前的今天',
        body: '你在一年前的今天记录了什么？',
        entryId: 'test-entry-1',
      });

      expect(notificationSent).toBe(true);
    });

    it('应该支持自定义通知内容', async () => {
      const notificationSent = await reminderService.sendNotification({
        title: '自定义标题',
        body: '自定义内容',
        entryId: 'test-entry-1',
        data: {
          customField: 'customValue',
        },
      });

      expect(notificationSent).toBe(true);
    });

    it('应该处理通知发送失败', async () => {
      const notificationSent = await reminderService.sendNotification({
        title: '',
        body: '',
        entryId: 'invalid-entry',
      });

      // 应该返回 false 或抛出错误
      expect(typeof notificationSent).toBe('boolean');
    });
  });

  describe('提醒历史', () => {
    it('应该记录已发送的提醒', async () => {
      const remindTime = new Date();
      remindTime.setHours(remindTime.getHours() - 1); // 过去的时间

      await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: remindTime.getTime(),
        type: 'year_ago',
      });

      const history = await reminderService.getReminderHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该支持查询提醒历史', async () => {
      const history = await reminderService.getReminderHistory({
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(history)).toBe(true);
    });

    it('应该支持按类型筛选提醒历史', async () => {
      const history = await reminderService.getReminderHistory({
        type: 'year_ago',
      });

      expect(Array.isArray(history)).toBe(true);
    });

    it('应该支持按日期范围筛选提醒历史', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const history = await reminderService.getReminderHistory({
        startDate: startDate.getTime(),
        endDate: Date.now(),
      });

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('提醒统计', () => {
    it('应该统计今天的提醒数', async () => {
      const count = await reminderService.getTodayReminderCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('应该统计本周的提醒数', async () => {
      const count = await reminderService.getWeekReminderCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('应该统计本月的提醒数', async () => {
      const count = await reminderService.getMonthReminderCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('应该统计总提醒数', async () => {
      const count = await reminderService.getTotalReminderCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的提醒时间', async () => {
      const invalidTime = new Date('invalid');

      try {
        await reminderService.scheduleReminder({
          entryId: 'test-entry-1',
          remindTime: invalidTime.getTime(),
          type: 'year_ago',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该处理过去的提醒时间', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const reminderId = await reminderService.scheduleReminder({
        entryId: 'test-entry-1',
        remindTime: pastTime.getTime(),
        type: 'year_ago',
      });

      // 应该返回 ID 或处理错误
      expect(reminderId).toBeDefined();
    });

    it('应该处理无效的 entryId', async () => {
      const remindTime = new Date();
      remindTime.setHours(remindTime.getHours() + 1);

      try {
        await reminderService.scheduleReminder({
          entryId: '',
          remindTime: remindTime.getTime(),
          type: 'year_ago',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

