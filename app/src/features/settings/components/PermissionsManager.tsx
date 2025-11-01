import React, {useState, useEffect} from 'react';
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
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {logger} from '@services/telemetry/logger';

interface Permission {
  id: string;
  name: string;
  description: string;
  status: 'granted' | 'denied' | 'blocked' | 'unavailable';
  permission: any;
  icon: string;
}

interface PermissionSection {
  title: string;
  data: Permission[];
}

interface PermissionsManagerProps {
  testID?: string;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({testID}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 权限列表
  const permissionsList: Permission[] = [
    {
      id: 'camera',
      name: '相机',
      description: '用于拍照和录制视频',
      status: 'granted',
      permission: PERMISSIONS.IOS.CAMERA,
      icon: '📷',
    },
    {
      id: 'photoLibrary',
      name: '相册',
      description: '用于访问和保存照片',
      status: 'granted',
      permission: PERMISSIONS.IOS.PHOTO_LIBRARY,
      icon: '🖼️',
    },
    {
      id: 'microphone',
      name: '麦克风',
      description: '用于录制语音备忘录',
      status: 'granted',
      permission: PERMISSIONS.IOS.MICROPHONE,
      icon: '🎤',
    },
    {
      id: 'location',
      name: '位置',
      description: '用于记录位置信息',
      status: 'granted',
      permission: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      icon: '📍',
    },
    {
      id: 'calendar',
      name: '日历',
      description: '用于同步日历事件',
      status: 'granted',
      permission: PERMISSIONS.IOS.CALENDARS,
      icon: '📅',
    },
    {
      id: 'contacts',
      name: '联系人',
      description: '用于关联联系人信息',
      status: 'granted',
      permission: PERMISSIONS.IOS.CONTACTS,
      icon: '👥',
    },
  ];

  // 加载权限状态
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const updatedPermissions = await Promise.all(
        permissionsList.map(async perm => {
          const status = await check(perm.permission);
          return {
            ...perm,
            status: mapPermissionStatus(status),
          };
        }),
      );
      setPermissions(updatedPermissions);
      logger.info('Permissions loaded', {count: updatedPermissions.length});
    } catch (error) {
      logger.error('Failed to load permissions', {error});
    } finally {
      setIsLoading(false);
    }
  };

  // 映射权限状态
  const mapPermissionStatus = (status: string): Permission['status'] => {
    switch (status) {
      case RESULTS.GRANTED:
        return 'granted';
      case RESULTS.DENIED:
        return 'denied';
      case RESULTS.BLOCKED:
        return 'blocked';
      case RESULTS.UNAVAILABLE:
        return 'unavailable';
      default:
        return 'denied';
    }
  };

  // 请求权限
  const handleRequestPermission = async (permission: Permission) => {
    try {
      const result = await request(permission.permission);
      const newStatus = mapPermissionStatus(result);

      setPermissions(prev =>
        prev.map(p =>
          p.id === permission.id ? {...p, status: newStatus} : p,
        ),
      );

      logger.info('Permission requested', {
        permission: permission.id,
        status: newStatus,
      });

      if (newStatus === 'granted') {
        Alert.alert('成功', `已授予${permission.name}权限`);
      } else if (newStatus === 'blocked') {
        Alert.alert(
          '权限被拒绝',
          `请在设置中手动启用${permission.name}权限`,
          [
            {text: '取消', onPress: () => {}},
            {text: '打开设置', onPress: () => {
              // TODO: 打开应用设置
              logger.info('Opening app settings');
            }},
          ],
        );
      }
    } catch (error) {
      logger.error('Failed to request permission', {error});
      Alert.alert('失败', '请求权限失败');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: Permission['status']): string => {
    switch (status) {
      case 'granted':
        return '#34C759';
      case 'denied':
        return '#FF9500';
      case 'blocked':
        return '#FF3B30';
      case 'unavailable':
        return '#999';
      default:
        return '#999';
    }
  };

  // 获取状态文本
  const getStatusText = (status: Permission['status']): string => {
    switch (status) {
      case 'granted':
        return '已授予';
      case 'denied':
        return '未授予';
      case 'blocked':
        return '已拒绝';
      case 'unavailable':
        return '不可用';
      default:
        return '未知';
    }
  };

  // 分组权限
  const permissionSections: PermissionSection[] = [
    {
      title: '媒体权限',
      data: permissions.filter(p => ['camera', 'photoLibrary', 'microphone'].includes(p.id)),
    },
    {
      title: '位置和日历',
      data: permissions.filter(p => ['location', 'calendar'].includes(p.id)),
    },
    {
      title: '联系人',
      data: permissions.filter(p => ['contacts'].includes(p.id)),
    },
  ];

  // 渲染权限项
  const renderPermissionItem = ({item}: {item: Permission}) => (
    <TouchableOpacity
      style={styles.permissionItem}
      onPress={() => handleRequestPermission(item)}
      testID={`permission_${item.id}`}
    >
      <View style={styles.permissionContent}>
        <Text style={styles.permissionIcon}>{item.icon}</Text>
        <View style={styles.permissionText}>
          <Text style={styles.permissionName}>{item.name}</Text>
          <Text style={styles.permissionDescription}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.statusContainer}>
        <Text
          style={[
            styles.statusText,
            {color: getStatusColor(item.status)},
          ]}
        >
          {getStatusText(item.status)}
        </Text>
        {item.status !== 'granted' && item.status !== 'unavailable' && (
          <Text style={styles.arrow}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // 渲染分组头
  const renderSectionHeader = ({section}: {section: PermissionSection}) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>应用权限</Text>
        <Text style={styles.subtitle}>管理应用所需的权限</Text>
      </View>

      <SectionList
        sections={permissionSections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderPermissionItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        testID="permissions_list"
      />

      {/* 提示信息 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 提示</Text>
        <Text style={styles.tipsText}>
          • 点击权限项可以请求或修改权限{'\n'}
          • 某些权限可能需要在系统设置中启用{'\n'}
          • 应用需要这些权限才能正常工作
        </Text>
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
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
  },
  tips: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    color: '#0066CC',
    lineHeight: 18,
  },
});

