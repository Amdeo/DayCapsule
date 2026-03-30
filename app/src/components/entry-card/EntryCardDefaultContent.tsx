import React from 'react';
import { Text } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { PhotoGrid } from '../PhotoGrid';
import type { EntryCardSyncStatusMeta } from './entryCardAppearance';
import { entryCardStyles as styles } from './EntryCard.styles';
import { EntryCardDefaultMeta } from './EntryCardDefaultMeta';
import { EntryCardDefaultVoiceContent } from './EntryCardDefaultVoiceContent';
import type { PhotoImageRadiusStyle } from '../photo-grid/photoGridTypes';

interface EntryCardDefaultContentProps {
  entry: Entry;
  isExpanded: boolean;
  resolvedPhotoHeight: number;
  photoImageRadius: PhotoImageRadiusStyle;
  syncStatusMeta: EntryCardSyncStatusMeta;
  audioMissing: boolean;
  isPlayingAudio: boolean;
  playbackPosition: number;
  isProcessing: boolean;
  isLocalReadyProcessing: boolean;
  onImagePress: (index: number) => void;
  onPlayAudio: () => void | Promise<void>;
  onStopAudio: () => void | Promise<void>;
  onRunStopRecording: (entryId: string, isStopping: boolean) => void | Promise<void>;
}

export function EntryCardDefaultContent({
  entry,
  isExpanded,
  resolvedPhotoHeight,
  photoImageRadius,
  syncStatusMeta,
  audioMissing,
  isPlayingAudio,
  playbackPosition,
  isProcessing,
  isLocalReadyProcessing,
  onImagePress,
  onPlayAudio,
  onStopAudio,
  onRunStopRecording,
}: EntryCardDefaultContentProps) {
  return (
    <>
      {entry.type === 'text' ? (
        <Text
          style={styles.textContent}
          numberOfLines={isExpanded ? undefined : 4}
        >
          {entry.content}
        </Text>
      ) : entry.type === 'photo' && entry.media && entry.media.length > 0 ? (
        <>
          <PhotoGrid
            photos={entry.media}
            maxPhotoHeight={resolvedPhotoHeight}
            photoImageRadius={photoImageRadius}
            onPhotoPress={onImagePress}
          />
          {isLocalReadyProcessing ? (
            <Text
              testID={`photo-processing-label-${entry.id}`}
              style={[styles.photoCaption, styles.photoProcessingCaption]}
            >
              准备中
            </Text>
          ) : null}
          {entry.content ? (
            <Text style={styles.photoCaption} numberOfLines={isExpanded ? undefined : 2}>
              {entry.content}
            </Text>
          ) : null}
        </>
      ) : entry.type === 'voice' ? (
        <EntryCardDefaultVoiceContent
          entry={entry}
          isExpanded={isExpanded}
          audioMissing={audioMissing}
          isPlayingAudio={isPlayingAudio}
          playbackPosition={playbackPosition}
          isProcessing={isProcessing}
          isLocalReadyProcessing={isLocalReadyProcessing}
          onPlayAudio={onPlayAudio}
          onStopAudio={onStopAudio}
          onRunStopRecording={onRunStopRecording}
        />
      ) : null}

      <EntryCardDefaultMeta
        entry={entry}
        isExpanded={isExpanded}
        syncStatusMeta={syncStatusMeta}
      />
    </>
  );
}
