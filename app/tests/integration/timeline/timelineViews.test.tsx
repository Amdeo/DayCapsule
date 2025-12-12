import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import TimelineScreen from '../../../../src/features/timeline/screens/TimelineScreen';

// Mock @gorhom/bottom-sheet (same as in entryDetailsSheet.test.ts)
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const BottomSheet = React.forwardRef(({ children, onChange }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      expand: jest.fn(() => onChange(1)),
      close: jest.fn(() => onChange(-1)),
    }));
    return null;
  });

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
  };
});

// Mock react-native-reanimated (same as in entryDetailsSheet.test.ts)
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
    withTiming: (toValue: number) => toValue,
    Easing: { ease: {} },
  };
});

// Mock useKeyboardHandler (same as in capture/uiFlow.test.tsx)
jest.mock('../../../../src/ui/components/CapsuleDock/useKeyboardHandler', () => ({
  __esModule: true,
  default: () => ({ keyboardHeight: { value: 0 }, animatedKeyboardStyle: {} }),
}));

// Mock audioRecorder (same as in voice/uiFlow.test.tsx)
jest.mock('../../../../src/services/voice/audioRecorder', () => ({
  audioRecorder: {
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue('/path/to/audio.m4a'),
  },
}));

// Mock asrService (same as in voice/uiFlow.test.tsx)
jest.mock('../../../../src/services/ai/asrService', () => ({
  asrService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    transcribe: jest.fn().mockResolvedValue({ text: '这是一段测试语音的转写', confidence: 0.99 }),
  },
}));

// Mock permissions to always return true (same as in voice/uiFlow.test.tsx)
jest.mock('../../../../src/services/permissions', () => ({
  permissionsService: {
    ensurePermission: jest.fn().mockResolvedValue(true),
  },
}));

// Mock location (same as in voice/uiFlow.test.tsx)
jest.mock('../../../../src/services/location/locationService', () => ({
  locationService: {
    getCurrentLocationWithAddress: jest.fn().mockResolvedValue({}),
  },
}));

// Mock useAutoSaveDraft for CapsuleDock (same as in capture/uiFlow.test.tsx)
jest.mock('../../../../src/hooks/useAutoSaveDraft', () => ({
  useAutoSaveDraft: () => ({
    text: '',
    setText: jest.fn(),
    clearDraft: jest.fn(),
    isLoaded: true,
  }),
}));

// Mock Image Picker for CameraBottomSheet (same as in capture/uiFlow.test.tsx)
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Mock Vision Camera (same as in capture/uiFlow.test.tsx)
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Camera: React.forwardRef((props: any, ref: any) => <View testID="mock-vision-camera" />),
    useCameraDevice: jest.fn(() => ({ devices: ['wide-angle-camera'] })),
    useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
    PhotoFile: jest.fn(),
  };
});

// Mock services that TimelineScreen directly calls (same as in capture/uiFlow.test.tsx)
jest.mock('../../../../services/camera/cameraService', () => ({
  cameraService: {
    pickMultiplePhotos: jest.fn().mockResolvedValue([{ uri: 'mock_gallery_photo_uri' }]),
    takePhoto: jest.fn().mockResolvedValue({ uri: 'mock_camera_photo_uri' }),
  },
}));

// Mock EntryCard (same as in entryDetailsSheet.test.ts)
jest.mock('../../../src/features/timeline/components/EntryCard', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ entry, onPress }: any) => (
      <TouchableOpacity testID={`entry-card-${entry.id}`} onPress={() => onPress(entry)}>
        <Text>{entry.content}</Text>
      </TouchableOpacity>
    ),
  };
});


describe('Timeline Views Integration Test', () => {
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

  it('should render a list of entries', async () => {
    const { getByText } = renderScreen();
    // Verify some mock entries are rendered
    expect(getByText('今天学到了很多新知识，感觉非常充实！')).toBeTruthy();
    expect(getByText('和朋友们一起去了公园，拍了很多漂亮的照片。')).toBeTruthy();
  });

  // TODO: Add tests for switching between Day/Week/Month/Year views once ViewSwitcher is integrated
  // For now, this just verifies the FlatList renders content.
});