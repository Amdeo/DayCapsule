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

  it('keeps the three toolbar buttons at the expected touch size', () => {
    const screen = render(<BottomToolbar onPress={jest.fn()} />);

    expect(screen.getByTestId('bottom-toolbar-button-text')).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 24,
    });
    expect(screen.getByTestId('bottom-toolbar-button-photo')).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 24,
    });
    expect(screen.getByTestId('bottom-toolbar-button-voice')).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 24,
    });
  });

  it('keeps the toolbar root anchored near the bottom center', () => {
    const screen = render(<BottomToolbar onPress={jest.fn()} />);

    expect(screen.getByTestId('bottom-toolbar-root')).toHaveStyle({
      position: 'absolute',
      bottom: 30,
      alignItems: 'center',
    });
  });
});
