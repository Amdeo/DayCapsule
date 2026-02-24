/**
 * 时间处理工具函数
 */

import { Entry } from '../types/entry';

/**
 * 时间分组类型
 */
export type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'earlier';

/**
 * 分组后的记录
 */
export interface GroupedEntries {
  today: Entry[];
  yesterday: Entry[];
  thisWeek: Entry[];
  thisMonth: Entry[];
  earlier: Entry[];
}

/**
 * 时间分组标签
 */
export const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  thisWeek: '本周',
  thisMonth: '本月',
  earlier: '更早',
};

/**
 * 判断日期是否是今天
 */
export function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * 判断日期是否是昨天
 */
export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * 判断日期是否在本周内
 */
export function isThisWeek(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);

  // 获取本周一的日期
  const monday = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  // 获取本周日的日期
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date >= monday && date <= sunday;
}

/**
 * 判断日期是否在本月内
 */
export function isThisMonth(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);

  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * 获取时间分组类型
 */
export function getTimeGroup(timestamp: number): TimeGroup {
  if (isToday(timestamp)) {
    return 'today';
  }
  if (isYesterday(timestamp)) {
    return 'yesterday';
  }
  if (isThisWeek(timestamp)) {
    return 'thisWeek';
  }
  if (isThisMonth(timestamp)) {
    return 'thisMonth';
  }
  return 'earlier';
}

/**
 * 按时间分组记录
 */
export function groupEntriesByTime(entries: Entry[]): GroupedEntries {
  const grouped: GroupedEntries = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    earlier: [],
  };

  // 按时间倒序排序
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  sortedEntries.forEach((entry) => {
    const group = getTimeGroup(entry.timestamp);
    grouped[group].push(entry);
  });

  return grouped;
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  if (hours < 24) {
    return `${hours}小时前`;
  }
  if (days < 7) {
    return `${days}天前`;
  }

  // 超过7天，显示具体日期
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const currentYear = new Date().getFullYear();
  if (year === currentYear) {
    return `${month}月${day}日`;
  }

  return `${year}年${month}月${day}日`;
}

/**
 * 格式化时间（详细）
 */
export function formatDetailedTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 格式化日期（YYYY-MM-DD）
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 获取日期范围内的记录
 */
export function filterEntriesByDateRange(
  entries: Entry[],
  startDate: Date,
  endDate: Date
): Entry[] {
  const start = startDate.getTime();
  const end = endDate.getTime();

  return entries.filter(
    (entry) => entry.timestamp >= start && entry.timestamp <= end
  );
}

/**
 * 获取本月的所有日期
 */
export function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

/**
 * 获取某日期有多少条记录
 */
export function getEntriesCountByDate(
  entries: Entry[],
  date: Date
): number {
  const targetDate = formatDate(date.getTime());

  return entries.filter((entry) => {
    const entryDate = formatDate(entry.timestamp);
    return entryDate === targetDate;
  }).length;
}

/**
 * 判断两个时间戳是否是同一天
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * 格式化日期标签（用于时间轴分组标题）
 * 返回如："今天"、"昨天"、"6月15日"、"2024年5月20日"
 */
export function formatDateLabel(timestamp: number): string {
  const today = new Date();
  const date = new Date(timestamp);

  // 今天
  if (isToday(timestamp)) {
    return '今天';
  }

  // 昨天
  if (isYesterday(timestamp)) {
    return '昨天';
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const currentYear = today.getFullYear();

  // 今年
  if (year === currentYear) {
    return `${month}月${day}日`;
  }

  // 往年
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化短日期（用于时间轴圆圈显示）
 * 返回如："6/18"、"12/25"
 */
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 获取某个月份的记录统计
 */
export function getMonthStats(
  entries: Entry[],
  year: number,
  month: number
): Map<string, number> {
  const stats = new Map<string, number>();
  const dates = getMonthDates(year, month);

  dates.forEach((date) => {
    const count = getEntriesCountByDate(entries, date);
    if (count > 0) {
      stats.set(formatDate(date.getTime()), count);
    }
  });

  return stats;
}
