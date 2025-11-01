import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Switch,
  Alert,
  SectionList,
} from 'react-native';
import {logger} from '@services/telemetry/logger';

interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  icon: string;
}

interface PrivacySection {
  title: string;
  data: PrivacySetting[];
}

interface PrivacySettingsProps {
  testID?: string;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({testID}) => {
  const [settings, setSettings] = useState({
    analyticsEnabled: true,
    crashReportsEnabled: true,
    locationTracking: true,
    dataSharing: false,
    thirdPartyAccess: false,
  });

  // 隐私设置项
  const privacySections: PrivacySection[] = [
    {
      title: '数据收集',
      data: [
        {
          id: 'analytics',
          label: '分析数据',
          description: '帮助我们改进应用',
          type: 'toggle',
          value: settings.analyticsEnabled,
          icon: '📊',
          onPress: () => handleToggle('analyticsEnabled'),
        },
        {
          id: 'crashReports',
          label: '崩溃报告',
          description: '自动报告应用崩溃',
          type: 'toggle',
          value: settings.crashReportsEnabled,
          icon: '⚠️',
          onPress: () => handleToggle('crashReportsEnabled'),
        },
      ],
    },
    {
      title: '位置和追踪',
      data: [
        {
          id: 'locationTracking',
          label: '位置追踪',
          description: '记录您的位置信息',
          type: 'toggle',
          value: settings.locationTracking,
          icon: '📍',
          onPress: () => handleToggle('locationTracking'),
        },
      ],
    },
    {
      title: '数据共享',
      data: [
        {
          id: 'dataSharing',
          label: '数据共享',
          description: '与合作伙伴共享数据',
          type: 'toggle',
          value: settings.dataSharing,
          icon: '🔗',
          onPress: () => handleToggle('dataSharing'),
        },
        {
          id: 'thirdParty',
          label: '第三方访问',
          description: '允许第三方应用访问',
          type: 'toggle',
          value: settings.thirdPartyAccess,
          icon: '🔓',
          onPress: () => handleToggle('thirdPartyAccess'),
        },
      ],
    },
    {
      title: '数据管理',
      data: [
        {
          id: 'exportData',
          label: '导出数据',
          description: '导出您的所有数据',
          type: 'action',
          icon: '📤',
          onPress: () => handleExportData(),
        },
        {
          id: 'deleteData',
          label: '删除数据',
          description: '永久删除您的所有数据',
          type: 'action',
          icon: '🗑️',
          onPress: () => handleDeleteData(),
        },
      ],
    },
  ];

  // 处理切换
  const handleToggle = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof settings],
    }));
    logger.info('Privacy setting toggled', {
      key,
      value: !settings[key as keyof typeof settings],
    });
  };

  // 处理导出数据
  const handleExportData = () => {
    Alert.alert(
      '导出数据',
      '确定要导出所有数据吗？',
      [
        {text: '取消', onPress: () => {}},
        {
          text: '导出',
          onPress: () => {
            logger.info('Data export initiated');
            Alert.alert('成功', '数据已导出到下载文件夹');
          },
        },
      ],
    );
  };

  // 处理删除数据
  const handleDeleteData = () => {
    Alert.alert(
      '删除数据',
      '确定要永久删除所有数据吗？此操作无法撤销。',
      [
        {text: '取消', onPress: () => {}},
        {
          text: '删除',
          onPress: () => {
            logger.info('Data deletion initiated');
            Alert.alert('成功', '所有数据已删除');
          },
        },
      ],
    );
  };

  // 渲染设置项
  const renderItem = ({item}: {item: PrivacySetting}) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
      testID={`privacy_${item.id}`}
    >
      <View style={styles.settingContent}>
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{item.label}</Text>
          <Text style={styles.settingDescription}>{item.description}</Text>
        </View>
      </View>

      {item.type === 'toggle' && (
        <Switch
          value={item.value || false}
          onValueChange={item.onPress}
          testID={`toggle_${item.id}`}
        />
      )}

      {item.type === 'action' && (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  // 渲染分组头
  const renderSectionHeader = ({section}: {section: PrivacySection}) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>隐私设置</Text>
        <Text style={styles.subtitle}>管理您的隐私和数据</Text>
      </View>

      <SectionList
        sections={privacySections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        testID="privacy_list"
      />

      {/* 隐私政策 */}
      <View style={styles.footer}>
        <TouchableOpacity testID="privacy_policy_button">
          <Text style={styles.footerLink}>查看隐私政策</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="terms_button">
          <Text style={styles.footerLink}>查看服务条款</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

