import React from 'react';
import { render } from '@testing-library/react-native';
import { useErrorFeedbackStore } from '@/src/store/errorFeedbackStore';
import { FeedbackHost } from '../FeedbackHost';

jest.mock('../ErrorFeedbackModal', () => ({
  ErrorFeedbackModal: ({ visible, request }: any) => {
    const { Text } = require('react-native');
    return visible && request ? <Text>{request.title}</Text> : null;
  },
}));

describe('FeedbackHost', () => {
  beforeEach(() => {
    useErrorFeedbackStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('renders the current feedback request from store state', () => {
    useErrorFeedbackStore.getState().show({
      title: '初始化失败',
      message: '应用启动遇到问题，请重启应用。',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    const screen = render(<FeedbackHost />);

    expect(screen.getByText('初始化失败')).toBeTruthy();
  });
});
