import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import WaveformAnimation from '../WaveformAnimation';
import { entryCardStyles as styles } from './EntryCard.styles';
import {
  formatEntryCardDuration,
  getEntryMediaDurationSeconds,
} from './entryCardContentHelpers';
import { isVoiceMediaPendingHydration } from '@/src/utils/mediaAvailability';

interface EntryCardDefaultVoiceContentProps {
  entry: Entry;
  isExpanded: boolean;
  audioMissing: boolean;
  isPlayingAudio: boolean;
  playbackPosition: number;
  isProcessing: boolean;
  isLocalReadyProcessing: boolean;
  onPlayAudio: () => void | Promise<void>;
  onStopAudio: () => void | Promise<void>;
  onRunStopRecording: (entryId: string, isStopping: boolean) => void | Promise<void>;
}

export function EntryCardDefaultVoiceContent({
  entry,
  isExpanded,
  audioMissing,
  isPlayingAudio,
  playbackPosition,
  isProcessing,
  isLocalReadyProcessing,
  onPlayAudio,
  onStopAudio,
  onRunStopRecording,
}: EntryCardDefaultVoiceContentProps) {
  if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'stopping') {
    const isStopping = entry.recordingStatus === 'stopping';

    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingCompact}>
          <TouchableOpacity
            testID={`voice-stop-button-${entry.id}`}
            style={[styles.stopButtonCompact, (isProcessing || isStopping) && styles.buttonDisabled]}
            disabled={isProcessing || isStopping}
            activeOpacity={0.7}
            onPress={() => {
              void onRunStopRecording(entry.id, isStopping);
            }}
          >
            <Ionicons name="stop" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.recordingCenter}>
            <View style={styles.waveformCompact}>
              <WaveformAnimation
                isRecording={entry.recordingStatus === 'recording'}
                color="#F5A68D"
              />
            </View>
            <Text style={styles.recordingLabel}>
              {isStopping ? '处理中...' : '录音中...'}
            </Text>
          </View>

          <Text style={styles.recordingTimeCompact}>
            {formatEntryCardDuration(entry.recordingDuration || 0)}
          </Text>
        </View>
      </View>
    );
  }

  if (entry.syncStatus === 'uploading') {
    return (
      <View style={styles.voiceCard}>
        <View style={styles.voicePlayRow}>
          <View
            testID={`voice-uploading-button-${entry.id}`}
            style={[styles.voicePlayBtn, styles.voicePlayBtnDisabled]}
          >
            <ActivityIndicator
              testID={`voice-uploading-spinner-${entry.id}`}
              size="small"
              color="#FFFFFF"
            />
          </View>

          <View style={styles.voiceWaveform}>
            <WaveformAnimation isRecording={false} color="#D9D9D9" />
          </View>

          <Text
            testID={`voice-uploading-label-${entry.id}`}
            style={styles.voiceUploadingText}
          >
            上传中
          </Text>
        </View>

        {(entry.transcription?.text || entry.content) ? (
          <Text style={styles.voiceCaption} numberOfLines={isExpanded ? undefined : 3}>
            {entry.transcription?.text || entry.content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (!entry.media || entry.media.length === 0) {
    return null;
  }

  if (isLocalReadyProcessing) {
    return (
      <View style={styles.voiceCard}>
        <View style={styles.voicePlayRow}>
          <TouchableOpacity
            testID={`voice-processing-button-${entry.id}`}
            style={[styles.voicePlayBtn, styles.voicePlayBtnDisabled]}
            disabled
            activeOpacity={1}
          >
            <Ionicons name="hourglass-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.voiceWaveform}>
            <WaveformAnimation isRecording={false} color="#D9D9D9" />
          </View>

          <Text testID={`voice-processing-duration-${entry.id}`} style={styles.voiceDuration}>
            {formatEntryCardDuration(
              entry.recordingDuration ?? getEntryMediaDurationSeconds(entry.media[0])
            )}
          </Text>
        </View>

        <Text style={styles.voiceUploadingText}>准备中</Text>

        {(entry.transcription?.text || entry.content) ? (
          <Text style={styles.voiceCaption} numberOfLines={isExpanded ? undefined : 3}>
            {entry.transcription?.text || entry.content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (isVoiceMediaPendingHydration(entry.media[0])) {
    return (
      <View style={styles.voiceCard}>
        <View style={styles.voicePlayRow}>
          <View
            testID={`voice-preparing-button-${entry.id}`}
            style={[styles.voicePlayBtn, styles.voicePlayBtnDisabled]}
          >
            <ActivityIndicator
              testID={`voice-preparing-spinner-${entry.id}`}
              size="small"
              color="#FFFFFF"
            />
          </View>

          <View style={styles.voiceWaveform}>
            <WaveformAnimation isRecording={false} color="#D9D9D9" />
          </View>

          <Text
            testID={`voice-preparing-label-${entry.id}`}
            style={styles.voiceUploadingText}
          >
            准备中
          </Text>
        </View>

        {(entry.transcription?.text || entry.content) ? (
          <Text style={styles.voiceCaption} numberOfLines={isExpanded ? undefined : 3}>
            {entry.transcription?.text || entry.content}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.voiceCard}>
      <View style={styles.voicePlayRow}>
        {audioMissing ? (
          <View style={styles.audioMissingRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
            <Text style={styles.audioMissingText}>音频文件已丢失</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.voicePlayBtn}
              onPress={isPlayingAudio ? onStopAudio : onPlayAudio}
              activeOpacity={0.8}
            >
              {isPlayingAudio ? (
                <Ionicons name="stop" size={22} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <View style={styles.voiceWaveform}>
              <WaveformAnimation
                isRecording={isPlayingAudio}
                color={isPlayingAudio ? '#F5A623' : '#C4C4C4'}
              />
            </View>

            <Text style={styles.voiceDuration}>
              {isPlayingAudio
                ? formatEntryCardDuration(Math.floor(playbackPosition / 1000))
                : formatEntryCardDuration(getEntryMediaDurationSeconds(entry.media[0]))}
            </Text>
          </>
        )}
      </View>

      {entry.syncStatus === 'pending_upload' ? (
        <Text style={styles.voiceUploadingText}>待上传</Text>
      ) : null}

      {(entry.transcription?.text || entry.content) ? (
        <Text style={styles.voiceCaption} numberOfLines={isExpanded ? undefined : 3}>
          {entry.transcription?.text || entry.content}
        </Text>
      ) : null}
    </View>
  );
}
