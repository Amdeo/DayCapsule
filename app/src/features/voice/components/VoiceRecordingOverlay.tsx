import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

interface VoiceRecordingOverlayProps {
  isVisible: boolean;
  durationSeconds: number;
}

const VoiceRecordingOverlay: React.FC<VoiceRecordingOverlayProps> = ({ isVisible, durationSeconds }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      pulse.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.ease }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <IconButton icon="microphone" size={48} color={theme.colors.onPrimary} />
        </Animated.View>
        <Text style={styles.timerText}>{formatDuration(durationSeconds)}</Text>
        <Text style={styles.hintText}>松开保存，上滑取消</Text>
      </View>
    </View>
  );
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200, // Above everything
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default VoiceRecordingOverlay;
