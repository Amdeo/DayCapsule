import React from 'react';
import { render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { SelectableTextBody } from '../text-entry-detail-page/SelectableTextBody';

describe('SelectableTextBody', () => {
  it('renders selectable read-only content through Text on Android-safe path', () => {
    const screen = render(
      <SelectableTextBody
        content={'第一行内容\n第二行内容'}
        testID="selectable-text-body"
      />
    );

    const content = screen.getByTestId('selectable-text-body');

    expect(content.type).toBe('Text');
    expect(content.props.selectable).toBe(true);
    expect(content.props.children).toBe('第一行内容\n第二行内容');
    expect(screen.UNSAFE_queryByType(TextInput)).toBeNull();
  });
});
