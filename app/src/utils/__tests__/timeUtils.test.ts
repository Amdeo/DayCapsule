import {
  TIME_GROUP_LABELS,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  getTimeGroup,
  groupEntriesByTime,
  formatRelativeTime,
  formatDetailedTime,
  formatDate,
  formatDateLabel,
  formatShortDate,
  formatHHMM,
  formatMMSS,
  filterEntriesByDateRange,
  getMonthDates,
  getEntriesCountByDate,
  isSameDay,
  getMonthStats,
} from '../timeUtils';
import type { Entry } from '../timeUtils';

/** Create a timestamp from local date components (timezone-safe) */
function localTs(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
): number {
  return new Date(year, month, day, hours, minutes, seconds).getTime();
}

/** Now is March 18, 2026 at noon local time */
const MOCK_NOW = localTs(2026, 2, 18, 12, 0, 0);

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'test-id',
    timestamp: MOCK_NOW,
    type: 'text',
    content: 'test',
    ...overrides,
  } as Entry;
}

describe('TIME_GROUP_LABELS', () => {
  it('maps each group to a Chinese label', () => {
    expect(TIME_GROUP_LABELS.today).toBe('今天');
    expect(TIME_GROUP_LABELS.yesterday).toBe('昨天');
    expect(TIME_GROUP_LABELS.thisWeek).toBe('本周');
    expect(TIME_GROUP_LABELS.thisMonth).toBe('本月');
    expect(TIME_GROUP_LABELS.earlier).toBe('更早');
  });
});

describe('isToday / isYesterday / isThisWeek / isThisMonth', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('isToday returns true for a timestamp on the same day', () => {
    expect(isToday(localTs(2026, 2, 18, 9, 0, 0))).toBe(true);
  });

  it('isToday returns false for a different day', () => {
    expect(isToday(localTs(2026, 2, 17, 23, 59, 59))).toBe(false);
  });

  it('isYesterday returns true for one day before', () => {
    expect(isYesterday(localTs(2026, 2, 17, 12, 0, 0))).toBe(true);
  });

  it('isYesterday returns false for today', () => {
    expect(isYesterday(localTs(2026, 2, 18, 9, 0, 0))).toBe(false);
  });

  it('isYesterday returns false for two days before', () => {
    expect(isYesterday(localTs(2026, 2, 16, 12, 0, 0))).toBe(false);
  });

  it('isThisWeek returns true for Monday of the same week', () => {
    expect(isThisWeek(localTs(2026, 2, 16, 12, 0, 0))).toBe(true);
  });

  it('isThisWeek returns false for last Sunday', () => {
    expect(isThisWeek(localTs(2026, 2, 15, 12, 0, 0))).toBe(false);
  });

  it('isThisWeek handles Sunday as current day (day===0 branch)', () => {
    // Set "now" to Sunday March 22
    jest.setSystemTime(localTs(2026, 2, 22, 12, 0, 0));
    // Monday March 16 is in the same week
    expect(isThisWeek(localTs(2026, 2, 16, 12, 0, 0))).toBe(true);
    jest.setSystemTime(MOCK_NOW);
  });

  it('isThisMonth returns true for another day in March', () => {
    expect(isThisMonth(localTs(2026, 2, 1, 0, 0, 0))).toBe(true);
  });

  it('isThisMonth returns false for a different month', () => {
    expect(isThisMonth(localTs(2026, 1, 28, 12, 0, 0))).toBe(false);
  });
});

describe('getTimeGroup', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "today" for a timestamp on the same day', () => {
    expect(getTimeGroup(localTs(2026, 2, 18, 1, 0, 0))).toBe('today');
  });

  it('returns "yesterday" for a timestamp one day before', () => {
    expect(getTimeGroup(localTs(2026, 2, 17, 12, 0, 0))).toBe('yesterday');
  });

  it('returns "thisWeek" for a timestamp in the same week but not today/yesterday', () => {
    expect(getTimeGroup(localTs(2026, 2, 16, 12, 0, 0))).toBe('thisWeek');
  });

  it('returns "thisMonth" for a timestamp in the same month but not this week', () => {
    expect(getTimeGroup(localTs(2026, 2, 1, 12, 0, 0))).toBe('thisMonth');
  });

  it('returns "earlier" for a timestamp before this month', () => {
    expect(getTimeGroup(localTs(2026, 1, 28, 12, 0, 0))).toBe('earlier');
  });
});

