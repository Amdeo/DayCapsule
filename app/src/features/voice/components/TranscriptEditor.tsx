import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, useTheme, Button } from 'react-native-paper'; // Imported Button
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

interface TranscriptEditorProps {
  initialText: string;
  onSave: (editedText: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  testID?: string;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  initialText,
  onSave,
  onCancel,
  isLoading = false,
  testID,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [editedText, setEditedText] = useState(initialText);

  useEffect(() => {
    setEditedText(initialText);
  }, [initialText]);

  return (
    <View style={styles.container} testID={testID}>
      <TextInput
        value={editedText}
        onChangeText={setEditedText}
        mode="outlined"
        label="编辑转写文本"
        multiline
        style={styles.textInput}
        disabled={isLoading}
      />
      <View style={styles.buttonContainer}>
        <Button mode="outlined"
          onPress={onCancel}
          style={styles.button}
          disabled={isLoading}>取消</Button>
        <Button
          mode="contained"
          onPress={() => onSave(editedText)}
          style={styles.button}
          disabled={isLoading || editedText === initialText}
        >
          <Text>保存</Text>
        </Button>
      </View>
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  textInput: {
    minHeight: 120,
    backgroundColor: theme.colors.surface,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    marginLeft: 8,
  },
});

export default TranscriptEditor;