import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import TimelineScreen from '../../../src/features/timeline/screens/TimelineScreen';

// Mocks
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(({ index, children }: any, ref: any) => (index > -1 ? <View>{children}</View> : null)),
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Reanimated = {
    View: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    createAnimatedComponent: (Component: any) => Component,
  };
  return {
    __esModule: true,
    default: Reanimated,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: () => {},
    withTiming: () => {},
    Easing: { ease: {} },
  };
});

jest.mock('../../../src/ui/components/CapsuleDock/useKeyboardHandler', () => ({
  __esModule: true,
  default: () => ({ keyboardHeight: { value: 0 }, animatedKeyboardStyle: {} }),
}));

jest.mock('../../../src/services/voice/audioRecorder', () => ({
  audioRecorder: {
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue('/path/to/audio.m4a'),
  },
}));

// Mock asrService
jest.mock('../../../src/services/ai/asrService', () => ({
  asrService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    transcribe: jest.fn().mockResolvedValue({ text: '这是一段测试语音的转写', confidence: 0.99 }),
  },
}));

// Mock permissions to always return true
jest.mock('../../../src/services/permissions', () => ({
  permissionsService: {
    ensurePermission: jest.fn().mockResolvedValue(true),
  },
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Camera: React.forwardRef((props: any, ref: any) => <View testID="mock-camera" />),
    useCameraDevice: () => ({ devices: ['wide-angle-camera'] }),
    useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
  };
});

// Mock location
jest.mock('../../../src/services/location/locationService', () => ({
  locationService: {
    getCurrentLocationWithAddress: jest.fn().mockResolvedValue({}),
  },
}));

describe('Voice Recording UI Flow', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({ reducer: { app: (s = {}) => s } });
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

  it('should handle long press to record', async () => {
    const { getByTestId, queryByText } = renderScreen();
    const cameraButton = getByTestId('capsule-camera-button');

    // 1. Long press
    await fireEvent(cameraButton, 'longPress');

    // 2. Verify overlay appears
    expect(queryByText('松开保存，上滑取消')).toBeTruthy();

    // 3. Press out (release)
    await fireEvent(cameraButton, 'pressOut');

    // 4. Verify overlay disappears (needs waitFor due to state update)
    await waitFor(() => {
      expect(queryByText('松开保存，上滑取消')).toBeNull();
    });
  });
});