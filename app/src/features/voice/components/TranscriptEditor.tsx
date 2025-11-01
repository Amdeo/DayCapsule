import React, {useState} from 'react';
import {View, StyleSheet, TextInput, ScrollView} from 'react-native';
import {Button, Text, IconButton} from 'react-native-paper';

interface TranscriptEditorProps {
  value: string;
  onChange: (text: string) => void;
  onSave?: (text: string) => void;
  maxLength?: number;
  testID?: string;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  value,
  onChange,
  onSave,
  maxLength = 5000,
  testID,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleClear = () => {
    onChange('');
  };

  const handleCopy = () => {
    // 复制到剪贴板
    // 需要使用 react-native-clipboard 或类似库
  };

  const handleBold = () => {
    if (selectedText) {
      const newText = value.replace(selectedText, `**${selectedText}**`);
      onChange(newText);
    }
  };

  const handleItalic = () => {
    if (selectedText) {
      const newText = value.replace(selectedText, `*${selectedText}*`);
      onChange(newText);
    }
  };

  const handleUnderline = () => {
    if (selectedText) {
      const newText = value.replace(selectedText, `__${selectedText}__`);
      onChange(newText);
    }
  };

  const handleStrikethrough = () => {
    if (selectedText) {
      const newText = value.replace(selectedText, `~~${selectedText}~~`);
      onChange(newText);
    }
  };

  const handleUndo = () => {
    // 实现撤销功能
  };

  const handleRedo = () => {
    // 实现重做功能
  };

  const handleSave = () => {
    if (onSave) {
      onSave(value);
    }
    setIsEditing(false);
  };

  const characterCount = value.length;
  const remainingCharacters = maxLength - characterCount;

  return (
    <View style={styles.container} testID={testID || 'transcript_editor'}>
      {/* 编辑器 */}
      <View style={styles.editorContainer}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          placeholder="编辑转写文本..."
          placeholderTextColor="#999"
          multiline
          maxLength={maxLength}
          editable={isEditing}
          onSelectionChange={event => {
            const {start, end} = event.nativeEvent.selection;
            if (start !== end) {
              setSelectedText(value.substring(start, end));
            }
          }}
        />
      </View>

      {/* 字数统计 */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {characterCount} / {maxLength}
        </Text>
        {remainingCharacters < 100 && (
          <Text style={styles.warningText}>
            还可输入 {remainingCharacters} 个字符
          </Text>
        )}
      </View>

      {/* 格式化工具栏 */}
      {isEditing && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarContainer}>
          <View style={styles.toolbar}>
            <IconButton
              icon="format-bold"
              size={20}
              onPress={handleBold}
              disabled={!selectedText}
            />
            <IconButton
              icon="format-italic"
              size={20}
              onPress={handleItalic}
              disabled={!selectedText}
            />
            <IconButton
              icon="format-underline"
              size={20}
              onPress={handleUnderline}
              disabled={!selectedText}
            />
            <IconButton
              icon="format-strikethrough"
              size={20}
              onPress={handleStrikethrough}
              disabled={!selectedText}
            />
            <View style={styles.divider} />
            <IconButton
              icon="undo"
              size={20}
              onPress={handleUndo}
            />
            <IconButton
              icon="redo"
              size={20}
              onPress={handleRedo}
            />
            <View style={styles.divider} />
            <IconButton
              icon="content-copy"
              size={20}
              onPress={handleCopy}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={handleClear}
              testID="clear_transcript_button"
            />
          </View>
        </ScrollView>
      )}

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        {!isEditing ? (
          <Button
            mode="outlined"
            onPress={() => setIsEditing(true)}
            style={styles.button}>
            编辑
          </Button>
        ) : (
          <>
            <Button
              mode="outlined"
              onPress={() => setIsEditing(false)}
              style={styles.button}>
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}>
              完成
            </Button>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editorContainer: {
    minHeight: 120,
    maxHeight: 300,
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    textAlignVertical: 'top',
  },
  statsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 4,
  },
  toolbarContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  button: {
    flex: 1,
  },
});

