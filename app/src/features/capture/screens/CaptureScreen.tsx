import React, {useState, useCallback, useEffect} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '@store/index';
import {logger} from '@services/telemetry/logger';
import {performanceMonitor} from '@services/telemetry/performance';
import {cameraService} from '@services/camera/cameraService';
import {locationService} from '@services/location/locationService';
import {weatherService} from '@services/weather/weatherService';
import {useAITags} from '../hooks/useAITags';
import {AITagSuggestions} from '../components/AITagSuggestions';

interface CaptureState {
  mode: 'photo' | 'text';
  photos: string[];
  text: string;
  tags: string[];
  mood: string;
  location: {latitude: number; longitude: number} | null;
  weather: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 拍照/文字快记主界面
 * 支持拍照、文字输入、标签、心情选择
 */
export const CaptureScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [state, setState] = useState<CaptureState>({
    mode: 'photo',
    photos: [],
    text: '',
    tags: [],
    mood: '',
    location: null,
    weather: null,
    isLoading: false,
    error: null,
  });

  const startTime = React.useRef<number>(Date.now());
  const {
    suggestedTags,
    isLoading: isAILoading,
    error: aiError,
    generateTags,
    toggleTag,
    selectAllTags,
    deselectAllTags,
    getSelectedTags,
    clearSuggestions,
  } = useAITags();

  // 初始化：获取位置和天气
  useEffect(() => {
    const initializeCapture = async () => {
      try {
        // 获取位置
        const location = await locationService.getCurrentLocation();
        if (location) {
          setState(prev => ({
            ...prev,
            location: {latitude: location.latitude, longitude: location.longitude},
          }));

          // 获取天气
          const weather = await weatherService.getWeatherByLocation(
            location.latitude,
            location.longitude,
          );
          if (weather) {
            setState(prev => ({...prev, weather: weather.condition}));
          }
        }
      } catch (error) {
        logger.error(`Failed to initialize capture: ${error}`);
      }
    };

    initializeCapture();
  }, []);

  // 切换模式
  const handleModeChange = useCallback((mode: 'photo' | 'text') => {
    setState(prev => ({...prev, mode}));
  }, []);

  // 拍照
  const handleTakePhoto = useCallback(async () => {
    try {
      setState(prev => ({...prev, isLoading: true, error: null}));
      const photo = await cameraService.takePhoto();

      if (photo) {
        if (state.photos.length >= 9) {
          setState(prev => ({
            ...prev,
            error: '最多只能添加 9 张照片',
            isLoading: false,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          photos: [...prev.photos, photo.uri],
          isLoading: false,
        }));
      } else {
        setState(prev => ({...prev, isLoading: false}));
      }
    } catch (error) {
      logger.error(`Failed to take photo: ${error}`);
      setState(prev => ({
        ...prev,
        error: '拍照失败，请重试',
        isLoading: false,
      }));
    }
  }, [state.photos.length]);

  // 从相册选择照片
  const handlePickPhoto = useCallback(async () => {
    try {
      setState(prev => ({...prev, isLoading: true, error: null}));
      const remainingSlots = 9 - state.photos.length;

      if (remainingSlots <= 0) {
        setState(prev => ({
          ...prev,
          error: '最多只能添加 9 张照片',
          isLoading: false,
        }));
        return;
      }

      const photos = await cameraService.pickMultiplePhotos(remainingSlots);

      if (photos) {
        setState(prev => ({
          ...prev,
          photos: [...prev.photos, ...photos.map(p => p.uri)],
          isLoading: false,
        }));
      } else {
        setState(prev => ({...prev, isLoading: false}));
      }
    } catch (error) {
      logger.error(`Failed to pick photos: ${error}`);
      setState(prev => ({
        ...prev,
        error: '选择照片失败，请重试',
        isLoading: false,
      }));
    }
  }, [state.photos.length]);

  // 移除照片
  const handleRemovePhoto = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  // 更新文字
  const handleTextChange = useCallback((text: string) => {
    setState(prev => ({...prev, text}));
  }, []);

  // 添加标签
  const handleAddTag = useCallback((tag: string) => {
    if (tag && !state.tags.includes(tag)) {
      setState(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  }, [state.tags]);

  // 移除标签
  const handleRemoveTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  }, []);

  // 选择心情
  const handleMoodSelect = useCallback((mood: string) => {
    setState(prev => ({...prev, mood}));
  }, []);

  // 生成 AI 标签建议
  const handleGenerateAITags = useCallback(async () => {
    if (state.photos.length === 0) {
      setState(prev => ({
        ...prev,
        error: '请先选择照片',
      }));
      return;
    }

    // 使用第一张照片生成标签
    await generateTags(state.photos[0]);
  }, [state.photos, generateTags]);

  // 应用 AI 标签
  const handleApplyAITags = useCallback(() => {
    const selectedTags = getSelectedTags();
    setState(prev => ({
      ...prev,
      tags: Array.from(new Set([...prev.tags, ...selectedTags])),
    }));
    clearSuggestions();
    logger.info('AI tags applied', {count: selectedTags.length});
  }, [getSelectedTags, clearSuggestions]);

  // 保存记录
  const handleSave = useCallback(async () => {
    try {
      performanceMonitor.startMeasure('capture_save');
      setState(prev => ({...prev, isLoading: true, error: null}));

      // 验证输入
      if (state.mode === 'photo' && state.photos.length === 0) {
        setState(prev => ({
          ...prev,
          error: '请至少选择一张照片',
          isLoading: false,
        }));
        return;
      }

      if (state.mode === 'text' && !state.text.trim()) {
        setState(prev => ({
          ...prev,
          error: '请输入文字内容',
          isLoading: false,
        }));
        return;
      }

      // 这里应该调用 Redux action 保存记录
      logger.info(`Saving ${state.mode} entry with ${state.tags.length} tags and mood: ${state.mood}`);

      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      performanceMonitor.endMeasure('capture_save');
      const duration = performanceMonitor.getMeasure('capture_save');
      logger.info(`Capture saved in ${duration}ms`);

      // 重置状态
      setState({
        mode: 'photo',
        photos: [],
        text: '',
        tags: [],
        mood: '',
        location: state.location,
        weather: state.weather,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      logger.error(`Failed to save entry: ${error}`);
      setState(prev => ({
        ...prev,
        error: '保存失败，请重试',
        isLoading: false,
      }));
    }
  }, [state]);

  // 取消
  const handleCancel = useCallback(() => {
    setState({
      mode: 'photo',
      photos: [],
      text: '',
      tags: [],
      mood: '',
      location: state.location,
      weather: state.weather,
      isLoading: false,
      error: null,
    });
  }, [state.location, state.weather]);

  return (
    <View style={styles.container} testID="capture-screen">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 模式选择 */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, state.mode === 'photo' && styles.modeButtonActive]}
            onPress={() => handleModeChange('photo')}
            testID="photo-mode-button">
            <Text style={styles.modeButtonText}>📷 拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, state.mode === 'text' && styles.modeButtonActive]}
            onPress={() => handleModeChange('text')}
            testID="text-mode-button">
            <Text style={styles.modeButtonText}>✍️ 文字</Text>
          </TouchableOpacity>
        </View>

