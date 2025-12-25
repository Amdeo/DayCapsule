import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AITag } from '@services/ai/imageRecognition';
import { useAITags } from '../hooks/useAITags';

interface AITagSuggestionsProps {
  imageUri?: string;
  entryId?: string;
  visible: boolean;
  onClose: () => void;
  onTagApplied?: (tagName: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const AITagSuggestions: React.FC<AITagSuggestionsProps> = ({
  imageUri,
  entryId,
  visible,
  onClose,
  onTagApplied,
}) => {
  const theme = useTheme();
  const {
    isAnalyzing,
    suggestions,
    error,
    analyzeImage,
    clearSuggestions,
    applyTag,
    applyAllTags,
    dismissTag,
  } = useAITags();

  // 动画值
  const slideAnim = React.useRef(new Animated.Value(screenWidth)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // 显示动画
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 自动分析图像（如果提供了图像和记录ID）
      if (imageUri && entryId) {
        analyzeImage(imageUri, entryId);
      }
    } else {
      // 隐藏动画
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, imageUri, entryId, analyzeImage]);

  const handleClose = () => {
    clearSuggestions();
    onClose();
  };

  const handleApplyTag = (tagName: string) => {
    if (entryId) {
      applyTag(tagName, entryId);
      onTagApplied?.(tagName);
    }
  };

  const handleApplyAll = () => {
    if (entryId) {
      applyAllTags(entryId);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: `rgba(0, 0, 0, ${opacityAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
          })}`,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* 头部 */}
        <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
          <View style={styles.dragIndicator} />
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            AI 标签建议
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* 内容 */}
        <View style={styles.content}>
          {isAnalyzing && (
            <View style={styles.loadingContainer}>
              <Icon name="auto-awesome" size={32} color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                AI 正在分析图像...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={32} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => imageUri && entryId && analyzeImage(imageUri, entryId)}
              >
                <Text style={[styles.retryText, { color: theme.colors.onPrimary }]}>
                  重试
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Text style={[styles.suggestionsTitle, { color: theme.colors.onSurface }]}>
                  建议标签 ({suggestions.length})
                </Text>
                <TouchableOpacity onPress={handleApplyAll} style={styles.applyAllButton}>
                  <Text style={[styles.applyAllText, { color: theme.colors.primary }]}>
                    全部应用
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScrollView}
                contentContainerStyle={styles.tagsContent}
              >
                {suggestions.map((tag, index) => (
                  <View key={`${tag.name}-${index}`} style={styles.tagContainer}>
                    <Chip
                      mode="outlined"
                      selected={false}
                      onPress={() => handleApplyTag(tag.name)}
                      onClose={() => dismissTag(tag.name)}
                      style={[
                        styles.tagChip,
                        {
                          borderColor: theme.colors.primary,
                          backgroundColor: theme.colors.primaryContainer,
                        },
                      ]}
                      textStyle={{ color: theme.colors.primary }}
                    >
                      {tag.name} ({Math.round(tag.confidence * 100)}%)
                    </Chip>
                  </View>
                ))}
              </ScrollView>

              <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                点击标签进行应用，点击 × 忽略建议
              </Text>
            </View>
          )}

          {suggestions.length === 0 && !isAnalyzing && !error && (
            <View style={styles.emptyContainer}>
              <Icon name="lightbulb-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                暂无标签建议
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                拍摄或选择一张图像，AI 将自动生成标签建议
              </Text>
              {imageUri && entryId && (
                <TouchableOpacity
                  style={[styles.analyzeButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => analyzeImage(imageUri, entryId)}
                >
                  <Icon name="auto-awesome" size={20} color={theme.colors.onPrimary} />
                  <Text style={[styles.analyzeText, { color: theme.colors.onPrimary }]}>
                    开始分析
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '85%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dragIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsContainer: {
    flex: 1,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  applyAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagsScrollView: {
    maxHeight: 100,
  },
  tagsContent: {
    paddingVertical: 8,
  },
  tagContainer: {
    marginRight: 8,
    marginBottom: 8,
  },
  tagChip: {
    height: 36,
  },
  helperText: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  analyzeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});
