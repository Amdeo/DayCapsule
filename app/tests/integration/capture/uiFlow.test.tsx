import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import TimelineScreen from '../../../src/features/timeline/screens/TimelineScreen';

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  // Mock BottomSheet
  const BottomSheet = React.forwardRef(({ index, children }: any, ref: any) => {
    // Simple mock logic: only render children if index > -1
    // This mimics the visibility toggle
    if (index === -1) return null;
    return <View testID="mock-bottom-sheet">{children}</View>;
  });

  // Mock BottomSheetView
  const BottomSheetView = ({ children, testID }: any) => (
    <View testID={testID}>{children}</View>
  );

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView,
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Reanimated = {
    View: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    createAnimatedComponent: (Component: any) => Component,
  };
  
  return {
    __esModule: true,
    default: Reanimated,
    useSharedValue: (initialValue: number) => ({ value: initialValue }),
    useAnimatedStyle: (cb: any) => cb(),
    withTiming: (toValue: number) => toValue,
  };
});

// Mock useKeyboardHandler
jest.mock('../../../src/ui/components/CapsuleDock/useKeyboardHandler', () => ({
  __esModule: true,
  default: () => ({
    keyboardHeight: { value: 0 },
    animatedKeyboardStyle: {},
  }),
}));

describe('Capture UI Flow Integration Test', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        // Mock minimalistic reducer state
        app: (state = {}) => state,
      },
    });
  });

  const renderScreen = () => {
    return render(
      <Provider store={store}>
        <PaperProvider>
          <TimelineScreen />
        </PaperProvider>
      </Provider>
    );
  };

  it('should open CameraBottomSheet when camera button on CapsuleDock is pressed', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    // 1. Verify CameraBottomSheet is initially NOT visible (index -1 in mock)
    expect(queryByTestId('camera-bottom-sheet-view')).toBeNull();

    // 2. Find and press the camera button on CapsuleDock
    const cameraButton = getByTestId('capsule-camera-button');
    fireEvent.press(cameraButton);

    // 3. Verify CameraBottomSheet IS visible (rendered)
    // The state update in TimelineScreen should trigger re-render, passing index > -1 to mock BottomSheet
    expect(getByTestId('camera-bottom-sheet-view')).toBeTruthy();
  });

  it('should show send button and handle text submission', () => {
    const { getByPlaceholderText, getByTestId, queryByTestId } = renderScreen();

    const input = getByPlaceholderText('输入想法...');
    
    // Type text
    fireEvent.changeText(input, 'Hello World');
    
    // Verify send button is visible
    const sendButton = getByTestId('capsule-send-button');
    expect(sendButton).toBeTruthy();
    
    // Verify camera button is NOT visible (it's replaced)
    expect(queryByTestId('capsule-camera-button')).toBeNull();
    
    // Press send
    fireEvent.press(sendButton);
    
    // Verify input is cleared (indicating send happened)
    expect(input.props.value).toBe('');
    
    // Verify camera button returns
    expect(getByTestId('capsule-camera-button')).toBeTruthy();
  });
});
