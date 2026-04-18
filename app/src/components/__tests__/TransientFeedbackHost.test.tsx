import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
import { TransientFeedbackHost } from '../TransientFeedbackHost';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TransientFeedbackHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTransientFeedbackStore.setState({
      currentMessage: null,
      sequence: 0,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when idle', () => {
    const screen = render(<TransientFeedbackHost />);

    expect(screen.queryByTestId('transient-feedback-host')).toBeNull();
  });

  it('renders the latest message and auto-dismisses it', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    expect(screen.getByText('已复制')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1400);
    });

    expect(screen.queryByText('已复制')).toBeNull();
  });

  it('replaces the previous message when a new one arrives', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
      showTransientFeedback('再次复制');
    });

    expect(screen.queryByText('已复制')).toBeNull();
    expect(screen.getByText('再次复制')).toBeTruthy();
  });
});
