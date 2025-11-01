/**
 * 转录语言选择组件
 *
 * 允许用户选择转录的语言
 */

import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Dialog, Button, RadioButton, Text} from 'react-native-paper';
import {SUPPORTED_LANGUAGES} from '@services/speechToText/config';

interface TranscriptionLanguageSelectorProps {
  visible: boolean;
  selectedLanguage: string;
  onLanguageSelect: (language: string) => void;
  onCancel: () => void;
  testID?: string;
}

export const TranscriptionLanguageSelector: React.FC<TranscriptionLanguageSelectorProps> = ({
  visible,
  selectedLanguage,
  onLanguageSelect,
  onCancel,
  testID,
}) => {
  const [tempLanguage, setTempLanguage] = useState(selectedLanguage);

  const handleConfirm = () => {
    onLanguageSelect(tempLanguage);
  };

  const handleCancel = () => {
    setTempLanguage(selectedLanguage);
    onCancel();
  };

  const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
    code,
    name,
  }));

  return (
    <Dialog visible={visible} onDismiss={handleCancel} testID={testID} style={styles.dialog}>
      <Dialog.Title>选择转录语言</Dialog.Title>

      <Dialog.ScrollArea style={styles.scrollArea}>
        <ScrollView>
          <View style={styles.content}>
            <RadioButton.Group value={tempLanguage} onValueChange={setTempLanguage}>
              {languages.map(({code, name}) => (
                <View key={code} style={styles.languageItem}>
                  <RadioButton.Item
                    label={name}
                    value={code}
                    testID={`${testID}-language-${code}`}
                    style={styles.radioItem}
                  />
                </View>
              ))}
            </RadioButton.Group>

            <View style={styles.infoSection}>
              <Text variant="labelSmall" style={styles.infoLabel}>
                提示：
              </Text>
              <Text variant="bodySmall" style={styles.infoText}>
                • 选择与您的音频内容相匹配的语言
              </Text>
              <Text variant="bodySmall" style={styles.infoText}>
                • 语言选择会影响转录的准确性
              </Text>
              <Text variant="bodySmall" style={styles.infoText}>
                • 当前选择: {SUPPORTED_LANGUAGES[tempLanguage as keyof typeof SUPPORTED_LANGUAGES]}
              </Text>
            </View>
          </View>
        </ScrollView>
      </Dialog.ScrollArea>

      <Dialog.Actions style={styles.actions}>
        <Button mode="text" onPress={handleCancel} testID={`${testID}-cancel-button`}>
          取消
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          testID={`${testID}-confirm-button`}
          disabled={tempLanguage === selectedLanguage}>
          确认
        </Button>
      </Dialog.Actions>
    </Dialog>
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
  languageItem: {
    marginVertical: 4,
  },
  radioItem: {
    paddingVertical: 0,
  },
  infoSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
});
