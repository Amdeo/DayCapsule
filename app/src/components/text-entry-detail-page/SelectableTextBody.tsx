import React from 'react';
import {
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { textEntryDetailPageStyles as styles } from './TextEntryDetailPage.styles';

interface SelectableTextBodyProps {
  content: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export function SelectableTextBody({
  content,
  style,
  testID = 'text-entry-detail-content',
}: SelectableTextBodyProps) {
  return (
    <TextInput
      contextMenuHidden={false}
      editable={false}
      multiline
      scrollEnabled={false}
      testID={testID}
      style={[
        styles.selectableContentInput,
        style,
      ]}
      value={content}
    />
  );
}
