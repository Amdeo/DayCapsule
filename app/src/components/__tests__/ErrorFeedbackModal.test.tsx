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
    expect(screen.getByTestId('error-feedback-action-0').props.children).toBe('稍后');
    expect(screen.getByTestId('error-feedback-action-1').props.children).toBe('重试');
  });

  it('calls onDismiss when backdrop is pressed', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ErrorFeedbackModal visible request={request} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByTestId('error-feedback-backdrop'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
