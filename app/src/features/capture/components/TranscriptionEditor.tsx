/**
 * 转录编辑组件
 *
 * 允许用户编辑自动生成的转录文本，支持搜索功能
 */

import React, {useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  TextInput,
  Button,
  Dialog,
  Portal,
  Text,
  useTheme,
  Divider,
  IconButton,
} from 'react-native-paper';

interface TranscriptionEditorProps {
  visible: boolean;
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  testID?: string;
  enableSearch?: boolean;
}

export const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  visible,
  initialText,
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
  testID,
  enableSearch = true,
}) => {
  const theme = useTheme();
  const [text, setText] = useState(initialText);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(initialText);
      setHasChanges(false);
      setSearchQuery('');
      setSearchIndex(0);
      setShowSearch(false);
    }
  }, [visible, initialText]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    setHasChanges(newText !== initialText);
  };

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setText(initialText);
    setHasChanges(false);
    onCancel();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setHasChanges(false);
    }
  };

  // 搜索功能
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const query = searchQuery.toLowerCase();
    const matches: Array<{start: number; end: number}> = [];
    let startIndex = 0;
    while (true) {
      const index = text.toLowerCase().indexOf(query, startIndex);
      if (index === -1) {
        break;
      }
      matches.push({start: index, end: index + query.length});
      startIndex = index + 1;
    }
    return matches;
  }, [text, searchQuery]);

  const handleSearchNext = () => {
    if (searchMatches.length === 0) {
      return;
    }
    setSearchIndex(prev => (prev + 1) % searchMatches.length);
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) {
      return;
    }
    setSearchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  const characterCount = text.length;
  const maxCharacters = 5000;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleCancel} testID={testID} style={styles.dialog}>
        <Dialog.Title>编辑转录文本</Dialog.Title>

        {/* 搜索栏 */}
        {enableSearch && showSearch && (
          <View style={styles.searchBar}>
            <TextInput
              mode="outlined"
              placeholder="搜索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              testID={`${testID}-search-input`}
              dense
            />
            <View style={styles.searchControls}>
              <IconButton
                icon="chevron-up"
                size={20}
                onPress={handleSearchPrev}
                disabled={searchMatches.length === 0}
                testID={`${testID}-search-prev`}
              />
              <Text style={styles.searchCount}>
                {searchMatches.length > 0 ? `${searchIndex + 1}/${searchMatches.length}` : '0/0'}
              </Text>
              <IconButton
                icon="chevron-down"
                size={20}
                onPress={handleSearchNext}
                disabled={searchMatches.length === 0}
                testID={`${testID}-search-next`}
              />
              <IconButton
                icon="close"
                size={20}
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                testID={`${testID}-search-close`}
              />
            </View>
          </View>
        )}

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            <View style={styles.content}>
              <TextInput
                mode="outlined"
                label="转录文本"
                value={text}
                onChangeText={handleTextChange}
                multiline
                numberOfLines={8}
                maxLength={maxCharacters}
                editable={!isLoading}
                testID={`${testID}-input`}
                style={styles.textInput}
              />

              <View style={styles.characterCount}>
                <Text
                  style={[styles.characterCountText, isOverLimit && {color: theme.colors.error}]}>
                  {characterCount} / {maxCharacters}
                </Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.infoSection}>
                <Text variant="labelSmall" style={styles.infoLabel}>
                  提示：
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • 您可以编辑和改进自动生成的转录文本
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • 最多支持 {maxCharacters} 个字符
                </Text>
                <Text variant="bodySmall" style={styles.infoText}>
                  • 点击"保存"按钮保存更改
                </Text>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.actions}>
          {onDelete && (
            <Button
              mode="text"
              onPress={handleDelete}
              disabled={isLoading}
              testID={`${testID}-delete-button`}
              textColor={theme.colors.error}>
              删除
            </Button>
          )}
          {enableSearch && (
            <Button
              mode="text"
              onPress={() => setShowSearch(!showSearch)}
              disabled={isLoading}
              testID={`${testID}-search-button`}>
              {showSearch ? '隐藏搜索' : '搜索'}
            </Button>
          )}
          <View style={styles.spacer} />
          <Button
            mode="text"
            onPress={handleCancel}
            disabled={isLoading}
            testID={`${testID}-cancel-button`}>
            取消
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={!hasChanges || isLoading || isOverLimit}
            loading={isLoading}
            testID={`${testID}-save-button`}>
            保存
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    marginBottom: 8,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  characterCountText: {
    fontSize: 12,
  },
  divider: {
    marginVertical: 12,
  },
  infoSection: {
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    marginBottom: 4,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    marginBottom: 8,
  },
  searchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  searchCount: {
    fontSize: 12,
    marginHorizontal: 4,
  },
});
