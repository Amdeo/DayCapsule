import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = '加载中...',
  size = 'large',
  color,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator 
        size={size} 
        color={color || theme.colors.primary} 
      />
      {message && (
        <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

export const FullScreenLoading: React.FC<LoadingIndicatorProps> = (props) => (
  <View style={styles.fullScreenContainer}>
    <LoadingIndicator {...props} />
  </View>
);

export const InlineLoading: React.FC<LoadingIndicatorProps> = (props) => (
  <View style={styles.inlineContainer}>
    <LoadingIndicator size="small" {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  inlineContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});
