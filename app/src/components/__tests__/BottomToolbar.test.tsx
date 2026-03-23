import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BottomToolbar } from '../BottomToolbar';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('BottomToolbar', () => {
  it('renders toolbar shell and dispatches button types', () => {
    const onPress = jest.fn();
    const screen = render(<BottomToolbar onPress={onPress} />);

    expect(screen.getByTestId('bottom-toolbar-root')).toBeTruthy();

    fireEvent.press(screen.getByTestId('bottom-toolbar-button-text'));
    fireEvent.press(screen.getByTestId('bottom-toolbar-button-photo'));
    fireEvent.press(screen.getByTestId('bottom-toolbar-button-voice'));

    expect(onPress).toHaveBeenNthCalledWith(1, 'text');
    expect(onPress).toHaveBeenNthCalledWith(2, 'photo');
    expect(onPress).toHaveBeenNthCalledWith(3, 'voice');
  });
});
