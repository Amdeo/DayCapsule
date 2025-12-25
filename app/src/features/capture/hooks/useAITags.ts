import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showMessage } from 'react-native-flash-message';
import imageRecognitionService, { ImageRecognitionResult, AITag } from '@services/ai/imageRecognition';
import { updateEntry } from '@store/slices/entriesSlice';

interface UseAITagsReturn {
  isAnalyzing: boolean;
  suggestions: AITag[];
  error: string | null;
  analyzeImage: (imageUri: string, entryId: string) => Promise<void>;
  clearSuggestions: () => void;
  applyTag: (tagName: string, entryId: string) => void;
  applyAllTags: (entryId: string) => void;
  dismissTag: (tagName: string) => void;
}

export const useAITags = (): UseAITagsReturn => {
  const dispatch = useDispatch();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AITag[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * 分析图像并生成标签建议
   */
  const analyzeImage = useCallback(async (imageUri: string, entryId: string) => {
    if (!imageUri || !entryId) {
      setError('图像路径和记录ID不能为空');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSuggestions([]);

    try {
      // 检查服务是否可用
      if (!imageRecognitionService.isAvailable()) {
        await imageRecognitionService.initialize();
      }

      // 识别图像
      const result: ImageRecognitionResult = await imageRecognitionService.recognizeImage(imageUri);
      
      // 过滤低置信度的标签
      const filteredSuggestions = result.labels.filter(
        tag => tag.confidence >= 0.6 // 只显示置信度 >= 60% 的标签
      );

      setSuggestions(filteredSuggestions);

      if (filteredSuggestions.length === 0) {
        setError('未能识别出有意义的标签');
      } else {
        showMessage({
          message: 'AI标签建议已生成',
          description: `识别出 ${filteredSuggestions.length} 个标签建议`,
          type: 'success',
          duration: 2000,
        });
      }

      console.log('AI标签分析完成:', {
        processingTime: result.processingTime,
        suggestionsCount: filteredSuggestions.length,
        topSuggestion: filteredSuggestions[0]?.name,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '图像分析失败';
      setError(errorMessage);
      showMessage({
        message: 'AI标签分析失败',
        description: errorMessage,
        type: 'danger',
        duration: 3000,
      });
      console.error('AI标签分析错误:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 清除所有建议
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  /**
   * 应用单个标签到记录
   */
  const applyTag = useCallback((tagName: string, entryId: string) => {
    if (!tagName || !entryId) return;

    try {
      // 在实际应用中，这里会更新记录的标签
      dispatch(updateEntry({
        id: entryId,
        updates: {
          aiTags: [...(suggestions.find(s => s.name === tagName) ? [tagName] : [])]
        }
      }));

      // 从建议列表中移除已应用的标签
      setSuggestions(prev => prev.filter(tag => tag.name !== tagName));

      showMessage({
        message: '标签已应用',
        description: `已添加标签 "${tagName}"`,
        type: 'success',
        duration: 1500,
      });
    } catch (err) {
      showMessage({
        message: '应用标签失败',
        description: err instanceof Error ? err.message : '未知错误',
        type: 'danger',
        duration: 3000,
      });
    }
  }, [dispatch, suggestions]);

  /**
   * 应用所有标签到记录
   */
  const applyAllTags = useCallback((entryId: string) => {
    if (!entryId || suggestions.length === 0) return;

    try {
      const tagNames = suggestions.map(tag => tag.name);
      
      dispatch(updateEntry({
        id: entryId,
        updates: {
          aiTags: tagNames
        }
      }));

      clearSuggestions();

      showMessage({
        message: '所有标签已应用',
        description: `已添加 ${tagNames.length} 个标签`,
        type: 'success',
        duration: 2000,
      });
    } catch (err) {
      showMessage({
        message: '应用标签失败',
        description: err instanceof Error ? err.message : '未知错误',
        type: 'danger',
        duration: 3000,
      });
    }
  }, [dispatch, suggestions, clearSuggestions]);

  /**
   * 忽略标签建议
   */
  const dismissTag = useCallback((tagName: string) => {
    setSuggestions(prev => prev.filter(tag => tag.name !== tagName));
    
    showMessage({
      message: '已忽略标签建议',
      description: `"${tagName}" 标签已被移除`,
      type: 'info',
      duration: 1500,
    });
  }, []);

  return {
    isAnalyzing,
    suggestions,
    error,
    analyzeImage,
    clearSuggestions,
    applyTag,
    applyAllTags,
    dismissTag,
  };
};

// AI标签建议相关工具函数
export const filterTagsByConfidence = (tags: AITag[], minConfidence: number = 0.6): AITag[] => {
  return tags.filter(tag => tag.confidence >= minConfidence);
};

export const sortTagsByConfidence = (tags: AITag[]): AITag[] => {
  return [...tags].sort((a, b) => b.confidence - a.confidence);
};

export const deduplicateTags = (tags: AITag[]): AITag[] => {
  const seen = new Set<string>();
  return tags.filter(tag => {
    if (seen.has(tag.name)) {
      return false;
    }
    seen.add(tag.name);
    return true;
  });
};

export const getTopTags = (tags: AITag[], count: number = 3): AITag[] => {
  return sortTagsByConfidence(deduplicateTags(tags)).slice(0, count);
};

// AI标签分类映射
export const TAG_CATEGORIES = {
  饮食: ['食物', '美食', '餐厅', '咖啡', '甜品'],
  风景: ['风景', '自然', '山水', '日落', '日出'],
  人物: ['人物', '人像', '朋友', '家人', '同事'],
  动物: ['动物', '宠物', '猫', '狗', '鸟类'],
  活动: ['运动', '旅行', '工作', '学习', '娱乐'],
  建筑: ['建筑', '城市', '街道', '室内', '装饰'],
  情感: ['快乐', '兴奋', '平静', '思考', '感动'],
} as const;

export const categorizeTag = (tagName: string): string | null => {
  for (const [category, keywords] of Object.entries(TAG_CATEGORIES)) {
    if (keywords.some(keyword => tagName.includes(keyword))) {
      return category;
    }
  }
  return null;
};

// 标签置信度评估
export const evaluateTagQuality = (tag: AITag): {
  isHighQuality: boolean;
  category: string | null;
  suggestions: string[];
} => {
  const isHighQuality = tag.confidence >= 0.8;
  const category = categorizeTag(tag.name);
  
  const suggestions = [];
  if (tag.confidence < 0.6) {
    suggestions.push('置信度较低，建议手动确认');
  }
  if (!category) {
    suggestions.push('标签分类不明确');
  }
  if (tag.name.length > 10) {
    suggestions.push('标签名称过长');
  }

  return {
    isHighQuality,
    category,
    suggestions,
  };
};
