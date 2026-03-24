import React from 'react';
import { render } from '@testing-library/react-native';
import { useAppDialogStore } from '@/src/store/appDialogStore';
import { FeedbackHost } from '../FeedbackHost';

jest.mock('../AppDialogModal', () => ({
  AppDialogModal: ({ visible, request }: any) => {
    const { Text } = require('react-native');
    return visible && request ? <Text>{request.title}</Text> : null;
  },
}));

describe('FeedbackHost', () => {
  beforeEach(() => {
    useAppDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('renders the current feedback request from store state', () => {
    useAppDialogStore.getState().show({
      title: '初始化失败',
      message: '应用启动遇到问题，请重启应用。',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    const screen = render(<FeedbackHost />);

    expect(screen.getByText('初始化失败')).toBeTruthy();
  });
});
