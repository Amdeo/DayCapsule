import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

const mockCaptureException = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

let allowRender = false;

function FlakyChild() {
  if (!allowRender) {
    throw new Error('边界测试错误');
  }

  return <Text>恢复成功</Text>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    Object.defineProperty(global, 'window', {
      value: {
        dispatchEvent: jest.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    allowRender = false;
    mockCaptureException.mockClear();
    mockLoggerError.mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when no error is thrown', () => {
    allowRender = true;
    const screen = render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('恢复成功')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary-root')).toBeNull();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('renders the fallback shell when a child throws', () => {
    const screen = render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-root')).toBeTruthy();
    expect(screen.getByText('应用遇到错误')).toBeTruthy();
    expect(screen.getByText('边界测试错误')).toBeTruthy();
    expect(screen.getByTestId('error-boundary-reset')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('resets back to children when retrying', () => {
    const screen = render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>
    );

    allowRender = true;
    fireEvent.press(screen.getByTestId('error-boundary-reset'));

    expect(screen.getByText('恢复成功')).toBeTruthy();
  });
});
