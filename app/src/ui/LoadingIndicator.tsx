import React from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {Text, useTheme} from 'react-native-paper';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = '加载中...',
  size = 'large',
  fullScreen = false,
}) => {
  const theme = useTheme();

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View
      style={[
        containerStyle,
        {backgroundColor: fullScreen ? theme.colors.background : 'transparent'},
      ]}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && <Text style={[styles.message, {color: theme.colors.onSurface}]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
  },
});
