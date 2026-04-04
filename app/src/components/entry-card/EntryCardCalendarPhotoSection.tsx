import React from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { Entry, MediaInfo } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import { usePhotoSource } from '@/src/hooks/usePhotoSource';
import { entryCardStyles as styles } from './EntryCard.styles';
import {
  EntryCardCalendarTags,
  EntryCardCalendarTranscription,
} from './EntryCardCalendarMeta';

interface CalendarPhotoImageProps {
  photo: MediaInfo;
  style: object | object[];
}

const CALENDAR_PHOTO_LOADING_STYLE: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ECE7E0',
};

const CALENDAR_PHOTO_MISSING_STYLE: ViewStyle = {
  backgroundColor: '#ECE7E0',
};

function CalendarPhotoImage({ photo, style }: CalendarPhotoImageProps) {
  const { sourceUri, missing, pendingHydration, handleError } = usePhotoSource(photo, 'thumbnail');

  if (pendingHydration) {
    return (
      <View style={[style, CALENDAR_PHOTO_LOADING_STYLE]}>
        <ActivityIndicator size="small" color="#A68D68" />
      </View>
    );
  }

  if (missing) {
    return <View style={[style, CALENDAR_PHOTO_MISSING_STYLE]} />;
  }

  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      contentFit="cover"
      onError={handleError}
    />
  );
}

interface EntryCardCalendarPhotoSectionProps {
  entry: Entry;
  isExpanded: boolean;
  resolvedPhotoHeight: number;
  calendarDensity: CalendarDensity;
  isLocalReadyProcessing: boolean;
  onCardPress: () => void;
  onImagePress: (index: number) => void;
}

export function EntryCardCalendarPhotoSection({
  entry,
  isExpanded,
  resolvedPhotoHeight,
  calendarDensity,
  isLocalReadyProcessing,
  onCardPress,
  onImagePress,
}: EntryCardCalendarPhotoSectionProps) {
  const mediaCount = entry.media?.length ?? 0;
  const hasMeta = !!(entry.content || (entry.tags && entry.tags.length > 0) || entry.transcription);

  return (
    <View testID="calendar-photo-card-root" style={styles.calendarPhotoCard}>
      <View style={styles.calendarPhotoBodyWrap}>
        <EntryCardCalendarPhotoBody
          entry={entry}
          resolvedPhotoHeight={resolvedPhotoHeight}
          onCardPress={onCardPress}
          onImagePress={onImagePress}
        />
        {mediaCount > 1 ? (
          <View testID="calendar-photo-count-overlay" style={styles.calendarPhotoCountOverlay}>
            <Text style={styles.calendarPhotoCountText}>{mediaCount} 张</Text>
          </View>
        ) : null}
        {isLocalReadyProcessing ? (
          <View
            testID={`calendar-photo-processing-${entry.id}`}
            style={[
              styles.calendarPhotoCountOverlay,
              styles.calendarPhotoProcessingOverlay,
            ]}
          >
            <Text style={styles.calendarPhotoCountText}>准备中</Text>
          </View>
        ) : null}
      </View>

      {hasMeta ? (
        <View testID="calendar-photo-meta" style={styles.calendarPhotoMeta}>
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
      <Pressable
        onPress={onCardPress}
        style={[styles.calendarPhotoEmptyState, { height: resolvedPhotoHeight }]}
      >
        <View style={styles.calendarPhotoEmptyBadge}>
          <Ionicons name="images-outline" size={26} color="#9F8F7C" />
        </View>
      </Pressable>
    );
  }

  if (entry.media.length === 1) {
    const photo = entry.media[0];

    return (
      <View testID={`calendar-photo-card-layout-single-${entry.id}`}>
        <Pressable
          onPress={() => onImagePress(0)}
          testID={`calendar-photo-primary-${entry.id}`}
        >
          <CalendarPhotoImage
            photo={photo}
            style={[styles.calendarSinglePhoto, { height: resolvedPhotoHeight }]}
          />
        </Pressable>
      </View>
    );
  }

  if (entry.media.length === 2) {
    const [primary, secondary] = entry.media;

    return (
      <View
        testID={`calendar-photo-card-layout-double-${entry.id}`}
        style={[styles.calendarPhotoDoubleWrap, { height: resolvedPhotoHeight }]}
      >
        <Pressable
          onPress={() => onImagePress(0)}
          style={[
            styles.calendarPhotoDoubleCell,
            styles.calendarPhotoDoubleCellLeft,
          ]}
          testID={`calendar-photo-double-primary-${entry.id}`}
        >
          <CalendarPhotoImage photo={primary} style={styles.calendarPhotoImage} />
        </Pressable>

        <Pressable
          onPress={() => onImagePress(1)}
          style={[
            styles.calendarPhotoDoubleCell,
            styles.calendarPhotoDoubleCellRight,
          ]}
          testID={`calendar-photo-double-secondary-${entry.id}`}
        >
          <CalendarPhotoImage photo={secondary} style={styles.calendarPhotoImage} />
        </Pressable>
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
      <Pressable
        onPress={() => onImagePress(0)}
        style={styles.calendarPhotoPrimary}
        testID={`calendar-photo-primary-${entry.id}`}
      >
        <CalendarPhotoImage photo={primary} style={styles.calendarPhotoImage} />
      </Pressable>

      <View style={styles.calendarPhotoSecondaryColumn}>
        {secondary ? (
          <Pressable
            onPress={() => onImagePress(1)}
            style={styles.calendarPhotoSecondaryCell}
            testID={`calendar-photo-secondary-cell-1-${entry.id}`}
          >
            <CalendarPhotoImage photo={secondary} style={styles.calendarPhotoImage} />
          </Pressable>
        ) : (
          <View style={styles.calendarPhotoSecondaryCell} />
        )}

        {tertiary ? (
          <Pressable
            onPress={() => onImagePress(2)}
            style={styles.calendarPhotoSecondaryCell}
            testID={`calendar-photo-secondary-cell-2-${entry.id}`}
          >
            <CalendarPhotoImage photo={tertiary} style={styles.calendarPhotoImage} />
            {overflow > 0 ? (
              <View style={styles.calendarPhotoOverflowMask}>
                <Text style={styles.calendarPhotoOverflowText}>+{overflow}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.calendarPhotoSecondaryCell} />
        )}
      </View>
    </View>
  );
}
