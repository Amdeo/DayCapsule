import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IconButton, useTheme, ProgressBar, Button } from 'react-native-paper'; // Imported Button
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { logger } from '../../../../services/telemetry/logger';

interface AudioPlayerProps {
  audioPath: string;
  testID?: string;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioPath, testID }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (playerInterval.current) {
        clearInterval(playerInterval.current);
      }
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const onStartPlay = async () => {
    if (!audioPath) {
      setError("没有找到音频文件");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      logger.info('Starting audio playback', { audioPath });
      const msg = await audioRecorderPlayer.startPlayer(audioPath);
      audioRecorderPlayer.setVolume(1.0); // TODO: Adjust volume
      
      setIsPlaying(true);
      setIsLoading(false);
      
      playerInterval.current = setInterval(() => {
        audioRecorderPlayer.addPlayBackListener((e: any) => {
          setCurrentPosition(e.currentPosition);
          setTrackDuration(e.duration);
          if (e.currentPosition === e.duration) {
            // End of playback
            onStopPlay();
          }
        });
      }, 100); // Update every 100ms

      logger.info('Audio playback started', { msg });
    } catch (e: any) {
      logger.error('Failed to start audio playback', { error: e.message, audioPath });
      setError("播放失败: " + e.message);
      setIsLoading(false);
    }
  };

  const onStopPlay = async () => {
    try {
      logger.info('Stopping audio playback', { audioPath });
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
      setCurrentPosition(0);
      setTrackDuration(0);
      logger.info('Audio playback stopped');
    } catch (e: any) {
      logger.error('Failed to stop audio playback', { error: e.message, audioPath });
      setError("停止播放失败: " + e.message);
    }
  };

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${min}:${remainingSec < 10 ? '0' : ''}${remainingSec}`;
  };

  return (
    <View style={styles.container} testID={testID}>
      {error && <Text style={styles.errorText}>错误: {error}</Text>}
      <View style={styles.controls}>
        <IconButton
          icon={isPlaying ? "pause-circle" : "play-circle"}
          size={40}
          color={theme.colors.primary}
          onPress={isPlaying ? onStopPlay : onStartPlay}
          disabled={isLoading || !audioPath}
        />
        <View style={styles.progressContainer}>
          <ProgressBar progress={trackDuration > 0 ? currentPosition / trackDuration : 0} color={theme.colors.primary} style={styles.progressBar} />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
            <Text style={styles.timeText}>{formatTime(trackDuration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    marginVertical: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 10,
  },
  progressBar: {
    height: 5,
    borderRadius: 5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 5,
  }
});

export default AudioPlayer;