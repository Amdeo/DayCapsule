import React from 'react';
import { Pressable, Text } from 'react-native';
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
let currentErrorMessage = '边界测试错误';

function FlakyChild() {
  if (!allowRender) {
    throw new Error(currentErrorMessage);
  }

  return <Text>恢复成功</Text>;
}

function ReRenderHarness() {
  const [version, setVersion] = React.useState(0);

  return (
    <>
      <Pressable testID="error-boundary-rerender" onPress={() => setVersion((value) => value + 1)}>
        <Text>重新渲染</Text>
      </Pressable>
      <ErrorBoundary>
        <FlakyChild key={version} />
      </ErrorBoundary>
    </>
  );
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
    currentErrorMessage = '边界测试错误';
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
    expect(screen.getByText(currentErrorMessage)).toBeTruthy();
    expect(screen.getByTestId('error-boundary-reset')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('logs and reports the component stack when a child throws', () => {
    render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>
    );

    expect(mockLoggerError).toHaveBeenCalledWith(
      'ErrorBoundary 捕获错误:',
      expect.objectContaining({ message: currentErrorMessage }),
      expect.objectContaining({
        componentStack: expect.stringContaining('FlakyChild'),
      })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: currentErrorMessage }),
      expect.objectContaining({
        contexts: {
          react: {
            componentStack: expect.stringContaining('FlakyChild'),
          },
        },
      })
    );
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

  it('shows the next fallback and reports again when a recovered tree crashes later', () => {
    const screen = render(<ReRenderHarness />);

    expect(screen.getByText('边界测试错误')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalledTimes(1);

    allowRender = true;
    fireEvent.press(screen.getByTestId('error-boundary-reset'));

    expect(screen.getByText('恢复成功')).toBeTruthy();

    allowRender = false;
    currentErrorMessage = '第二次崩溃';
    fireEvent.press(screen.getByTestId('error-boundary-rerender'));

    expect(screen.getByText('第二次崩溃')).toBeTruthy();
    expect(mockLoggerError).toHaveBeenCalledTimes(2);
    expect(mockCaptureException).toHaveBeenCalledTimes(2);
  });
});
