import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ErrorFeedbackModal } from '../ErrorFeedbackModal';

describe('ErrorFeedbackModal', () => {
  const request = {
    title: '同步失败',
    message: '请检查网络连接后重试。',
    actions: [
      { label: '稍后', role: 'secondary' as const },
      { label: '重试', role: 'primary' as const },
    ],
  };

  it('renders title, message and actions in the expected order', () => {
    const screen = render(
      <ErrorFeedbackModal visible request={request} onDismiss={jest.fn()} />
    );

    expect(screen.getByText('同步失败')).toBeTruthy();
    expect(screen.getByText('请检查网络连接后重试。')).toBeTruthy();
    expect(screen.getByTestId('error-feedback-action-0')).toBeTruthy();
    expect(screen.getByTestId('error-feedback-action-1')).toBeTruthy();
    expect(screen.getByText('稍后')).toBeTruthy();
    expect(screen.getByText('重试')).toBeTruthy();
  });

  it('calls onDismiss when backdrop is pressed', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ErrorFeedbackModal visible request={request} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByTestId('error-feedback-backdrop'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders structured detail rows when provided', () => {
    const screen = render(
      <ErrorFeedbackModal
        visible
        request={{
          title: '云同步状态',
          tone: 'accent',
          details: [
            { label: '上次同步', value: '从未同步' },
            { label: '待同步条数', value: '2' },
          ],
          actions: [{ label: '关闭', role: 'secondary' }],
        }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('上次同步')).toBeTruthy();
    expect(screen.getByText('从未同步')).toBeTruthy();
    expect(screen.getByText('待同步条数')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders stable action test IDs when provided by the request', () => {
    const screen = render(
      <ErrorFeedbackModal
        visible
        request={{
          title: '云同步状态',
          actions: [
            { label: '修复异常媒体', role: 'secondary', testID: 'error-feedback-action-repair-media' },
            { label: '立即同步', role: 'primary', testID: 'error-feedback-action-sync-now' },
          ],
        }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByTestId('error-feedback-action-repair-media')).toBeTruthy();
    expect(screen.getByTestId('error-feedback-action-sync-now')).toBeTruthy();
  });
});
