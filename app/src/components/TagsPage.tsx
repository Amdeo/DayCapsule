/**
 * 标签管理页面
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { DetailPageShell } from './DetailPageShell';

interface TagsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function TagsPage({ visible, onClose }: TagsPageProps) {
  const { entries } = useEntryStore();

  // 统计每个标签的使用次数
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const shellContentStyle = tagStats.length === 0 ? styles.emptyContentContainer : undefined;

  return (
    <DetailPageShell
      visible={visible}
      title="标签管理"
      onClose={onClose}
      contentContainerStyle={shellContentStyle}
    >
      {tagStats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyText}>还没有标签</Text>
          <Text style={styles.emptyHint}>在添加文字记录时可以添加标签</Text>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>共 {tagStats.length} 个标签</Text>
          {tagStats.map(([tag, count]) => (
            <TouchableOpacity
              key={tag}
              style={styles.tagRow}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <View style={styles.tagLeft}>
                <View style={styles.tagDot} />
                <Text style={styles.tagName}>#{tag}</Text>
              </View>
              <View style={styles.tagRight}>
                <Text style={styles.tagCount}>{count} 条</Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D1D1" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#A3A3A3', marginTop: 16, marginBottom: 8 },
  tagRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  tagLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tagDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A491D3' },
  tagName: { fontSize: 16, color: '#4A4A4A', fontWeight: '500' },
  tagRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagCount: { fontSize: 14, color: '#A3A3A3' },
  emptyContentContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#A3A3A3', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#D1D1D1', textAlign: 'center' },
});
