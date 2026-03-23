import React from 'react';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { entryCardStyles as styles } from './EntryCard.styles';

interface EntryCardCalendarTagsProps {
  entry: Entry;
  isExpanded: boolean;
}

interface EntryCardCalendarTranscriptionProps {
  text?: string;
  isExpanded: boolean;
}

export function EntryCardCalendarTags({
  entry,
  isExpanded,
}: EntryCardCalendarTagsProps) {
  if (!entry.tags || entry.tags.length === 0) {
    return null;
  }

  return (
    <View
      testID={entry.type === 'photo' ? 'photo-tags-container' : undefined}
      style={[
        styles.calendarTagsContainer,
        entry.type === 'photo' && styles.calendarPhotoTagsContainer,
      ]}
    >
      {(isExpanded ? entry.tags : entry.tags.slice(0, 3)).map((tag, index) => (
        <View
          key={index}
          style={[
            styles.calendarTag,
            entry.type === 'text' && styles.calendarTagTextTone,
            entry.type === 'voice' && styles.calendarTagVoiceTone,
          ]}
        >
          <Text
            style={[
              styles.calendarTagText,
              entry.type === 'text' && styles.calendarTagTextTextTone,
              entry.type === 'voice' && styles.calendarTagTextVoiceTone,
            ]}
          >
            #{tag}
          </Text>
        </View>
      ))}
      {!isExpanded && entry.tags.length > 3 ? (
        <Text style={styles.calendarMoreTagsHint}>+{entry.tags.length - 3}</Text>
      ) : null}
    </View>
  );
}

export function EntryCardCalendarTranscription({
  text,
  isExpanded,
}: EntryCardCalendarTranscriptionProps) {
  if (!text) {
    return null;
  }

  return (
    <View style={styles.calendarTranscriptionContainer}>
      <Text
        style={styles.calendarTranscriptionText}
        numberOfLines={isExpanded ? undefined : 2}
      >
        {text}
      </Text>
    </View>
  );
}
