import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={theme.colors.onSurfaceDisabled} style={styles.icon} />
      <Text variant="headlineSmall" style={[styles.title, {color: theme.colors.onSurface}]}>
        {title}
      </Text>
      {message && (
        <Text variant="bodyMedium" style={[styles.message, {color: theme.colors.onSurfaceVariant}]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    minWidth: 120,
  },
});
