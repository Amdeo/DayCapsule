import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AccountSwitcherItemProps {
  email: string;
  serverUrl: string;
  isActive: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function AccountSwitcherItem({
  email,
  serverUrl,
  isActive,
  disabled,
  onPress,
}: AccountSwitcherItemProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(email)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        <Text style={styles.hostname} numberOfLines={1}>{getHostname(serverUrl)}</Text>
      </View>
      {isActive && (
        <Ionicons name="checkmark-circle" size={22} color="#6A89CC" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  email: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  hostname: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
