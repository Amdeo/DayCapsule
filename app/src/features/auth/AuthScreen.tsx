/**
 * 认证屏幕组件
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';

export const AuthScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.title, {color: theme.colors.onBackground}]}>
        认证
      </Text>
      <Text style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
        登录或注册您的账户
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});