/**
 * 统计页面组件（合并版）
 * 内容：总览卡片 → 时间维度 → 近6个月趋势 → 常用标签
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
      voiceEntries.reduce((sum, e) => sum + (e.media?.duration || 0), 0) / 1000;

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 总览 */}
        <Text style={styles.sectionTitle}>总览</Text>
        <View style={styles.grid}>
          <StatCard icon="document-text" color="#A491D3" label="文字记录" value={stats.text} />
          <StatCard icon="image" color="#77C9D4" label="照片记录" value={stats.photo} />
          <StatCard icon="mic" color="#F5A623" label="语音记录" value={stats.voice} />
          <StatCard icon="library" color="#6A89CC" label="全部记录" value={stats.total} />
        </View>

        {/* 时间维度 */}
        <Text style={styles.sectionTitle}>时间维度</Text>
        <View style={styles.infoCard}>
          <Row label="本周新增" value={`${stats.thisWeek} 条`} />
          <Row label="本月新增" value={`${stats.thisMonth} 条`} />
          <Row label="最活跃的一天" value={stats.busiestDay} />
          {stats.voice > 0 && (
            <Row label="语音总时长" value={formatDuration(stats.totalVoiceDuration)} />
          )}
        </View>

        {/* 近6个月趋势 */}
        <Text style={styles.sectionTitle}>近6个月趋势</Text>
        <View style={styles.infoCard}>
          <View style={styles.barChart}>
            {stats.months.map((m, i) => {
              return (
                <View key={i} style={styles.barItem}>
                  {m.count > 0 && (
                    <Text style={styles.barCount}>{m.count}</Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: Math.max((m.count / stats.maxCount) * 88, 4) },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 常用标签 */}
        {stats.topTags.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>常用标签</Text>
            <View style={styles.infoCard}>
              {stats.topTags.map(([tag, count]) => (
                <Row key={tag} label={`#${tag}`} value={`${count} 条`} />
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A3A3A3',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statContent: {},
  statValue: { fontSize: 22, fontWeight: '700', color: '#4A4A4A' },
  statLabel: { fontSize: 12, color: '#A3A3A3', marginTop: 2 },
  infoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  rowLabel: { fontSize: 15, color: '#737373' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#4A4A4A' },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
    paddingVertical: 16,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    height: 88,
    justifyContent: 'flex-end',
  },
  barCount: {
    fontSize: 11,
    color: '#6A89CC',
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: '#E8ECF5',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#6A89CC',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: '#A3A3A3',
    marginTop: 6,
  },
  bottomPadding: { height: 40 },
});
