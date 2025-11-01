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

export type FontSize = 'small' | 'medium' | 'large';

interface FontSizeSelectorProps {
  onFontSizeChange?: (fontSize: FontSize) => void;
  testID?: string;
}

interface FontSizeOption {
  id: FontSize;
  label: string;
  description: string;
  baseSize: number;
  icon: string;
}

export const FontSizeSelector: React.FC<FontSizeSelectorProps> = ({
  onFontSizeChange,
  testID,
}) => {
  const [selectedFontSize, setSelectedFontSize] = useState<FontSize>('medium');
  const [isLoading, setIsLoading] = useState(false);

  // 字体大小选项
  const fontSizeOptions: FontSizeOption[] = [
    {
      id: 'small',
      label: '小',
      description: '紧凑的字体大小',
      baseSize: 14,
      icon: 'A',
    },
    {
      id: 'medium',
      label: '中',
      description: '标准的字体大小',
      baseSize: 16,
      icon: 'A',
    },
    {
      id: 'large',
      label: '大',
      description: '放大的字体大小',
      baseSize: 18,
      icon: 'A',
    },
  ];

  // 加载保存的字体大小
  useEffect(() => {
    loadFontSize();
  }, []);

  const loadFontSize = async () => {
    try {
      // TODO: 从存储中加载字体大小设置
      logger.info('Font size loaded', {fontSize: selectedFontSize});
    } catch (error) {
      logger.error('Failed to load font size', {error});
    }
  };

  // 处理字体大小切换
  const handleFontSizeChange = async (fontSize: FontSize) => {
    try {
      setIsLoading(true);
      setSelectedFontSize(fontSize);

      // TODO: 保存字体大小设置到存储
      logger.info('Font size changed', {fontSize});

      // 调用回调函数
      onFontSizeChange?.(fontSize);

      Alert.alert('成功', `已切换到${fontSizeOptions.find(f => f.id === fontSize)?.label}字体`);
    } catch (error) {
      logger.error('Failed to change font size', {error});
      Alert.alert('失败', '切换字体大小失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取字体大小倍数
  const getFontSizeMultiplier = (fontSize: FontSize): number => {
    switch (fontSize) {
      case 'small':
        return 0.9;
      case 'medium':
        return 1;
      case 'large':
        return 1.2;
      default:
        return 1;
    }
  };

  return (
    <ScrollView style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>字体大小</Text>
        <Text style={styles.subtitle}>调整应用中的文字大小</Text>
      </View>

      {/* 字体大小选项 */}
      <View style={styles.optionsContainer}>
        {fontSizeOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              selectedFontSize === option.id && styles.optionButtonSelected,
            ]}
            onPress={() => handleFontSizeChange(option.id)}
            disabled={isLoading}
            testID={`fontsize_${option.id}`}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionIcon,
                  {fontSize: option.baseSize * 1.5},
                ]}
              >
                {option.icon}
              </Text>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </View>

            {selectedFontSize === option.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 预览部分 */}
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>预览</Text>

        <View style={styles.previewBox}>
          {/* 标题预览 */}
          <Text
            style={[
              styles.previewHeading,
              {
                fontSize: 24 * getFontSizeMultiplier(selectedFontSize),
              },
            ]}
          >
            这是标题
          </Text>

          {/* 正文预览 */}
          <Text
            style={[
              styles.previewBody,
              {
                fontSize: 14 * getFontSizeMultiplier(selectedFontSize),
              },
            ]}
          >
            这是应用中的正文内容。您可以看到当前选择的字体大小如何影响文本的显示。
          </Text>

          {/* 小文本预览 */}
          <Text
            style={[
              styles.previewSmall,
              {
                fontSize: 12 * getFontSizeMultiplier(selectedFontSize),
              },
            ]}
          >
            这是较小的辅助文本
          </Text>
        </View>
      </View>

      {/* 字体大小对比 */}
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonTitle}>字体大小对比</Text>

        <View style={styles.comparisonGrid}>
          {fontSizeOptions.map(option => (
            <View key={option.id} style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>{option.label}</Text>
              <Text
                style={[
                  styles.comparisonText,
                  {fontSize: option.baseSize},
                ]}
              >
                示例文本
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 提示信息 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 提示</Text>
        <Text style={styles.tipsText}>
          • 小字体适合屏幕空间有限的情况{'\n'}
          • 大字体更容易阅读，适合长时间使用{'\n'}
          • 中字体是推荐的标准大小
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
  optionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#999',
  },
  checkmark: {
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
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  previewHeading: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  previewBody: {
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  previewSmall: {
    color: '#999',
  },
  comparisonSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  comparisonText: {
    fontWeight: '600',
    color: '#333',
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

