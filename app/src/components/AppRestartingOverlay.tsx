import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export function AppRestartingOverlay() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>正在切换账号...</Text>
    </View>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
} satisfies {
  container: ViewStyle;
  text: TextStyle;
};
