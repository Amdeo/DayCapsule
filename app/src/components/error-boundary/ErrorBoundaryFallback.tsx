import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { errorBoundaryStyles as styles } from './ErrorBoundary.styles';

interface ErrorBoundaryFallbackProps {
  message: string;
  onReset: () => void;
}

export function ErrorBoundaryFallback({
  message,
  onReset,
}: ErrorBoundaryFallbackProps) {
  return (
    <View testID="error-boundary-root" style={styles.container}>
      <Text style={styles.title}>应用遇到错误</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable testID="error-boundary-reset" style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>重试</Text>
      </Pressable>
    </View>
  );
}
