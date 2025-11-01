import React, {useCallback, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {logger} from '@services/telemetry/logger';

export interface TextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  onAutoSave?: (text: string) => void;
  autoSaveInterval?: number;
  showCharCount?: boolean;
  showFormatting?: boolean;
  testID?: string;
}

/**
 * 文字编辑器组件
 * 支持富文本、自动保存、字数统计
 */
export const TextEditor: React.FC<TextEditorProps> = ({
  value,
  onChange,
  placeholder = '输入你的想法...',
  maxLength = 5000,
  minLength = 0,
  onAutoSave,
  autoSaveInterval = 3000,
  showCharCount = true,
  showFormatting = true,
  testID = 'text-editor',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedText, setLastSavedText] = useState(value);

  // 自动保存逻辑
  useEffect(() => {
    if (value !== lastSavedText && onAutoSave) {
      // 清除之前的计时器
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // 设置新的计时器
      const timer = setTimeout(() => {
        onAutoSave(value);
        setLastSavedText(value);
        logger.info(`Text auto-saved: ${value.length} characters`);
      }, autoSaveInterval);

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [value, lastSavedText, onAutoSave, autoSaveInterval]);

  const handleTextChange = useCallback(
    (text: string) => {
      if (text.length <= maxLength) {
        onChange(text);
      }
    },
    [onChange, maxLength],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 添加格式化文本
  const addFormatting = useCallback(
    (prefix: string, suffix: string = '') => {
      const newText = prefix + value + suffix;
      if (newText.length <= maxLength) {
        onChange(newText);
      }
    },
    [value, onChange, maxLength],
  );

  const handleBold = useCallback(() => {
    addFormatting('**', '**');
  }, [addFormatting]);

  const handleItalic = useCallback(() => {
    addFormatting('*', '*');
  }, [addFormatting]);

  const handleUnderline = useCallback(() => {
    addFormatting('__', '__');
  }, [addFormatting]);

  const handleStrikethrough = useCallback(() => {
    addFormatting('~~', '~~');
  }, [addFormatting]);

  const handleCodeBlock = useCallback(() => {
    addFormatting('```\n', '\n```');
  }, [addFormatting]);

  const handleQuote = useCallback(() => {
    addFormatting('> ', '');
  }, [addFormatting]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleUndo = useCallback(() => {
    // 这是一个占位符，实际的撤销功能需要维护历史记录
    logger.info('Undo action (placeholder)');
  }, []);

  const charCount = value.length;
  const isValid = charCount >= minLength && charCount <= maxLength;
  const isFull = charCount === maxLength;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      testID={testID}>
      {/* 文字输入框 */}
      <View style={[styles.editorContainer, isFocused && styles.editorContainerFocused]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID="text-input"
        />
      </View>

      {/* 字数统计 */}
      {showCharCount && (
        <View style={styles.charCountContainer}>
          <Text
            style={[
              styles.charCountText,
              !isValid && styles.charCountTextError,
              isFull && styles.charCountTextWarning,
            ]}>
            {charCount}/{maxLength}
          </Text>
          {!isValid && (
            <Text style={styles.charCountError}>
              {charCount < minLength
                ? `至少需要 ${minLength} 个字符`
                : '超过最大字符限制'}
            </Text>
          )}
        </View>
      )}

      {/* 格式化工具栏 */}
      {showFormatting && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarContainer}
          testID="formatting-toolbar">
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleBold}
              testID="bold-button">
              <Text style={styles.toolButtonText}>B</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleItalic}
              testID="italic-button">
              <Text style={[styles.toolButtonText, {fontStyle: 'italic'}]}>I</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleUnderline}
              testID="underline-button">
              <Text style={[styles.toolButtonText, {textDecorationLine: 'underline'}]}>U</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleStrikethrough}
              testID="strikethrough-button">
              <Text style={[styles.toolButtonText, {textDecorationLine: 'line-through'}]}>S</Text>
            </TouchableOpacity>

            <View style={styles.toolDivider} />

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleCodeBlock}
              testID="code-button">
              <Text style={styles.toolButtonText}>{'<>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleQuote}
              testID="quote-button">
              <Text style={styles.toolButtonText}>❝</Text>
            </TouchableOpacity>

            <View style={styles.toolDivider} />

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleUndo}
              testID="undo-button">
              <Text style={styles.toolButtonText}>↶</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleClear}
              testID="clear-button">
              <Text style={styles.toolButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 提示信息 */}
      {value.length > 0 && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            {value.length > 100 ? '✓ 内容充分' : '继续输入以获得更好的记录效果'}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  editorContainerFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  textInput: {
    padding: 12,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 300,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  charCountText: {
    fontSize: 12,
    color: '#666',
  },
  charCountTextError: {
    color: '#c62828',
  },
  charCountTextWarning: {
    color: '#f57c00',
  },
  charCountError: {
    fontSize: 12,
    color: '#c62828',
  },
  toolbarContainer: {
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toolDivider: {
    width: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  tipContainer: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
  },
});

