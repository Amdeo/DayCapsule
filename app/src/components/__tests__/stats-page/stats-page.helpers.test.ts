import { buildStatsSummary, formatDuration } from '../../stats-page/statsPageHelpers';

const fixedNow = new Date('2026-03-26T12:00:00+08:00').getTime();
const oneDay = 24 * 60 * 60 * 1000;

describe('statsPageHelpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats durations across second and minute boundaries', () => {
    expect(formatDuration(42)).toBe('42秒');
    expect(formatDuration(60)).toBe('1分钟');
    expect(formatDuration(90)).toBe('1分30秒');
  });

  it('builds stats by excluding recording voices while keeping six-month trend data', () => {
    const stats = buildStatsSummary([
      {
        id: 'text-1',
        type: 'text',
        timestamp: fixedNow,
        tags: ['旅行', '周记', '旅行'],
      },
      {
        id: 'photo-1',
        type: 'photo',
        timestamp: fixedNow - oneDay,
        tags: ['旅行'],
      },
      {
        id: 'voice-1',
        type: 'voice',
        timestamp: fixedNow - 2 * oneDay,
        tags: ['采访'],
        recordingStatus: 'completed',
        media: [{ duration: 90000 }],
      },
      {
        id: 'voice-recording',
        type: 'voice',
        timestamp: fixedNow - 3 * oneDay,
        tags: ['采访'],
        recordingStatus: 'recording',
        media: [{ duration: 120000 }],
      },
      {
        id: 'text-old',
        type: 'text',
        timestamp: fixedNow - 40 * oneDay,
        tags: ['周记'],
      },
    ] as any);

    expect(stats.total).toBe(5);
    expect(stats.text).toBe(2);
    expect(stats.photo).toBe(1);
    expect(stats.voice).toBe(1);
    expect(stats.thisWeek).toBe(4);
    expect(stats.thisMonth).toBe(4);
    expect(stats.totalVoiceDuration).toBe(90);
    expect(stats.topTags).toEqual(
      expect.arrayContaining([
        ['旅行', 3],
        ['周记', 2],
        ['采访', 2],
      ]),
    );
    expect(stats.busiestDay).toContain('2026/');
    expect(stats.months).toEqual([
      { label: '10月', count: 0 },
      { label: '11月', count: 0 },
      { label: '12月', count: 0 },
      { label: '1月', count: 0 },
      { label: '2月', count: 1 },
      { label: '3月', count: 4 },
    ]);
    expect(stats.maxCount).toBe(4);
  });

  it('returns the empty summary baseline when there are no entries', () => {
    const stats = buildStatsSummary([] as any);

    expect(stats.total).toBe(0);
    expect(stats.text).toBe(0);
    expect(stats.photo).toBe(0);
    expect(stats.voice).toBe(0);
    expect(stats.thisWeek).toBe(0);
    expect(stats.thisMonth).toBe(0);
    expect(stats.totalVoiceDuration).toBe(0);
    expect(stats.topTags).toEqual([]);
    expect(stats.busiestDay).toBe('暂无');
    expect(stats.months).toHaveLength(6);
    expect(stats.maxCount).toBe(1);
  });
});
