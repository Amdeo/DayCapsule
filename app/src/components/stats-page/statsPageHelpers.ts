import type { Entry } from '@/src/types/entry';

export interface StatsMonth {
  label: string;
  count: number;
}

export interface StatsSummary {
  total: number;
  text: number;
  photo: number;
  voice: number;
  thisWeek: number;
  thisMonth: number;
  totalVoiceDuration: number;
  topTags: Array<[string, number]>;
  busiestDay: string;
  months: StatsMonth[];
  maxCount: number;
}

function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function getMonthStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
}

export function buildStatsSummary(entries: Entry[]): StatsSummary {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const voiceEntries = entries.filter(
    (entry) => entry.type === 'voice' && entry.recordingStatus !== 'recording'
  );
  const text = entries.filter((entry) => entry.type === 'text').length;
  const photo = entries.filter((entry) => entry.type === 'photo').length;
  const voice = voiceEntries.length;
  const total = entries.length;

  const thisWeek = entries.filter((entry) => entry.timestamp >= weekStart).length;
  const thisMonth = entries.filter((entry) => entry.timestamp >= monthStart).length;

  const totalVoiceDuration =
    voiceEntries.reduce((sum, entry) => sum + (entry.media?.[0]?.duration || 0), 0) / 1000;

  const tagCounts: Record<string, number> = {};
  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const dayCounts: Record<string, number> = {};
  entries.forEach((entry) => {
    const day = new Date(entry.timestamp).toLocaleDateString('zh-CN');
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const busiest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestDay = busiest ? `${busiest[0]} (${busiest[1]}条)` : '暂无';

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const count = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate.getFullYear() === date.getFullYear() &&
        entryDate.getMonth() === date.getMonth()
      );
    }).length;
    return { label: `${date.getMonth() + 1}月`, count };
  });
  const maxCount = Math.max(...months.map((month) => month.count), 1);

  return {
    total,
    text,
    photo,
    voice,
    thisWeek,
    thisMonth,
    totalVoiceDuration,
    topTags,
    busiestDay,
    months,
    maxCount,
  };
}
