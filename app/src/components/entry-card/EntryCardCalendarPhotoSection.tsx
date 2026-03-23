import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import { PhotoService } from '@/src/services/photoService';
import { entryCardStyles as styles } from './EntryCard.styles';
import {
  EntryCardCalendarTags,
  EntryCardCalendarTranscription,
} from './EntryCardCalendarMeta';

interface EntryCardCalendarPhotoSectionProps {
  entry: Entry;
  isExpanded: boolean;
  resolvedPhotoHeight: number;
  calendarDensity: CalendarDensity;
  onCardPress: () => void;
  onImagePress: (index: number) => void;
}

export function EntryCardCalendarPhotoSection({
  entry,
  isExpanded,
  resolvedPhotoHeight,
  calendarDensity,
  onCardPress,
  onImagePress,
}: EntryCardCalendarPhotoSectionProps) {
  const mediaCount = entry.media?.length ?? 0;
  const hasMeta = !!(entry.content || (entry.tags && entry.tags.length > 0) || entry.transcription);

  return (
    <View style={styles.calendarPhotoCard}>
      <View style={styles.calendarPhotoBodyWrap}>
        <EntryCardCalendarPhotoBody
          entry={entry}
          resolvedPhotoHeight={resolvedPhotoHeight}
          onCardPress={onCardPress}
          onImagePress={onImagePress}
        />
        {mediaCount > 1 ? (
          <View style={styles.calendarPhotoCountOverlay}>
            <Text style={styles.calendarPhotoCountText}>{mediaCount} 张</Text>
          </View>
        ) : null}
      </View>

      {hasMeta ? (
        <View style={styles.calendarPhotoMeta}>
          {entry.content ? (
            <Text
              style={styles.calendarPhotoCaption}
              numberOfLines={isExpanded ? undefined : calendarDensity === 'compact' ? 2 : 3}
            >
              {entry.content}
            </Text>
          ) : null}
          <EntryCardCalendarTags entry={entry} isExpanded={isExpanded} />
          <EntryCardCalendarTranscription
            text={entry.transcription?.text}
            isExpanded={isExpanded}
          />
        </View>
      ) : null}
    </View>
  );
}

interface EntryCardCalendarPhotoBodyProps {
  entry: Entry;
  resolvedPhotoHeight: number;
  onCardPress: () => void;
  onImagePress: (index: number) => void;
}

function EntryCardCalendarPhotoBody({
  entry,
  resolvedPhotoHeight,
  onCardPress,
  onImagePress,
}: EntryCardCalendarPhotoBodyProps) {
  if (!entry.media || entry.media.length === 0) {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onCardPress}
        style={[styles.calendarPhotoEmptyState, { height: resolvedPhotoHeight }]}
      >
        <View style={styles.calendarPhotoEmptyBadge}>
          <Ionicons name="images-outline" size={26} color="#9F8F7C" />
        </View>
      </TouchableOpacity>
    );
  }

  if (entry.media.length === 1) {
    const photo = entry.media[0];

    return (
      <View testID={`calendar-photo-card-layout-single-${entry.id}`}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onImagePress(0)}
          testID={`calendar-photo-primary-${entry.id}`}
        >
          <Image
            source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
            style={[styles.calendarSinglePhoto, { height: resolvedPhotoHeight }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  const [primary, secondary, tertiary] = entry.media;
  const overflow = entry.media.length - 3;

  return (
    <View
      testID={`calendar-photo-card-layout-multi-${entry.id}`}
      style={[styles.calendarPhotoMultiWrap, { height: resolvedPhotoHeight }]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onImagePress(0)}
        style={styles.calendarPhotoPrimary}
        testID={`calendar-photo-primary-${entry.id}`}
      >
        <Image
          source={{ uri: PhotoService.resolvePhotoUri(primary.thumbnail || primary.uri) }}
          style={styles.calendarPhotoImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <View style={styles.calendarPhotoSecondaryColumn}>
        {secondary ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => onImagePress(1)}
            style={styles.calendarPhotoSecondaryCell}
            testID={`calendar-photo-secondary-cell-1-${entry.id}`}
          >
            <Image
              source={{ uri: PhotoService.resolvePhotoUri(secondary.thumbnail || secondary.uri) }}
              style={styles.calendarPhotoImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.calendarPhotoSecondaryCell} />
        )}

        {tertiary ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => onImagePress(2)}
            style={styles.calendarPhotoSecondaryCell}
            testID={`calendar-photo-secondary-cell-2-${entry.id}`}
          >
            <Image
              source={{ uri: PhotoService.resolvePhotoUri(tertiary.thumbnail || tertiary.uri) }}
              style={styles.calendarPhotoImage}
              resizeMode="cover"
            />
            {overflow > 0 ? (
              <View style={styles.calendarPhotoOverflowMask}>
                <Text style={styles.calendarPhotoOverflowText}>+{overflow}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.calendarPhotoSecondaryCell} />
        )}
      </View>
    </View>
  );
}
