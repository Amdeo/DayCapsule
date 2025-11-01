import React, {useState, useEffect, useRef} from 'react';
import {View, StyleSheet, Slider} from 'react-native';
import {Button, Text, IconButton} from 'react-native-paper';
import {NativeModules} from 'react-native';

const {AudioPlayerModule} = NativeModules;

interface AudioPlayerProps {
  audioPath: string;
  isPlaying: boolean;
  onPlayingChange: (isPlaying: boolean) => void;
  testID?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioPath,
  isPlaying,
  onPlayingChange,
  testID,
}) => {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateInterval = useRef<NodeJS.Timeout>();

  // 初始化播放器
  useEffect(() => {
    const initPlayer = async () => {
      try {
        setIsLoading(true);
        const audioInfo = await AudioPlayerModule.prepare({
          path: audioPath,
        });
        setDuration(audioInfo.duration);
        setCurrentTime(0);
      } catch (err) {
        setError('无法加载音频文件');
      } finally {
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [audioPath]);

  // 更新播放进度
  useEffect(() => {
    if (isPlaying) {
      updateInterval.current = setInterval(async () => {
        try {
          const currentPos = await AudioPlayerModule.getCurrentPosition();
          setCurrentTime(currentPos);

          // 检查是否播放完成
          if (currentPos >= duration) {
            await handleStop();
          }
        } catch (err) {
          // 忽略错误
        }
      }, 100);
    } else {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    }

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [isPlaying, duration]);

  const handlePlay = async () => {
    try {
      setError(null);
      await AudioPlayerModule.play();
      onPlayingChange(true);
    } catch (err) {
      setError('播放失败');
    }
  };

  const handlePause = async () => {
    try {
      await AudioPlayerModule.pause();
      onPlayingChange(false);
    } catch (err) {
      setError('暂停失败');
    }
  };

  const handleStop = async () => {
    try {
      await AudioPlayerModule.stop();
      setCurrentTime(0);
      onPlayingChange(false);
    } catch (err) {
      setError('停止失败');
    }
  };

  const handleSeek = async (value: number) => {
    try {
      await AudioPlayerModule.seek(value);
      setCurrentTime(value);
    } catch (err) {
      setError('跳转失败');
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container} testID={testID || 'audio_player'}>
      {/* 标题 */}
      <Text style={styles.title}>音频回放</Text>

      {/* 错误提示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}

      {/* 播放控制 */}
      <View style={styles.controlsContainer}>
        {isPlaying ? (
          <>
            <IconButton
              icon="pause"
              size={32}
              onPress={handlePause}
              testID="pause_button"
            />
            <Text style={styles.controlLabel}>暂停</Text>
          </>
        ) : (
          <>
            <IconButton
              icon="play"
              size={32}
              onPress={handlePlay}
              testID="play_button"
            />
            <Text style={styles.controlLabel}>播放</Text>
          </>
        )}

        <IconButton
          icon="stop"
          size={32}
          onPress={handleStop}
          testID="stop_button"
        />
        <Text style={styles.controlLabel}>停止</Text>
      </View>

      {/* 进度条 */}
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSeek}
          disabled={isLoading}
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* 播放速度控制 */}
      <View style={styles.speedContainer}>
        <Text style={styles.speedLabel}>播放速度</Text>
        <View style={styles.speedButtons}>
          {[0.75, 1, 1.25, 1.5].map(speed => (
            <Button
              key={speed}
              mode="outlined"
              compact
              onPress={async () => {
                try {
                  await AudioPlayerModule.setPlaybackRate(speed);
                } catch (err) {
                  setError('设置播放速度失败');
                }
              }}
              style={styles.speedButton}>
              {speed}x
            </Button>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
  },
  speedContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    flex: 1,
  },
});

