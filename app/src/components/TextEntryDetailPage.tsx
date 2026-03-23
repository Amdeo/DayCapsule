import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Entry } from '@/src/types/entry';
import { DetailPageShell } from './DetailPageShell';

interface TextEntryDetailPageProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
  onEdit: (entry: Entry) => void;
}

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function TextEntryDetailPage({
  visible,
  entry,
  onClose,
  onEdit,
}: TextEntryDetailPageProps) {
  if (!visible || !entry) return null;

  return (
    <DetailPageShell
      visible={visible}
      title="记录详情"
      onClose={onClose}
      headerRight={(
        <Pressable
          className="px-1.5 py-1"
          testID="text-entry-detail-edit-button"
          onPress={() => onEdit(entry)}
        >
          <Text className="text-[15px] font-semibold text-primary">编辑</Text>
        </Pressable>
      )}
    >
      <View className="gap-6 pt-6" testID="text-entry-detail-root">
        <View
          className="rounded-2xl border border-border-editor-soft bg-editor-surface px-[18px] py-5"
          testID="text-entry-detail-hero"
        >
          <Text className="text-[18px] leading-8 tracking-[0.2px] text-editor-body">
            {entry.content}
          </Text>
        </View>

        <View className="gap-[18px] pb-3">
          <View className="gap-1.5">
            <Text className="text-xs font-semibold tracking-[0.6px] text-editor-muted">
              创建时间
            </Text>
            <Text className="text-[15px] leading-[22px] text-copy-primary">
              {formatDateTime(entry.timestamp)}
            </Text>
          </View>

          {entry.editedAt ? (
            <View className="gap-1.5">
              <Text className="text-xs font-semibold tracking-[0.6px] text-editor-muted">
                最近编辑
              </Text>
              <Text className="text-[15px] leading-[22px] text-copy-primary">
                {formatDateTime(entry.editedAt)}
              </Text>
            </View>
          ) : null}

          {entry.tags && entry.tags.length > 0 ? (
            <View className="gap-2.5" testID="text-entry-detail-tags">
              <Text className="text-xs font-semibold tracking-[0.6px] text-editor-muted">
                标签
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full border border-border-editor-soft bg-editor-tag px-2.5 py-1.5"
                  >
                    <Text className="text-[13px] font-medium text-editor-tag-text">
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </DetailPageShell>
  );
}
