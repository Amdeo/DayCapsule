import React, {useMemo} from 'react';
import {Text, useTheme} from 'react-native-paper';

interface HighlightedTextProps {
  text: string;
  query: string;
  variant?: 'bodySmall' | 'bodyMedium' | 'bodyLarge';
  numberOfLines?: number;
  style?: any;
}

/**
 * 高亮搜索关键词的文本组件
 * 用于在搜索结果中高亮显示匹配的关键词
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  query,
  variant = 'bodyMedium',
  numberOfLines,
  style,
}) => {
  const theme = useTheme();

  const textParts = useMemo(() => {
    if (!query.trim()) {
      return [{text, highlight: false}];
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const result: Array<{text: string; highlight: boolean}> = [];

    let lastIndex = 0;
    let index = lowerText.indexOf(lowerQuery);

    while (index !== -1) {
      // 添加非高亮部分
      if (index > lastIndex) {
        result.push({
          text: text.substring(lastIndex, index),
          highlight: false,
        });
      }

      // 添加高亮部分
      result.push({
        text: text.substring(index, index + query.length),
        highlight: true,
      });

      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }

    // 添加剩余部分
    if (lastIndex < text.length) {
      result.push({
        text: text.substring(lastIndex),
        highlight: false,
      });
    }

    return result.length > 0 ? result : [{text, highlight: false}];
  }, [text, query]);

  return (
    <Text variant={variant} numberOfLines={numberOfLines} style={style}>
      {textParts.map((part, index) => (
        <Text
          key={index}
          style={
            part.highlight
              ? {
                  backgroundColor: theme.colors.tertiary,
                  color: theme.colors.onTertiary,
                  fontWeight: 'bold' as const,
                }
              : undefined
          }>
          {part.text}
        </Text>
      ))}
    </Text>
  );
};
