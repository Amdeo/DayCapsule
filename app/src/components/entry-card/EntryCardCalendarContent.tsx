import React from 'react';
import { View, Text } from 'react-native';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import { entryCardStyles as styles } from './EntryCard.styles';
import {
  EntryCardCalendarTags,
  EntryCardCalendarTranscription,
} from './EntryCardCalendarMeta';
import { EntryCardCalendarPhotoSection } from './EntryCardCalendarPhotoSection';
import { EntryCardCalendarVoiceSection } from './EntryCardCalendarVoiceSection';

interface EntryCardCalendarContentProps {
  entry: Entry;
  isExpanded: boolean;
  resolvedPhotoHeight: number;
  calendarDensity: CalendarDensity;
  audioMissing: boolean;
  isPlayingAudio: boolean;
  playbackPosition: number;
  isProcessing: boolean;
  onCardPress: () => void;
  onImagePress: (index: number) => void;
  onPlayAudio: () => void | Promise<void>;
  onStopAudio: () => void | Promise<void>;
  onRunStopRecording: (entryId: string, isStopping: boolean) => void | Promise<void>;
}

export function EntryCardCalendarContent({
  entry,
  isExpanded,
  resolvedPhotoHeight,
  calendarDensity,
  audioMissing,
  isPlayingAudio,
  playbackPosition,
  isProcessing,
  onCardPress,
  onImagePress,
  onPlayAudio,
  onStopAudio,
  onRunStopRecording,
}: EntryCardCalendarContentProps) {
  if (entry.type === 'text') {
    return (
      <View style={styles.calendarTextCard}>
        <Text style={styles.calendarTextContent}>
          {entry.content}
        </Text>
        <EntryCardCalendarTags entry={entry} isExpanded={isExpanded} />
        <EntryCardCalendarTranscription
          text={entry.transcription?.text}
          isExpanded={isExpanded}
        />
      </View>
    );
  }

  if (entry.type === 'photo') {
    return (
      <EntryCardCalendarPhotoSection
        entry={entry}
        isExpanded={isExpanded}
        resolvedPhotoHeight={resolvedPhotoHeight}
        calendarDensity={calendarDensity}
        onCardPress={onCardPress}
        onImagePress={onImagePress}
      />
    );
  }

  if (entry.type !== 'voice') {
    return null;
  }

  return (
    <EntryCardCalendarVoiceSection
      entry={entry}
      isExpanded={isExpanded}
      calendarDensity={calendarDensity}
      audioMissing={audioMissing}
      isPlayingAudio={isPlayingAudio}
      playbackPosition={playbackPosition}
      isProcessing={isProcessing}
      onPlayAudio={onPlayAudio}
      onStopAudio={onStopAudio}
      onRunStopRecording={onRunStopRecording}
    />
  );
}
