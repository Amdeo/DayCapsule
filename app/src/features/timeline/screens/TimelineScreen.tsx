import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';

export const TimelineScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">时间线</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        回顾您的记忆
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    marginTop: 10,
  },
});
