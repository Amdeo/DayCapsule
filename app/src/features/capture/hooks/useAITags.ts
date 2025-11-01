import {useState, useCallback, useRef} from 'react';
import {imageRecognitionService} from '@services/ai/imageRecognition';
import {logger} from '@services/telemetry/logger';

export interface AITag {
  name: string;
  confidence: number;
  isSelected: boolean;
}

export interface UseAITagsReturn {
  suggestedTags: AITag[];
  isLoading: boolean;
  error: string | null;
  generateTags: (imagePath: string) => Promise<void>;
  toggleTag: (tagName: string) => void;
  selectAllTags: () => void;
  deselectAllTags: () => void;
  getSelectedTags: () => string[];
  clearSuggestions: () => void;
}

export const useAITags = (): UseAITagsReturn => {
  const [suggestedTags, setSuggestedTags] = useState<AITag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 生成 AI 标签建议
   */
  const generateTags = useCallback(async (imagePath: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      logger.info('Generating AI tags', {imagePath});

      // 获取标签建议
      const tags = await imageRecognitionService.getTagSuggestions(imagePath, 5);

      // 检查是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        logger.info('AI tag generation cancelled');
        return;
      }

      // 获取完整的识别结果以获取置信度
      const result = await imageRecognitionService.recognizeImage(imagePath, {
        maxTags: 5,
        minConfidence: 0.6,
      });

      // 转换为 AITag 格式
      const aiTags: AITag[] = result.tags.map(tag => ({
        name: tag.name,
        confidence: tag.confidence,
        isSelected: true, // 默认选中
      }));

      setSuggestedTags(aiTags);

      logger.info('AI tags generated successfully', {
        imagePath,
        tagCount: aiTags.length,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || '生成标签失败';
        setError(errorMessage);
        logger.error('Failed to generate AI tags', {error: err, imagePath});
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 切换标签选择
   */
  const toggleTag = useCallback((tagName: string) => {
    setSuggestedTags(prevTags =>
      prevTags.map(tag =>
        tag.name === tagName ? {...tag, isSelected: !tag.isSelected} : tag,
      ),
    );
    logger.info('AI tag toggled', {tagName});
  }, []);

  /**
   * 全选所有标签
   */
  const selectAllTags = useCallback(() => {
    setSuggestedTags(prevTags =>
      prevTags.map(tag => ({...tag, isSelected: true})),
    );
    logger.info('All AI tags selected');
  }, []);

  /**
   * 取消选择所有标签
   */
  const deselectAllTags = useCallback(() => {
    setSuggestedTags(prevTags =>
      prevTags.map(tag => ({...tag, isSelected: false})),
    );
    logger.info('All AI tags deselected');
  }, []);

  /**
   * 获取已选择的标签
   */
  const getSelectedTags = useCallback((): string[] => {
    return suggestedTags
      .filter(tag => tag.isSelected)
      .map(tag => tag.name);
  }, [suggestedTags]);

  /**
   * 清除建议
   */
  const clearSuggestions = useCallback(() => {
    setSuggestedTags([]);
    setError(null);
    logger.info('AI tag suggestions cleared');
  }, []);

  // 清理
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    suggestedTags,
    isLoading,
    error,
    generateTags,
    toggleTag,
    selectAllTags,
    deselectAllTags,
    getSelectedTags,
    clearSuggestions,
  };
};

