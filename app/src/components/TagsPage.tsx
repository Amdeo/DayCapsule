/**
 * 标签管理页面
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryStore } from '@/src/store/entryStore';
import { DetailPageShell } from './DetailPageShell';

interface TagsPageProps {
  visible: boolean;
  onClose: () => void;
}

const EMPTY_CONTENT_CONTAINER_STYLE = { flexGrow: 1 } as const;

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

  return (
    <DetailPageShell
      visible={visible}
      title="标签管理"
      onClose={onClose}
      contentContainerStyle={tagStats.length === 0 ? EMPTY_CONTENT_CONTAINER_STYLE : undefined}
    >
      <View testID="tags-page-root">
        {tagStats.length === 0 ? (
          <View
            className="items-center justify-center pb-20"
            testID="tags-page-empty"
          >
            <Text className="mb-4 text-[48px]">🏷️</Text>
            <Text className="mb-2 text-base text-copy-muted">还没有标签</Text>
            <Text className="text-center text-[13px] text-copy-subtle">
              在添加文字记录时可以添加标签
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-2 mt-4 text-[13px] text-copy-muted">
              共 {tagStats.length} 个标签
            </Text>
            {tagStats.map(([tag, count]) => (
              <TouchableOpacity
                key={tag}
                className="flex-row items-center justify-between border-b border-overlay-muted py-4"
                activeOpacity={0.7}
                onPress={onClose}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-2 w-2 rounded-full bg-entry-text" />
                  <Text className="text-base font-medium text-copy-primary">#{tag}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-copy-muted">{count} 条</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D1D1" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </DetailPageShell>
  );
}
