import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AboutPage } from '../AboutPage';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('../DetailPageShell', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    DetailPageShell: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title: string;
      children: React.ReactNode;
    }) => {
      if (!visible) {
        return null;
      }

      return (
        <View>
          <Text>{title}</Text>
          {children}
        </View>
      );
    },
  };
});

describe('AboutPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the about page sections inside the existing shell', () => {
    const screen = render(<AboutPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('about-page-root')).toBeTruthy();
    expect(screen.getByText('DayCapsule')).toBeTruthy();
    expect(screen.getByText('功能特性')).toBeTruthy();
    expect(screen.getByText('技术栈')).toBeTruthy();
    expect(screen.getByText('更多信息')).toBeTruthy();
  });

  it('opens the expected links from the info buttons', async () => {
    const openURL = jest.spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const screen = render(<AboutPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('GitHub 仓库'));
    fireEvent.press(screen.getByText('使用文档'));

    expect(openURL).toHaveBeenNthCalledWith(1, 'https://github.com');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://expo.dev');
  });
});