describe('groupEntriesByTime', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('groups entries into time buckets', () => {
    const entries: Entry[] = [
      makeEntry({ id: '1', timestamp: localTs(2026, 2, 18, 8, 0, 0) }),
      makeEntry({ id: '2', timestamp: localTs(2026, 2, 17, 15, 0, 0) }),
      makeEntry({ id: '3', timestamp: localTs(2026, 2, 16, 10, 0, 0) }),
      makeEntry({ id: '4', timestamp: localTs(2026, 2, 5, 10, 0, 0) }),
      makeEntry({ id: '5', timestamp: localTs(2026, 1, 20, 10, 0, 0) }),
    ];

    const grouped = groupEntriesByTime(entries);

    expect(grouped.today.map((e) => e.id)).toEqual(['1']);
    expect(grouped.yesterday.map((e) => e.id)).toEqual(['2']);
    expect(grouped.thisWeek.map((e) => e.id)).toEqual(['3']);
    expect(grouped.thisMonth.map((e) => e.id)).toEqual(['4']);
    expect(grouped.earlier.map((e) => e.id)).toEqual(['5']);
  });

  it('returns empty arrays for groups with no entries', () => {
    const entries: Entry[] = [makeEntry({ timestamp: localTs(2026, 2, 18, 8, 0, 0) })];
    const grouped = groupEntriesByTime(entries);
    expect(grouped.today).toHaveLength(1);
    expect(grouped.yesterday).toHaveLength(0);
    expect(grouped.thisWeek).toHaveLength(0);
    expect(grouped.thisMonth).toHaveLength(0);
    expect(grouped.earlier).toHaveLength(0);
  });
});

describe('formatRelativeTime', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "刚刚" for less than 60 seconds', () => {
    expect(formatRelativeTime(MOCK_NOW - 30 * 1000)).toBe('刚刚');
  });

  it('returns N分钟前 for less than 60 minutes', () => {
    expect(formatRelativeTime(MOCK_NOW - 5 * 60 * 1000)).toBe('5分钟前');
  });

  it('returns N小时前 for less than 24 hours', () => {
    expect(formatRelativeTime(MOCK_NOW - 3 * 60 * 60 * 1000)).toBe('3小时前');
  });

  it('returns N天前 for less than 7 days', () => {
    expect(formatRelativeTime(MOCK_NOW - 2 * 24 * 60 * 60 * 1000)).toBe('2天前');
  });

  it('returns padded month-day for same year over 7 days ago', () => {
    expect(formatRelativeTime(localTs(2026, 0, 5, 12, 0, 0))).toBe('01月05日');
  });

  it('returns full date for different year', () => {
    expect(formatRelativeTime(localTs(2025, 11, 25, 12, 0, 0))).toBe('2025年12月25日');
  });
});

describe('formatDate', () => {
  it('formats timestamp as YYYY-MM-DD', () => {
    expect(formatDate(localTs(2026, 2, 18, 9, 5, 0))).toBe('2026-03-18');
  });

  it('zero-pads month and day', () => {
    expect(formatDate(localTs(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });
});

describe('formatDateLabel', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "今天" for today', () => {
    expect(formatDateLabel(localTs(2026, 2, 18, 1, 0, 0))).toBe('今天');
  });

  it('returns "昨天" for yesterday', () => {
    expect(formatDateLabel(localTs(2026, 2, 17, 12, 0, 0))).toBe('昨天');
  });

  it('returns month-day without padding for this year', () => {
    expect(formatDateLabel(localTs(2026, 0, 15, 12, 0, 0))).toBe('1月15日');
  });

  it('returns full date for previous year', () => {
    expect(formatDateLabel(localTs(2025, 11, 1, 12, 0, 0))).toBe('2025年12月1日');
  });
});

describe('formatShortDate', () => {
  it('returns M/D format without padding', () => {
    expect(formatShortDate(localTs(2026, 2, 18, 12, 0, 0))).toBe('3/18');
    expect(formatShortDate(localTs(2026, 11, 25, 12, 0, 0))).toBe('12/25');
  });
});

