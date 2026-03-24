import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsBackendServerCardProps {
  currentServerUrl: string;
  draftServerUrl: string;
  recentServerUrls: string[];
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  testErrorMessage: string | null;
  isSaving: boolean;
  canSave: boolean;
  onChangeDraftUrl: (value: string) => void;
  onTestConnection: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onSelectRecentServer: (url: string) => void;
}

const getStatusText = (
  testStatus: SettingsBackendServerCardProps['testStatus'],
  testErrorMessage: string | null,
): string => {
  switch (testStatus) {
    case 'testing':
      return '测试中...';
    case 'success':
      return '连接成功';
    case 'error':
      return testErrorMessage ? `连接失败: ${testErrorMessage}` : '连接失败，请检查地址或网络';
    default:
      return '请先测试连接，再保存并切换';
  }
};

export function SettingsBackendServerCard({
  currentServerUrl,
  draftServerUrl,
  recentServerUrls,
  testStatus,
  testErrorMessage,
  isSaving,
  canSave,
  onChangeDraftUrl,
  onTestConnection,
  onSave,
  onSelectRecentServer,
}: SettingsBackendServerCardProps) {
  const saveDisabled = !canSave || isSaving;

  return (
    <View testID="settings-backend-card" style={styles.backendCard}>
      <Text style={styles.settingTitle}>后端连接</Text>
      <Text style={styles.settingSubtitle}>当前生效地址：{currentServerUrl}</Text>
      <Text style={styles.settingSubtitle}>测试会请求 `/health`，切换后需要重新登录。</Text>

      <TextInput
        testID="settings-backend-input"
        value={draftServerUrl}
        onChangeText={onChangeDraftUrl}
        placeholder="https://api.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.backendInput}
      />

      <View style={styles.backendActionRow}>
        <Pressable
          testID="settings-backend-test-button"
          style={styles.backendSecondaryButton}
          onPress={onTestConnection}
        >
          <Text style={styles.backendSecondaryButtonText}>
            {testStatus === 'testing' ? '测试中...' : '测试连接'}
          </Text>
        </Pressable>

        <Pressable
          testID="settings-backend-save-button"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          style={[styles.backendPrimaryButton, saveDisabled && styles.backendPrimaryButtonDisabled]}
          onPress={onSave}
        >
          <Text style={styles.backendPrimaryButtonText}>
            {isSaving ? '保存中...' : '保存并切换'}
          </Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.backendStatusText,
          testStatus === 'success' ? styles.backendStatusSuccess : null,
          testStatus === 'error' ? styles.backendStatusError : null,
        ]}
      >
        {getStatusText(testStatus, testErrorMessage)}
      </Text>

      {recentServerUrls.length > 0 ? (
        <View style={styles.backendHistorySection}>
          <Text style={styles.backendHistoryTitle}>最近使用</Text>
          <View style={styles.backendHistoryList}>
            {recentServerUrls.map((url) => (
              <Pressable
                key={url}
                style={styles.backendHistoryChip}
                onPress={() => onSelectRecentServer(url)}
              >
                <Text style={styles.backendHistoryChipText}>{url}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
