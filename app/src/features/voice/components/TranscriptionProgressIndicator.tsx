import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

interface TranscriptionProgressIndicatorProps {
  isVisible: boolean;
  message?: string;
}

const TranscriptionProgressIndicator: React.FC<TranscriptionProgressIndicatorProps> = ({
  isVisible,
  message = '正在转写语音...',
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 300, // Above VoiceRecordingOverlay
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageText: {
    marginTop: 15,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
});

export default TranscriptionProgressIndicator;
