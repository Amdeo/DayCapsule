/**
 * 统计页面组件
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { Entry } from '@/src/types/entry';

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

export function StatsPage({ visible, onClose }: StatsPageProps) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntryStore();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const t = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    const textEntries = entries.filter((e) => e.type === 'text');
    const photoEntries = entries.filter((e) => e.type === 'photo');
    const voiceEntries = entries.filter((e) => e.type === 'voice' && e.recordingStatus !== 'recording');

    const thisWeek = entries.filter((e) => e.timestamp >= weekStart).length;
    const thisMonth = entries.filter((e) => e.timestamp >= monthStart).length;

    const totalVoiceDuration = voiceEntries.reduce((sum, e) => sum + (e.media?.duration || 0), 0) / 1000;

    // 标签统计
    const tagCounts: Record<string, number> = {};
    entries.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 最活跃的一天
    const dayCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const day = new Date(e.timestamp).toLocaleDateString('zh-CN');
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const busiest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: entries.length,
      text: textEntries.length,
      photo: photoEntries.length,
      voice: voiceEntries.length,
      thisWeek,
      thisMonth,
      totalVoiceDuration,
      topTags,
      busiestDay: busiest ? `${busiest[0]} (${busiest[1]}条)` : '暂无',
    };
  }, [entries]);

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={styles.page}
          >
            <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
              <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
                </Pressable>
                <Text style={styles.headerTitle}>统计</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

                {/* 热门标签 */}
                {stats.topTags.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>热门标签</Text>
                    <View style={styles.infoCard}>
                      {stats.topTags.map(([tag, count]) => (
                        <Row key={tag} label={`#${tag}`} value={`${count} 条`} />
                      ))}
                    </View>
                  </>
                )}

                <View style={{ height: 40 + insets.bottom }} />
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  page: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#4A4A4A' },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#A3A3A3',
    marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statContent: {},
  statValue: { fontSize: 22, fontWeight: '700', color: '#4A4A4A' },
  statLabel: { fontSize: 12, color: '#A3A3A3', marginTop: 2 },
  infoCard: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  rowLabel: { fontSize: 15, color: '#737373' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#4A4A4A' },
});
