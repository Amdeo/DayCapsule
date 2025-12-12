import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import TimelineScreen from '../../../../src/features/timeline/screens/TimelineScreen';

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const BottomSheet = React.forwardRef(({ children, onChange }: any, ref: any) => {
    // Only mock the ref methods
    React.useImperativeHandle(ref, () => ({
      expand: jest.fn(() => onChange(1)), // Simulate expanding to index 1
      close: jest.fn(() => onChange(-1)), // Simulate closing
    }));
    return null; // Don't render anything for the mock BottomSheet
  });

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>; // Simplified
    },
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
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: () => {},
    withTiming: (toValue: number) => toValue,
    Easing: { ease: {} },
  };
});

// Mock useKeyboardHandler
jest.mock('../../../../src/ui/components/CapsuleDock/useKeyboardHandler', () => ({
  __esModule: true,
  default: () => ({ keyboardHeight: { value: 0 }, animatedKeyboardStyle: {} }),
}));

// Mock audioRecorder
jest.mock('../../../../src/services/voice/audioRecorder', () => ({
  audioRecorder: {
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue('/path/to/audio.m4a'),
  },
}));

// Mock asrService
jest.mock('../../../../src/services/ai/asrService', () => ({
  asrService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    transcribe: jest.fn().mockResolvedValue({ text: '这是一段测试语音的转写', confidence: 0.99 }),
  },
}));

// Mock permissions to always return true
jest.mock('../../../../src/services/permissions', () => ({
  permissionsService: {
    ensurePermission: jest.fn().mockResolvedValue(true),
  },
}));

// Mock location
jest.mock('../../../../src/services/location/locationService', () => ({
  locationService: {
    getCurrentLocationWithAddress: jest.fn().mockResolvedValue({}),
  },
}));

// Mock useAutoSaveDraft for CapsuleDock
jest.mock('../../../../src/hooks/useAutoSaveDraft', () => ({
  useAutoSaveDraft: () => ({
    text: '',
    setText: jest.fn(),
    clearDraft: jest.fn(),
    isLoaded: true,
  }),
}));

// Mock Image Picker for CameraBottomSheet
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Mock Vision Camera
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

// Mock services that TimelineScreen directly calls
jest.mock('../../../../services/camera/cameraService', () => ({
  cameraService: {
    pickMultiplePhotos: jest.fn().mockResolvedValue([{ uri: 'mock_gallery_photo_uri' }]),
    takePhoto: jest.fn().mockResolvedValue({ uri: 'mock_camera_photo_uri' }),
  },
}));

// Mock EntryCard
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

// Mock TagInput
jest.mock('../../../src/features/capture/components/TagInput', () => {
  const React = require('react');
  const { View, TextInput, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ tags, onTagsChange, testID }: any) => {
      const [localText, setLocalText] = React.useState('');
      return (
        <View testID={testID}>
          {tags.map((tag: string) => (
            <Text key={tag} testID={`${testID}-chip-${tag}`}>#{tag}</Text>
          ))}
          <TextInput
            testID={`${testID}-input`}
            value={localText}
            onChangeText={setLocalText}
            onSubmitEditing={() => {
              if (localText.trim()) {
                onTagsChange([...tags, localText.trim()]);
                setLocalText('');
              }
            }}
          />
          <TouchableOpacity testID={`${testID}-add-button`} onPress={() => {
            if (localText.trim()) {
                onTagsChange([...tags, localText.trim()]);
                setLocalText('');
              }
          }}><Text>Add</Text></TouchableOpacity>
        </View>
      );
    },
  };
});

