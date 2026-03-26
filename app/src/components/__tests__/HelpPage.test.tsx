import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { HelpPage } from '../HelpPage';

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

describe('HelpPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing when the page is hidden', () => {
    const screen = render(<HelpPage visible={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('help-page-root')).toBeNull();
  });

  it('renders the FAQ list and contact section inside the existing shell', () => {
    const screen = render(<HelpPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('help-page-root')).toBeTruthy();
    expect(screen.getByText('常见问题')).toBeTruthy();
    expect(screen.getByText('联系我们')).toBeTruthy();
    expect(screen.getByText('发送反馈邮件')).toBeTruthy();
  });

  it('expands an faq answer when the item is pressed', () => {
    const screen = render(<HelpPage visible onClose={jest.fn()} />);
    const answer = '点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。';

    expect(screen.queryByText(answer)).toBeNull();

    fireEvent.press(screen.getByText('如何添加文字记录？'));

    expect(screen.getByText(answer)).toBeTruthy();
  });

  it('collapses the faq answer when the same item is pressed again', () => {
    const screen = render(<HelpPage visible onClose={jest.fn()} />);
    const answer = '点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。';

    fireEvent.press(screen.getByText('如何添加文字记录？'));
    expect(screen.getByText(answer)).toBeTruthy();

    fireEvent.press(screen.getByText('如何添加文字记录？'));
    expect(screen.queryByText(answer)).toBeNull();
  });

  it('opens the feedback mail link when pressed', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true);
    const screen = render(<HelpPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('发送反馈邮件'));

    expect(openURL).toHaveBeenCalledWith('mailto:support@memorycapsule.app');
  });
});
