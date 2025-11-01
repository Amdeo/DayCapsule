import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import {logger} from '@services/telemetry/logger';

export type ThemeType = 'light' | 'dark' | 'auto';

interface ThemeSelectorProps {
  onThemeChange?: (theme: ThemeType) => void;
  testID?: string;
}

interface ThemeOption {
  id: ThemeType;
  label: string;
  description: string;
  icon: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  onThemeChange,
  testID,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('light');
  const [isLoading, setIsLoading] = useState(false);

  // 主题选项
  const themeOptions: ThemeOption[] = [
    {
      id: 'light',
      label: '浅色',
      description: '明亮的浅色主题',
      icon: '☀️',
    },
    {
      id: 'dark',
      label: '深色',
      description: '护眼的深色主题',
      icon: '🌙',
    },
    {
      id: 'auto',
      label: '自动',
      description: '根据系统设置自动切换',
      icon: '🔄',
    },
  ];

  // 加载保存的主题
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // TODO: 从存储中加载主题设置
      logger.info('Theme loaded', {theme: selectedTheme});
    } catch (error) {
      logger.error('Failed to load theme', {error});
    }
  };

  // 处理主题切换
  const handleThemeChange = async (theme: ThemeType) => {
    try {
      setIsLoading(true);
      setSelectedTheme(theme);

      // TODO: 保存主题设置到存储
      logger.info('Theme changed', {theme});

      // 调用回调函数
      onThemeChange?.(theme);

      Alert.alert('成功', `已切换到${themeOptions.find(t => t.id === theme)?.label}主题`);
    } catch (error) {
      logger.error('Failed to change theme', {error});
      Alert.alert('失败', '切换主题失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>选择主题</Text>
        <Text style={styles.subtitle}>选择您喜欢的应用主题</Text>
      </View>

      <View style={styles.themeGrid}>
        {themeOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.themeCard,
              selectedTheme === option.id && styles.themeCardSelected,
            ]}
            onPress={() => handleThemeChange(option.id)}
            disabled={isLoading}
            testID={`theme_${option.id}`}
          >
            {/* 主题预览 */}
            <View
              style={[
                styles.themePreview,
                option.id === 'light' && styles.previewLight,
                option.id === 'dark' && styles.previewDark,
                option.id === 'auto' && styles.previewAuto,
              ]}
            >
              <Text style={styles.themeIcon}>{option.icon}</Text>
            </View>

            {/* 主题信息 */}
            <Text style={styles.themeLabel}>{option.label}</Text>
            <Text style={styles.themeDescription}>{option.description}</Text>

            {/* 选中指示器 */}
            {selectedTheme === option.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 主题预览 */}
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>预览</Text>

        <View
          style={[
            styles.previewBox,
            selectedTheme === 'light' && styles.previewBoxLight,
            selectedTheme === 'dark' && styles.previewBoxDark,
          ]}
        >
          <Text
            style={[
              styles.previewText,
              selectedTheme === 'dark' && styles.previewTextDark,
            ]}
          >
            这是应用在当前主题下的样子
          </Text>

          <TouchableOpacity
            style={[
              styles.previewButton,
              selectedTheme === 'dark' && styles.previewButtonDark,
            ]}
          >
            <Text
              style={[
                styles.previewButtonText,
                selectedTheme === 'dark' && styles.previewButtonTextDark,
              ]}
            >
              示例按钮
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 提示信息 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 提示</Text>
        <Text style={styles.tipsText}>
          • 浅色主题适合在明亮环境下使用{'\n'}
          • 深色主题可以保护眼睛，节省电池{'\n'}
          • 自动主题会根据系统设置自动切换
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  themeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  themeCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  themePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewLight: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewDark: {
    backgroundColor: '#1a1a1a',
  },
  previewAuto: {
    backgroundColor: 'linear-gradient(135deg, #fff 50%, #1a1a1a 50%)',
  },
  themeIcon: {
    fontSize: 32,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewBox: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  previewBoxLight: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewBoxDark: {
    backgroundColor: '#1a1a1a',
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewTextDark: {
    color: '#fff',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewButtonDark: {
    backgroundColor: '#0A84FF',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewButtonTextDark: {
    color: '#fff',
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

