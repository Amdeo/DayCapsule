import {databaseService} from './database';
import {logger} from '@services/telemetry/logger';

export interface EntryQueryResult {
  id: string;
  type: string;
  content: string;
  mediaPath?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  mood?: string;
  location?: string;
}

export interface DayViewEntry {
  hour: number;
  entries: EntryQueryResult[];
  count: number;
}

export interface WeekViewEntry {
  dayOfWeek: number;
  date: Date;
  entries: EntryQueryResult[];
  count: number;
  heat: number; // 0-100
}

export interface MonthViewEntry {
  date: number;
  entries: EntryQueryResult[];
  count: number;
  heat: number; // 0-100
}

export interface YearViewEntry {
  month: number;
  entries: EntryQueryResult[];
  count: number;
  stats: {
    totalEntries: number;
    photoCount: number;
    textCount: number;
    voiceCount: number;
  };
}

class EntryQueries {
  async getEntriesByDay(date: Date): Promise<DayViewEntry[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const entries = await databaseService.queryEntries({
        startDate: startOfDay.getTime(),
        endDate: endOfDay.getTime(),
      });

      // 按小时分组
      const hourMap = new Map<number, EntryQueryResult[]>();
      for (let i = 0; i < 24; i++) {
        hourMap.set(i, []);
      }

      entries.forEach(entry => {
        const entryDate = new Date(entry.createdAt);
        const hour = entryDate.getHours();
        const hourEntries = hourMap.get(hour) || [];
        hourEntries.push(entry);
        hourMap.set(hour, hourEntries);
      });

      // 转换为 DayViewEntry 数组
      const result: DayViewEntry[] = [];
      for (let i = 0; i < 24; i++) {
        const hourEntries = hourMap.get(i) || [];
        result.push({
          hour: i,
          entries: hourEntries,
          count: hourEntries.length,
        });
      }

      logger.info('Day view entries fetched', {
        date: date.toISOString(),
        totalEntries: entries.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get day view entries', {error});
      return [];
    }
  }

  async getEntriesByWeek(weekStart: Date): Promise<WeekViewEntry[]> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const entries = await databaseService.queryEntries({
        startDate: weekStart.getTime(),
        endDate: weekEnd.getTime(),
      });

      // 按天分组
      const dayMap = new Map<number, EntryQueryResult[]>();
      for (let i = 0; i < 7; i++) {
        dayMap.set(i, []);
      }

      entries.forEach(entry => {
        const entryDate = new Date(entry.createdAt);
        const dayOfWeek = entryDate.getDay();
        const dayEntries = dayMap.get(dayOfWeek) || [];
        dayEntries.push(entry);
        dayMap.set(dayOfWeek, dayEntries);
      });

      // 计算最大值用于热度计算
      const maxCount = Math.max(...Array.from(dayMap.values()).map(e => e.length), 1);

      // 转换为 WeekViewEntry 数组
      const result: WeekViewEntry[] = [];
      for (let i = 0; i < 7; i++) {
        const dayEntries = dayMap.get(i) || [];
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);

        result.push({
          dayOfWeek: i,
          date,
          entries: dayEntries,
          count: dayEntries.length,
          heat: (dayEntries.length / maxCount) * 100,
        });
      }

      logger.info('Week view entries fetched', {
        weekStart: weekStart.toISOString(),
        totalEntries: entries.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get week view entries', {error});
      return [];
    }
  }

  async getEntriesByMonth(date: Date): Promise<MonthViewEntry[]> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const entries = await databaseService.queryEntries({
        startDate: startOfMonth.getTime(),
        endDate: endOfMonth.getTime(),
      });

      // 按日期分组
      const dayMap = new Map<number, EntryQueryResult[]>();
      const daysInMonth = endOfMonth.getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        dayMap.set(i, []);
      }

      entries.forEach(entry => {
        const entryDate = new Date(entry.createdAt);
        const day = entryDate.getDate();
        const dayEntries = dayMap.get(day) || [];
        dayEntries.push(entry);
        dayMap.set(day, dayEntries);
      });

      // 计算最大值用于热度计算
      const maxCount = Math.max(...Array.from(dayMap.values()).map(e => e.length), 1);

      // 转换为 MonthViewEntry 数组
      const result: MonthViewEntry[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayEntries = dayMap.get(i) || [];
        result.push({
          date: i,
          entries: dayEntries,
          count: dayEntries.length,
          heat: (dayEntries.length / maxCount) * 100,
        });
      }

      logger.info('Month view entries fetched', {
        month: `${year}-${month + 1}`,
        totalEntries: entries.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get month view entries', {error});
      return [];
    }
  }

  async getEntriesByYear(date: Date): Promise<YearViewEntry[]> {
    try {
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      endOfYear.setHours(23, 59, 59, 999);

      const entries = await databaseService.queryEntries({
        startDate: startOfYear.getTime(),
        endDate: endOfYear.getTime(),
      });

      // 按月份分组
      const monthMap = new Map<number, EntryQueryResult[]>();
      for (let i = 0; i < 12; i++) {
        monthMap.set(i, []);
      }

      entries.forEach(entry => {
        const entryDate = new Date(entry.createdAt);
        const month = entryDate.getMonth();
        const monthEntries = monthMap.get(month) || [];
        monthEntries.push(entry);
        monthMap.set(month, monthEntries);
      });

      // 转换为 YearViewEntry 数组
      const result: YearViewEntry[] = [];
      for (let i = 0; i < 12; i++) {
        const monthEntries = monthMap.get(i) || [];
        const stats = {
          totalEntries: monthEntries.length,
          photoCount: monthEntries.filter(e => e.type === 'photo').length,
          textCount: monthEntries.filter(e => e.type === 'text').length,
          voiceCount: monthEntries.filter(e => e.type === 'voice').length,
        };

        result.push({
          month: i,
          entries: monthEntries,
          count: monthEntries.length,
          stats,
        });
      }

      logger.info('Year view entries fetched', {
        year,
        totalEntries: entries.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get year view entries', {error});
      return [];
    }
  }

  async getEntriesWithPagination(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{entries: EntryQueryResult[]; total: number}> {
    try {
      const entries = await databaseService.queryEntries({
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        limit,
        offset,
      });

      const total = await databaseService.countEntries({
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      });

      return {entries, total};
    } catch (error) {
      logger.error('Failed to get paginated entries', {error});
      return {entries: [], total: 0};
    }
  }
}

export const entryQueries = new EntryQueries();