        {/* 错误提示 */}
        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        {/* 加载指示器 */}
        {state.isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}

        {/* 照片模式 */}
        {state.mode === 'photo' && !state.isLoading && (
          <View style={styles.photoSection}>
            <View style={styles.photoGrid}>
              {state.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoItem}
                  onPress={() => handleRemovePhoto(index)}
                  testID={`photo-item-${index}`}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              ))}
              {state.photos.length < 9 && (
                <>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleTakePhoto}
                    testID="take-photo-button">
                    <Text style={styles.photoButtonText}>📷</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handlePickPhoto}
                    testID="pick-photo-button">
                    <Text style={styles.photoButtonText}>🖼️</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <Text style={styles.photoCount}>
              {state.photos.length}/9
            </Text>
          </View>
        )}

        {/* 文字模式 */}
        {state.mode === 'text' && !state.isLoading && (
          <View style={styles.textSection}>
            <Text style={styles.label}>记录内容</Text>
            {/* TextEditor 组件将在 T034 实现 */}
            <Text style={styles.placeholder}>文字编辑器组件（T034）</Text>
          </View>
        )}

        {/* 标签输入 */}
        <View style={styles.tagsSection}>
          <View style={styles.tagHeader}>
            <Text style={styles.label}>标签</Text>
            {state.mode === 'photo' && state.photos.length > 0 && (
              <TouchableOpacity
                style={styles.aiTagButton}
                onPress={handleGenerateAITags}
                disabled={isAILoading}
                testID="generate-ai-tags-button"
              >
                <Text style={styles.aiTagButtonText}>
                  {isAILoading ? '分析中...' : '🤖 AI 建议'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* TagInput 组件将在 T035 实现 */}
          <Text style={styles.placeholder}>标签输入组件（T035）</Text>

          {/* AI 标签建议 */}
          {suggestedTags.length > 0 && (
            <View style={styles.aiTagsContainer}>
              <AITagSuggestions
                tags={suggestedTags}
                isLoading={isAILoading}
                error={aiError}
                onTagToggle={toggleTag}
                onSelectAll={selectAllTags}
                onDeselectAll={deselectAllTags}
                testID="ai_tag_suggestions"
              />
              <TouchableOpacity
                style={styles.applyAITagsButton}
                onPress={handleApplyAITags}
                testID="apply-ai-tags-button"
              >
                <Text style={styles.applyAITagsButtonText}>应用选中的标签</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 心情选择 */}
        <View style={styles.moodSection}>
          <Text style={styles.label}>心情</Text>
          {/* MoodPicker 组件将在 T036 实现 */}
          <Text style={styles.placeholder}>心情选择器组件（T036）</Text>
        </View>

        {/* 位置和天气 */}
        {state.location && (
          <View style={styles.metaSection}>
            <Text style={styles.metaText}>
              📍 {state.location.latitude.toFixed(4)}, {state.location.longitude.toFixed(4)}
            </Text>
            {state.weather && <Text style={styles.metaText}>🌤️ {state.weather}</Text>}
          </View>
        )}
      </ScrollView>

      {/* 操作按钮 */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          testID="cancel-button">
          <Text style={styles.buttonText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={state.isLoading}
          testID="save-button">
          <Text style={styles.buttonText}>保存</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  photoSection: {
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    fontSize: 24,
    color: '#fff',
  },
  photoButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 32,
  },
  photoCount: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  textSection: {
    marginBottom: 16,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTagButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiTagButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  aiTagsContainer: {
    marginTop: 12,
  },
  applyAITagsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  applyAITagsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  moodSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  placeholder: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    color: '#999',
    fontSize: 14,
  },
  metaSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

