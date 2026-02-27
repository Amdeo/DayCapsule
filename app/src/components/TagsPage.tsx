/**
 * 标签管理页面
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';

interface TagsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function TagsPage({ visible, onClose }: TagsPageProps) {
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
                <Text style={styles.headerTitle}>标签管理</Text>
                <View style={{ width: 40 }} />
              </View>

              {tagStats.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🏷️</Text>
                  <Text style={styles.emptyText}>还没有标签</Text>
                  <Text style={styles.emptyHint}>在添加文字记录时可以添加标签</Text>
                </View>
              ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  <View style={{ height: 40 + insets.bottom }} />
                </ScrollView>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#A3A3A3', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#D1D1D1', textAlign: 'center' },
});
