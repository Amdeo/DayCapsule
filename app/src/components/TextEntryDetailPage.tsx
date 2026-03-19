import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      contentContainerStyle={styles.contentContainer}
      headerRight={(
        <Pressable
          testID="text-entry-detail-edit-button"
          onPress={() => onEdit(entry)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>编辑</Text>
        </Pressable>
      )}
    >
      <View style={styles.heroBlock}>
        <Text style={styles.contentText}>{entry.content}</Text>
      </View>

      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>创建时间</Text>
          <Text style={styles.metaValue}>{formatDateTime(entry.timestamp)}</Text>
        </View>

        {entry.editedAt ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>最近编辑</Text>
            <Text style={styles.metaValue}>{formatDateTime(entry.editedAt)}</Text>
          </View>
        ) : null}

        {entry.tags && entry.tags.length > 0 ? (
          <View style={styles.tagsSection}>
            <Text style={styles.metaLabel}>标签</Text>
            <View style={styles.tagsWrap}>
              {entry.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 24,
    gap: 24,
  },
  editButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6A89CC',
  },
  heroBlock: {
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  contentText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#2F241E',
    letterSpacing: 0.2,
  },
  metaSection: {
    gap: 18,
    paddingBottom: 12,
  },
  metaRow: {
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#9A8A7D',
  },
  metaValue: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A4A4A',
  },
  tagsSection: {
    gap: 10,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F2EA',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A6758',
  },
});
