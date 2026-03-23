/**
 * 统计页面组件（合并版）
 * 内容：总览卡片 → 时间维度 → 近6个月趋势 → 常用标签
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { DetailPageShell } from './DetailPageShell';

interface StatsPageProps {
  visible: boolean;
  onClose: () => void;
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

interface StatCardProps {
  icon: string;
  color: string;
  label: string;
  value: string | number;
}

function StatCard({ icon, color, label, value }: StatCardProps) {
  return (
    <View
      className="min-w-[45%] flex-1 flex-row items-center rounded-chip border-l-[3px] bg-neutral-100 p-[14px]"
      style={{ borderLeftColor: color }}
    >
      <View
        className="mr-2.5 h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View>
        <Text className="text-[22px] font-bold text-copy-primary">{value}</Text>
        <Text className="mt-0.5 text-xs text-copy-muted">{label}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-[#EBEBEB] py-[14px]">
      <Text className="text-[15px] text-neutral-500">{label}</Text>
      <Text className="text-[15px] font-semibold text-copy-primary">{value}</Text>
    </View>
  );
}

export function StatsPage({ visible, onClose }: StatsPageProps) {
  const { entries } = useEntryStore();

  const stats = useMemo(() => {
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    const voiceEntries = entries.filter(
      (e) => e.type === 'voice' && e.recordingStatus !== 'recording'
    );
    const text = entries.filter((e) => e.type === 'text').length;
    const photo = entries.filter((e) => e.type === 'photo').length;
    const voice = voiceEntries.length;
    const total = entries.length;

    const thisWeek = entries.filter((e) => e.timestamp >= weekStart).length;
    const thisMonth = entries.filter((e) => e.timestamp >= monthStart).length;

    const totalVoiceDuration =
      voiceEntries.reduce((sum, e) => sum + (e.media?.[0]?.duration || 0), 0) / 1000;

    // 标签频率
    const tagCounts: Record<string, number> = {};
    entries.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // 最活跃的一天
    const dayCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const day = new Date(e.timestamp).toLocaleDateString('zh-CN');
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const busiest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const busiestDay = busiest ? `${busiest[0]} (${busiest[1]}条)` : '暂无';

    // 近6个月趋势
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const count = entries.filter((e) => {
        const ed = new Date(e.timestamp);
        return (
          ed.getFullYear() === d.getFullYear() &&
          ed.getMonth() === d.getMonth()
        );
      }).length;
      return { label: `${d.getMonth() + 1}月`, count };
    });
    const maxCount = Math.max(...months.map((m) => m.count), 1);

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
  }, [entries]);

  return (
    <DetailPageShell visible={visible} title="统计" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} testID="stats-page-root">
        {/* 总览 */}
        <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
          总览
        </Text>
        <View className="flex-row flex-wrap gap-3" testID="stats-overview-grid">
          <StatCard icon="document-text" color="#A491D3" label="文字记录" value={stats.text} />
          <StatCard icon="image" color="#77C9D4" label="照片记录" value={stats.photo} />
          <StatCard icon="mic" color="#F5A623" label="语音记录" value={stats.voice} />
          <StatCard icon="library" color="#6A89CC" label="全部记录" value={stats.total} />
        </View>

        {/* 时间维度 */}
        <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
          时间维度
        </Text>
        <View className="rounded-chip bg-neutral-100 px-4">
          <Row label="本周新增" value={`${stats.thisWeek} 条`} />
          <Row label="本月新增" value={`${stats.thisMonth} 条`} />
          <Row label="最活跃的一天" value={stats.busiestDay} />
          {stats.voice > 0 && (
            <Row label="语音总时长" value={formatDuration(stats.totalVoiceDuration)} />
          )}
        </View>

        {/* 近6个月趋势 */}
        <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
          近6个月趋势
        </Text>
        <View className="rounded-chip bg-neutral-100 px-4" testID="stats-trend-card">
          <View className="h-[120px] flex-row items-end gap-2 py-4">
            {stats.months.map((m, i) => {
              return (
                <View key={i} className="h-[88px] flex-1 items-center justify-end">
                  {m.count > 0 && (
                    <Text className="mb-1 text-[11px] font-semibold text-primary">{m.count}</Text>
                  )}
                  <View className="flex-1 w-full justify-end overflow-hidden rounded-md bg-[#E8ECF5]">
                    <View
                      className="w-full rounded-md bg-primary"
                      style={{ height: Math.max((m.count / stats.maxCount) * 88, 4) }}
                    />
                  </View>
                  <Text className="mt-1.5 text-[11px] text-copy-muted">{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 常用标签 */}
        {stats.topTags.length > 0 && (
          <>
            <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
              常用标签
            </Text>
            <View className="rounded-chip bg-neutral-100 px-4">
              {stats.topTags.map(([tag, count], index) => (
                <View
                  key={tag}
                  className={`flex-row items-center justify-between py-[14px] ${
                    index === stats.topTags.length - 1 ? '' : 'border-b border-[#EBEBEB]'
                  }`}
                >
                  <Text className="text-[15px] text-neutral-500">#{tag}</Text>
                  <Text className="text-[15px] font-semibold text-copy-primary">{count} 条</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View className="h-10" />
      </ScrollView>
    </DetailPageShell>
  );
}
