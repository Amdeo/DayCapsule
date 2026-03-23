import React from 'react';
import { Text, View } from 'react-native';
import { textEntryDetailPageStyles as styles } from './TextEntryDetailPage.styles';

interface TextEntryDetailContentProps {
  content: string;
  createdAt: string;
  editedAt: string | null;
  tags: string[];
}

export function TextEntryDetailContent({
  content,
  createdAt,
  editedAt,
  tags,
}: TextEntryDetailContentProps) {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.contentText}>{content}</Text>
      </View>

      <View style={styles.metaSection}>
        <DetailMetaRow label="创建时间" value={createdAt} />

        {editedAt ? (
          <DetailMetaRow label="最近编辑" value={editedAt} />
        ) : null}

        {tags.length > 0 ? (
          <View style={styles.tagsSection}>
            <Text style={styles.metaLabel}>标签</Text>
            <View style={styles.tagsWrap}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}

interface DetailMetaRowProps {
  label: string;
  value: string;
}

function DetailMetaRow({ label, value }: DetailMetaRowProps) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}
