import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useErrorFeedbackStore } from '@/src/store/errorFeedbackStore';
import { FeedbackHost } from '../FeedbackHost';

const mockLoggerError = jest.fn();

jest.mock('@/src/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('../ErrorFeedbackModal', () => ({
  ErrorFeedbackModal: ({ visible, request, onDismiss }: any) => {
    const { Pressable, Text, View } = require('react-native');
    if (!visible || !request) {
      return null;
    }
    return (
      <View>
        <Text>{request.title}</Text>
        <Pressable testID="feedback-host-dismiss" onPress={onDismiss}>
          <Text>关闭</Text>
        </Pressable>
        {request.actions.map((action: any, index: number) => (
          <Pressable
            key={`${action.label}-${index}`}
            testID={action.testID ?? `feedback-host-action-${index}`}
            onPress={action.onPress}
          >
            <Text>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

describe('FeedbackHost', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    useErrorFeedbackStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('renders nothing when the store has no current feedback request', () => {
    const screen = render(<FeedbackHost />);

    expect(screen.queryByTestId('feedback-host-action-0')).toBeNull();
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

  it('dismisses the current request before running the wrapped action', async () => {
    const actionSpy = jest.fn();
    useErrorFeedbackStore.getState().show({
      title: '网络异常',
      message: '请稍后重试',
      actions: [{ label: '重试', role: 'primary', onPress: actionSpy }],
    });

    const screen = render(<FeedbackHost />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-host-action-0'));
    });

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(useErrorFeedbackStore.getState().current).toBeNull();
    expect(screen.queryByText('网络异常')).toBeNull();
  });

  it('dismisses the current request from the modal dismiss callback', () => {
    useErrorFeedbackStore.getState().show({
      title: '初始化失败',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    const screen = render(<FeedbackHost />);
    fireEvent.press(screen.getByTestId('feedback-host-dismiss'));

    expect(useErrorFeedbackStore.getState().current).toBeNull();
  });

  it('dismisses and logs when a wrapped action rejects', async () => {
    const actionError = new Error('同步按钮执行失败');
    useErrorFeedbackStore.getState().show({
      title: '网络异常',
      actions: [
        {
          label: '重试',
          role: 'primary',
          onPress: jest.fn().mockRejectedValue(actionError),
        },
      ],
    });

    const screen = render(<FeedbackHost />);

    await expect(
      act(async () => {
        fireEvent.press(screen.getByTestId('feedback-host-action-0'));
      })
    ).resolves.toBeUndefined();

    expect(useErrorFeedbackStore.getState().current).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[FeedbackHost] feedback action failed:',
      actionError
    );
  });
});
