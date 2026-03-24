import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import WaveformAnimation from '../WaveformAnimation';
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
          <TouchableOpacity
            style={[styles.calendarStopButton, (isProcessing || isStopping) && styles.buttonDisabled]}
            disabled={isProcessing || isStopping}
            activeOpacity={0.7}
            onPress={() => {
              void onRunStopRecording(entry.id, isStopping);
            }}
          >
            <View style={styles.stopIconCompact} />
          </TouchableOpacity>
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
            <TouchableOpacity
              testID={`calendar-voice-play-button-${entry.id}`}
              style={styles.calendarVoicePlayBtn}
              onPress={isPlayingAudio ? onStopAudio : onPlayAudio}
              activeOpacity={0.85}
            >
              {isPlayingAudio ? (
                <Ionicons name="stop" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
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
