/**
 * 统计视图组件
 * 展示记录类型分布、近6个月趋势、常用标签
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';

interface StatsViewProps {
  entries: Entry[];
}

const TYPE_CONFIG = [
  { type: 'text', label: '文字', icon: 'document-text', color: '#6A89CC' },
  { type: 'photo', label: '照片', icon: 'image', color: '#4ECDC4' },
  { type: 'voice', label: '语音', icon: 'mic', color: '#FF9F43' },
] as const;

export function StatsView({ entries }: StatsViewProps) {
  const stats = useMemo(() => {
    const total = entries.length;

    const byType = {
      text: entries.filter((e) => e.type === 'text').length,
      photo: entries.filter((e) => e.type === 'photo').length,
      voice: entries.filter((e) => e.type === 'voice').length,
    };

    // 标签频率
    const tagCount: Record<string, number> = {};
    entries.forEach((e) => {
      e.tags?.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

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

    return { total, byType, topTags, months, maxCount };
  }, [entries]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* 总数卡片 */}
      <View style={styles.totalCard}>
        <Text style={styles.totalNumber}>{stats.total}</Text>
        <Text style={styles.totalLabel}>条记录</Text>
      </View>

      {/* 类型分布 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>记录类型</Text>
        <View style={styles.typeRow}>
          {TYPE_CONFIG.map(({ type, label, icon, color }) => {
            const count = stats.byType[type];
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <View key={type} style={styles.typeCard}>
                <View style={[styles.typeIconWrap, { backgroundColor: color + '20' }]}>
                  <Ionicons name={icon} size={22} color={color} />
                </View>
                <Text style={[styles.typeCount, { color }]}>{count}</Text>
                <Text style={styles.typeLabel}>{label}</Text>
                <Text style={styles.typePct}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 近6个月趋势 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>近6个月趋势</Text>
        <View style={styles.barChart}>
          {stats.months.map((m, i) => {
            const heightPct = (m.count / stats.maxCount) * 100;
            return (
              <View key={i} style={styles.barItem}>
                {m.count > 0 && (
                  <Text style={styles.barCount}>{m.count}</Text>
                )}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(heightPct, 4)}%` },
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>常用标签</Text>
          <View style={styles.tagsGrid}>
            {stats.topTags.map(([tag, count]) => (
              <View key={tag} style={styles.tagItem}>
                <Text style={styles.tagName}>#{tag}</Text>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagCount}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  content: { padding: 16, paddingBottom: 120 },
  totalCard: {
    backgroundColor: '#6A89CC',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 56,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  typeCard: {
    alignItems: 'center',
    flex: 1,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeCount: {
    fontSize: 22,
    fontWeight: '800',
  },
  typeLabel: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  typePct: {
    fontSize: 11,
    color: '#A3A3A3',
    marginTop: 2,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
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
    backgroundColor: '#F0F4FF',
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
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A6FA5',
  },
  tagBadge: {
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
