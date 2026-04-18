import React from 'react';
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
import { TransientFeedbackHost } from '../TransientFeedbackHost';

const mockAnnounceForAccessibility = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TransientFeedbackHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAnnounceForAccessibility.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation((message: string) => mockAnnounceForAccessibility(message));
    useTransientFeedbackStore.setState({
      currentMessage: null,
      sequence: 0,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('resets the lifespan when the same message is shown again', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    act(() => {
      showTransientFeedback('已复制');
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText('已复制')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(screen.queryByText('已复制')).toBeNull();
  });

  it('ignores a stale timeout when the message is retriggered near expiry', () => {
    const scheduledCallbacks: Array<() => void> = [];
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((callback: TimerHandler) => {
        scheduledCallbacks.push(callback as () => void);
        return scheduledCallbacks.length as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    act(() => {
      showTransientFeedback('已复制');
    });

    act(() => {
      scheduledCallbacks[0]?.();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(screen.getByText('已复制')).toBeTruthy();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('announces the message for accessibility when shown', () => {
    render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    expect(mockAnnounceForAccessibility).toHaveBeenCalledWith('已复制');
  });
});
