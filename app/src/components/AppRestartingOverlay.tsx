import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export function AppRestartingOverlay() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>正在切换账号...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
  },
});
