import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AccountEntry, ActiveAccountRef } from '@/src/services/accountRegistryService';
import { AccountSwitcherItem } from './AccountSwitcherItem';

interface AccountSwitcherModalProps {
  visible: boolean;
  accounts: AccountEntry[];
  activeRef: ActiveAccountRef | null;
  isSwitching: boolean;
  onSwitch: (serverUrl: string, userId: string) => void;
  onAddAccount: () => void;
  onClose: () => void;
}

function isActiveAccount(
  account: AccountEntry,
  activeRef: ActiveAccountRef | null,
): boolean {
  return (
    account.serverUrl === activeRef?.serverUrl &&
    account.userId === activeRef?.userId
  );
}

export function AccountSwitcherModal({
  visible,
  accounts,
  activeRef,
  isSwitching,
  onSwitch,
  onAddAccount,
  onClose,
}: AccountSwitcherModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <AccountSwitcherHeader onClose={onClose} />
          <View style={styles.divider} />
          <ScrollView style={styles.list} bounces={false} keyboardShouldPersistTaps="handled">
            {accounts.map((account, index) => (
              <React.Fragment key={`${account.serverUrl}::${account.userId}`}>
                {index > 0 && <View style={styles.separator} />}
                <AccountSwitcherItem
                  email={account.email}
                  serverUrl={account.serverUrl}
                  isActive={isActiveAccount(account, activeRef)}
                  disabled={isSwitching}
                  onPress={() => onSwitch(account.serverUrl, account.userId)}
                />
              </React.Fragment>
            ))}
          </ScrollView>
          <View style={styles.divider} />
          <AddAccountButton onPress={onAddAccount} disabled={isSwitching} />
        </View>
      </View>
    </Modal>
  );
}

function AccountSwitcherHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>切换账号</Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={22} color="#374151" />
      </Pressable>
    </View>
  );
}

function AddAccountButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable style={styles.addButton} onPress={onPress} disabled={disabled}>
      <Ionicons name="add-circle-outline" size={22} color="#6A89CC" />
      <Text style={styles.addButtonText}>添加账号</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 0,
  },
  list: {
    maxHeight: 320,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  addButtonText: {
    fontSize: 15,
    color: '#6A89CC',
    fontWeight: '500',
  },
});
