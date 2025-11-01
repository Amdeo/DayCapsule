import React, {useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import {FAB} from 'react-native-paper';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressTimer = useRef<NodeJS.Timeout>();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        handlePressIn();
      },
      onPanResponderRelease: () => {
        handlePressOut();
      },
      onPanResponderTerminate: () => {
        handlePressOut();
      },
    }),
  ).current;

  const handlePressIn = () => {
    setIsPressed(true);

    // 长按 500ms 后开始录音
    pressTimer.current = setTimeout(() => {
      if (!isRecording) {
        onStart();
      }
    }, 500);

    // 动画：按钮缩小
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);

    // 清除定时器
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }

    // 动画：按钮恢复
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // 如果正在录音，停止录音
    if (isRecording) {
      onStop();
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  const getButtonColor = () => {
    if (isRecording) {
      return isPaused ? '#ff9800' : '#f44336';
    }
    return '#2196f3';
  };

  const getButtonIcon = () => {
    if (isRecording) {
      return isPaused ? 'play' : 'pause';
    }
    return 'microphone';
  };

  const getButtonLabel = () => {
    if (isRecording) {
      return isPaused ? '继续' : '暂停';
    }
    return '长按录音';
  };

  return (
    <View style={styles.container}>
      {/* 主录音按钮 */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}
        {...panResponder.panHandlers}
        testID="record_button">
        <FAB
          icon={getButtonIcon()}
          color="#fff"
          style={[
            styles.fab,
            {
              backgroundColor: getButtonColor(),
            },
          ]}
          onPress={isRecording ? handlePauseResume : undefined}
          onLongPress={!isRecording ? handlePressIn : undefined}
          onPressOut={handlePressOut}
          disabled={false}
        />
      </Animated.View>

      {/* 辅助按钮（仅在录音时显示） */}
      {isRecording && (
        <View style={styles.auxiliaryButtons}>
          {/* 停止按钮 */}
          <FAB
            icon="stop"
            color="#fff"
            style={[styles.auxiliaryFab, {backgroundColor: '#f44336'}]}
            onPress={onStop}
            size="small"
            testID="stop_button"
          />

          {/* 暂停/继续按钮 */}
          <FAB
            icon={isPaused ? 'play' : 'pause'}
            color="#fff"
            style={[styles.auxiliaryFab, {backgroundColor: '#ff9800'}]}
            onPress={handlePauseResume}
            size="small"
            testID="pause_resume_button"
          />
        </View>
      )}

      {/* 提示文本 */}
      <View style={styles.labelContainer}>
        <View style={styles.label}>
          {isRecording ? (
            <>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isPaused ? '#ff9800' : '#f44336',
                  },
                ]}
              />
              <Text style={styles.labelText}>
                {isPaused ? '已暂停' : '录音中'}
              </Text>
            </>
          ) : (
            <Text style={styles.labelText}>长按开始录音</Text>
          )}
        </View>
      </View>
    </View>
  );
};

import {Text} from 'react-native-paper';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    marginBottom: 24,
  },
  fab: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auxiliaryButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  auxiliaryFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  labelContainer: {
    marginTop: 16,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 14,
    color: '#666',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

