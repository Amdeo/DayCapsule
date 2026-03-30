import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { EntryCardSyncStatusMeta } from './entryCardAppearance';
import { entryCardStyles as styles } from './EntryCard.styles';

interface EntryCardDefaultMetaProps {
  entry: Entry;
  isExpanded: boolean;
  syncStatusMeta: EntryCardSyncStatusMeta;
}

export function EntryCardDefaultMeta({
  entry,
  isExpanded,
  syncStatusMeta,
}: EntryCardDefaultMetaProps) {
  const syncStatusIconName = syncStatusMeta.iconName;

  return (
    <>
      {syncStatusIconName ? (
        <View style={styles.syncStatusBadge}>
          {entry.syncStatus === 'uploading' ? (
            <ActivityIndicator size="small" color={syncStatusMeta.iconColor} />
          ) : (
            <Ionicons name={syncStatusIconName} size={16} color={syncStatusMeta.iconColor} />
          )}
        </View>
      ) : null}

      {syncStatusMeta.text ? (
        <View style={styles.syncStatusPill}>
          <Text style={styles.syncStatusPillText}>{syncStatusMeta.text}</Text>
        </View>
      ) : null}

      {entry.tags && entry.tags.length > 0 ? (
        <View
          testID={entry.type === 'photo' ? 'photo-tags-container' : undefined}
          style={entry.type === 'photo' ? styles.photoTagsContainer : styles.tagsContainer}
        >
          {(isExpanded ? entry.tags : entry.tags.slice(0, 3)).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {!isExpanded && entry.tags.length > 3 ? (
            <Text style={styles.moreTagsHint}>+{entry.tags.length - 3}</Text>
          ) : null}
        </View>
      ) : null}

      {entry.transcription ? (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>转录</Text>
          <Text
            style={styles.transcriptionText}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {entry.transcription.text}
          </Text>
        </View>
      ) : null}
    </>
  );
}
