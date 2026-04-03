import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import WaveformAnimation from '@/src/components/WaveformAnimation';
import { entryCardStyles as styles } from './EntryCard.styles';
import { EntryCardCalendarTags } from './EntryCardCalendarMeta';
import {
  formatEntryCardDuration,
  getEntryMediaDurationSeconds,
} from './entryCardContentHelpers';

interface EntryCardCalendarVoiceSectionProps {
  entry: Entry;
  isExpanded: boolean;
  calendarDensity: CalendarDensity;
  audioMissing: boolean;
  isPlayingAudio: boolean;
  playbackPosition: number;
  isProcessing: boolean;
  isLocalReadyProcessing: boolean;
  onPlayAudio: () => void | Promise<void>;
  onStopAudio: () => void | Promise<void>;
  onRunStopRecording: (entryId: string, isStopping: boolean) => void | Promise<void>;
}

export function EntryCardCalendarVoiceSection({
  entry,
  isExpanded,
  calendarDensity,
  audioMissing,
  isPlayingAudio,
  playbackPosition,
  isProcessing,
  isLocalReadyProcessing,
  onPlayAudio,
  onStopAudio,
  onRunStopRecording,
}: EntryCardCalendarVoiceSectionProps) {
  if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'stopping') {
    const isStopping = entry.recordingStatus === 'stopping';

    return (
      <View
        testID={`calendar-recording-status-${entry.id}`}
        style={styles.calendarRecordingCard}
      >
        <View style={styles.calendarRecordingHeader}>
          <Pressable
            style={[styles.calendarStopButton, (isProcessing || isStopping) && styles.buttonDisabled]}
            disabled={isProcessing || isStopping}
            onPress={() => {
              void onRunStopRecording(entry.id, isStopping);
            }}
          >
            <View style={styles.stopIconCompact} />
          </Pressable>
          <View style={styles.calendarVoiceTrack}>
            <View style={styles.calendarVoiceTrackRow}>
              <View style={styles.calendarVoiceTrackActive}>
                <WaveformAnimation isRecording={!isStopping} color="#F1B463" />
              </View>
              <Text style={styles.calendarVoiceTime}>
                {isStopping ? '处理中...' : formatEntryCardDuration(entry.recordingDuration || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!entry.media || entry.media.length === 0) {
    return (
      <View style={styles.calendarVoiceCard}>
        <View style={styles.audioMissingRow}>
          <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
          <Text style={styles.audioMissingText}>音频文件已丢失</Text>
        </View>
      </View>
    );
  }

  if (isLocalReadyProcessing) {
    return (
      <View style={styles.calendarVoiceCard}>
        <View style={styles.calendarVoiceHeader}>
          <Pressable
            testID={`calendar-voice-processing-button-${entry.id}`}
            style={[styles.calendarVoicePlayBtn, styles.buttonDisabled]}
            disabled
          >
            <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.calendarVoiceTrack}>
            <View style={styles.calendarVoiceTrackRow}>
              <View style={styles.calendarVoiceTrackActive}>
                <WaveformAnimation isRecording={false} color="#EDC98D" />
              </View>
              <Text style={styles.calendarVoiceTime}>
                {formatEntryCardDuration(
                  entry.recordingDuration ?? getEntryMediaDurationSeconds(entry.media[0])
                )}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.calendarVoiceHint}>准备中</Text>
        {(entry.transcription?.text || entry.content) ? (
          <Text
            style={styles.calendarVoiceCaption}
            numberOfLines={isExpanded ? undefined : calendarDensity === 'compact' ? 2 : 3}
          >
            {entry.transcription?.text || entry.content}
          </Text>
        ) : null}
        <EntryCardCalendarTags entry={entry} isExpanded={isExpanded} />
      </View>
    );
  }

  return (
    <View style={styles.calendarVoiceCard}>
      <View style={styles.calendarVoiceHeader}>
        {audioMissing ? (
          <View style={styles.audioMissingRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
            <Text style={styles.audioMissingText}>音频文件已丢失</Text>
          </View>
        ) : (
          <>
            <Pressable
              testID={`calendar-voice-play-button-${entry.id}`}
              style={styles.calendarVoicePlayBtn}
              onPress={isPlayingAudio ? onStopAudio : onPlayAudio}
            >
              {isPlayingAudio ? (
                <Ionicons name="stop" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </Pressable>
            <View style={styles.calendarVoiceTrack}>
              <View style={styles.calendarVoiceTrackRow}>
                <View style={styles.calendarVoiceTrackActive}>
                  <WaveformAnimation
                    isRecording={isPlayingAudio}
                    color={isPlayingAudio ? '#F0A533' : '#EDC98D'}
                  />
                </View>
                <Text style={styles.calendarVoiceTime}>
                  {isPlayingAudio
                    ? formatEntryCardDuration(Math.floor(playbackPosition / 1000))
                    : formatEntryCardDuration(getEntryMediaDurationSeconds(entry.media[0]))}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
      {(entry.transcription?.text || entry.content) ? (
        <Text
          style={styles.calendarVoiceCaption}
          numberOfLines={isExpanded ? undefined : calendarDensity === 'compact' ? 2 : 3}
        >
          {entry.transcription?.text || entry.content}
        </Text>
      ) : null}
      <EntryCardCalendarTags entry={entry} isExpanded={isExpanded} />
    </View>
  );
}