// Mock MoodPicker
jest.mock('../../../src/features/capture/components/MoodPicker', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const MOODS = [
    { id: 'happy', emoji: '😊', label: '开心' },
    { id: 'excited', emoji: '🤩', label: '兴奋' },
  ];
  return {
    __esModule: true,
    default: ({ selectedMood, onMoodChange, testID }: any) => (
      <View testID={testID}>
        {MOODS.map(mood => (
          <TouchableOpacity 
            key={mood.id} 
            testID={`${testID}-${mood.id}`} 
            onPress={() => onMoodChange(mood.id)}
          >
            <Text>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

describe('EntryDetailsSheet UI Flow', () => {
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

  it('should open EntryDetailsSheet when an EntryCard is pressed', async () => {
    const { getByText, queryByText } = renderScreen();

    // Verify EntryDetailsSheet is initially closed
    expect(queryByText(/这里将展示记录的详细内容/)).toBeNull();

    // Find and press an EntryCard (using content text from MOCK_ENTRIES in TimelineScreen)
    const entryCard = getByText('今天学到了很多新知识，感觉非常充实！'); // Adjust to match mock data
    fireEvent.press(entryCard);

    // Verify EntryDetailsSheet is now open and displays content
    await waitFor(() => {
      expect(queryByText(/这里将展示记录的详细内容/)).toBeTruthy();
      expect(queryByText('今天学到了很多新知识，感觉非常充实！')).toBeTruthy(); // Verify content
    });
  });

  it('should close EntryDetailsSheet when onClose is triggered', async () => {
    const { getByText, queryByText } = renderScreen();

    // Open sheet first
    const entryCard = getByText('今天学到了很多新知识，感觉非常充实！');
    fireEvent.press(entryCard);

    await waitFor(() => {
      expect(queryByText(/这里将展示记录的详细内容/)).toBeTruthy();
    });

    // Simulate closing the sheet by checking if the UI disappears after the mock calls onChange(-1)
    await waitFor(() => {
        expect(queryByText(/这里将展示记录的详细内容/)).toBeNull();
    }, { timeout: 1000 }); // Give it some time for the simulated async close
  });

  it('should allow editing an entry', async () => {
    const { getByText, getByLabelText, getByDisplayValue, queryByText, findByDisplayValue, findByText, getByTestId, getByPlaceholderText } = renderScreen();

    // Open sheet for the first entry
    const entryCard = getByText('今天学到了很多新知识，感觉非常充实！');
    fireEvent.press(entryCard);

    // Verify sheet is open
    await waitFor(() => expect(queryByText(/这里将展示记录的详细内容/)).toBeTruthy());

    // Click edit button (pencil icon)
    const editButton = getByLabelText('pencil'); // Assuming IconButton has a label
    fireEvent.press(editButton);

    // Verify into editing mode: content is editable (TextInput)
    const contentInput = await findByDisplayValue('今天学到了很多新知识，感觉非常充实！');
    expect(contentInput).toBeTruthy();
    
    // Change content
    fireEvent.changeText(contentInput, '更新后的新内容！');
    expect(contentInput.props.value).toBe('更新后的新内容！');

    // Add a tag (TagInput has add button with icon="plus")
    const tagInput = getByPlaceholderText('添加标签...');
    fireEvent.changeText(tagInput, '新标签');
    const mockTagInputAddButton = getByTestId('tag-input-add-button'); // Mocked add button
    fireEvent.press(mockTagInputAddButton);

    expect(getByText('#新标签')).toBeTruthy();

    // Select a mood
    const happyMoodButton = getByTestId('mood-picker-happy'); // Assuming MoodPicker items have testID="mood-picker-happy"
    fireEvent.press(happyMoodButton);
    expect(getByText('😊')).toBeTruthy(); // Check if selected mood emoji is displayed

    // Click save button (check icon)
    const saveButton = getByLabelText('check');
    fireEvent.press(saveButton);

    // Verify not in editing mode
    expect(queryByText('更新后的新内容！')).toBeTruthy(); // Display text
    expect(queryByText('#新标签')).toBeTruthy(); // Display tag
    expect(queryByText(/这里将展示记录的详细内容/)).toBeTruthy(); // Sheet still open

    // Verify that the entry card itself is updated in the list
    expect(getByText('更新后的新内容！')).toBeTruthy(); // The entry in the FlatList should be updated
  });

  it('should allow deleting an entry', async () => {
    const { getByText, getByLabelText, queryByText } = renderScreen();

    // Open sheet for the first entry
    const entryCard = getByText('今天学到了很多新知识，感觉非常充实！');
    fireEvent.press(entryCard);

    // Verify sheet is open
    await waitFor(() => expect(queryByText(/这里将展示记录的详细内容/)).toBeTruthy());

    // Click delete button (delete icon)
    const deleteButton = getByLabelText('delete');
    fireEvent.press(deleteButton);

    // Alert mock will automatically call the '删除' button's onPress
    // This should trigger onDelete, which closes the sheet.

    await waitFor(() => {
      expect(queryByText(/这里将展示记录的详细内容/)).toBeNull(); // Sheet should be closed
    });

    // Verify the entry is no longer in the FlatList by checking for its content
    expect(queryByText('今天学到了很多新知识，感觉非常充实！')).toBeNull();
  });
});