import React from 'react';
import {
  Text,
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
    <Text
      selectable
      testID={testID}
      style={[
        styles.selectableContentInput,
        style,
      ]}
    >
      {content}
    </Text>
  );
}