describe('formatMMSS', () => {
  it('formats seconds as zero-padded MM:SS', () => {
    expect(formatMMSS(5)).toBe('00:05');
    expect(formatMMSS(65)).toBe('01:05');
    expect(formatMMSS(3661)).toBe('61:01');
  });
});

describe('formatHHMM', () => {
  it('formats timestamp as zero-padded HH:MM', () => {
    expect(formatHHMM(localTs(2026, 2, 18, 9, 5, 0))).toBe('09:05');
    expect(formatHHMM(localTs(2026, 2, 18, 23, 59, 0))).toBe('23:59');
  });
});

describe('formatDetailedTime', () => {
  it('formats as YYYY-MM-DD HH:mm:ss', () => {
    expect(formatDetailedTime(localTs(2026, 2, 18, 9, 5, 7))).toBe('2026-03-18 09:05:07');
  });
});

describe('filterEntriesByDateRange', () => {
  it('filters entries within a date range', () => {
    const entries: Entry[] = [
      makeEntry({ id: '1', timestamp: localTs(2026, 2, 1, 0, 0, 0) }),
      makeEntry({ id: '2', timestamp: localTs(2026, 2, 15, 12, 0, 0) }),
      makeEntry({ id: '3', timestamp: localTs(2026, 2, 31, 23, 59, 59) }),
    ];

    const result = filterEntriesByDateRange(
      entries,
      new Date(2026, 2, 10),
      new Date(2026, 2, 20),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when no entries match', () => {
    const entries: Entry[] = [makeEntry({ timestamp: localTs(2026, 0, 1, 0, 0, 0) })];
    const result = filterEntriesByDateRange(
      entries,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
    );
    expect(result).toHaveLength(0);
  });
});

describe('getMonthDates', () => {
  it('returns all dates in March 2026', () => {
    const dates = getMonthDates(2026, 2); // JavaScript month 2 = March
    expect(dates).toHaveLength(31);
    expect(dates[0]).toEqual(new Date(2026, 2, 1));
    expect(dates[30]).toEqual(new Date(2026, 2, 31));
  });

  it('returns correct number of days for February in a non-leap year', () => {
    const dates = getMonthDates(2025, 1); // February 2025
    expect(dates).toHaveLength(28);
  });
});

describe('getEntriesCountByDate', () => {
  it('counts entries on a specific date', () => {
    const target = new Date(2026, 2, 18, 12, 0, 0);
    const entries: Entry[] = [
      makeEntry({ id: '1', timestamp: localTs(2026, 2, 18, 8, 0, 0) }),
      makeEntry({ id: '2', timestamp: localTs(2026, 2, 18, 20, 0, 0) }),
      makeEntry({ id: '3', timestamp: localTs(2026, 2, 17, 12, 0, 0) }),
    ];

    expect(getEntriesCountByDate(entries, target)).toBe(2);
  });
});

describe('isSameDay', () => {
  it('returns true for two timestamps on the same day', () => {
    expect(isSameDay(
      localTs(2026, 2, 18, 1, 0, 0),
      localTs(2026, 2, 18, 23, 0, 0),
    )).toBe(true);
  });

  it('returns false for different days', () => {
    expect(isSameDay(
      localTs(2026, 2, 18, 12, 0, 0),
      localTs(2026, 2, 19, 12, 0, 0),
    )).toBe(false);
  });
});

describe('getMonthStats', () => {
  it('returns map of date → count for entries in the given month', () => {
    const entries: Entry[] = [
      makeEntry({ id: '1', timestamp: localTs(2026, 2, 15, 8, 0, 0) }),
      makeEntry({ id: '2', timestamp: localTs(2026, 2, 15, 20, 0, 0) }),
      makeEntry({ id: '3', timestamp: localTs(2026, 2, 20, 12, 0, 0) }),
      makeEntry({ id: '4', timestamp: localTs(2026, 1, 1, 12, 0, 0) }),
    ];

    const stats = getMonthStats(entries, 2026, 2); // March
    expect(stats.get('2026-03-15')).toBe(2);
    expect(stats.get('2026-03-20')).toBe(1);
    expect(stats.get('2026-02-01')).toBeUndefined();
  });
});
