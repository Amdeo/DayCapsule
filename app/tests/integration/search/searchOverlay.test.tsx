import TimelineScreen from '../../../src/features/timeline/screens/TimelineScreen';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock @gorhom/bottom-sheet
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
jest.mock('../../../src/ui/components/CapsuleDock/useKeyboardHandler', () => ({
  __esModule: true,
  default: () => ({ keyboardHeight: { value: 0 }, animatedKeyboardStyle: {} }),
}));

// Mock audioRecorder
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

// Mock location
jest.mock('../../../src/services/location/locationService', () => ({
  locationService: {
    getCurrentLocationWithAddress: jest.fn().mockResolvedValue({}),
  },
}));

// Mock useAutoSaveDraft for CapsuleDock
jest.mock('../../../src/hooks/useAutoSaveDraft', () => ({
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
jest.mock('../../../src/services/camera/cameraService', () => ({
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

describe('Search Overlay UI Flow', () => {
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

  it('should open SearchOverlay when filter button on CapsuleDock is pressed', async () => {
    const { getByLabelText, queryByPlaceholderText } = renderScreen();

    // Verify SearchOverlay is initially closed
    expect(queryByPlaceholderText('搜索记录...')).toBeNull();

    // Find and press the filter button on CapsuleDock (tag icon)
    const filterButton = getByLabelText('tag'); 
    fireEvent.press(filterButton);

    // Verify SearchOverlay is now open and displays search input
    await waitFor(() => {
      expect(queryByPlaceholderText('搜索记录...')).toBeTruthy();
    });
  });

  it('should filter entries when search query is entered', async () => {
    const { getByLabelText, getByPlaceholderText, getByText, queryByText } = renderScreen();

    // Open SearchOverlay
    const filterButton = getByLabelText('tag');
    fireEvent.press(filterButton);
    await waitFor(() => expect(queryByPlaceholderText('搜索记录...')).toBeTruthy());

    // Enter search query
    const searchInput = getByPlaceholderText('搜索记录...');
    fireEvent.changeText(searchInput, '新知识');

    // Trigger search (assuming pressing the magnify glass icon)
    const searchIcon = getByLabelText('magnify');
    fireEvent.press(searchIcon);

    // Verify that the timeline is filtered
    // Original mock entries: '今天学到了很多新知识...' and '和朋友们一起去了公园...'
    // Searching for '新知识' should only show the first entry.
    expect(getByText('今天学到了很多新知识，感觉非常充实！')).toBeTruthy();
    expect(queryByText('和朋友们一起去了公园，拍了很多漂亮的照片。')).toBeNull();

    // Clear search and verify all entries are back
    fireEvent.changeText(searchInput, '');
    fireEvent.press(searchIcon); // Trigger search again for empty query
    expect(getByText('今天学到了很多新知识，感觉非常充实！')).toBeTruthy();
    expect(getByText('和朋友们一起去了公园，拍了很多漂亮的照片。')).toBeTruthy();
  });

  it('should close SearchOverlay when arrow-left button is pressed', async () => {
    const { getByLabelText, queryByPlaceholderText } = renderScreen();

    // Open SearchOverlay
    const filterButton = getByLabelText('tag');
    fireEvent.press(filterButton);
    await waitFor(() => expect(queryByPlaceholderText('搜索记录...')).toBeTruthy());

    // Press arrow-left button
    const closeButton = getByLabelText('arrow-left');
    fireEvent.press(closeButton);

    // Verify SearchOverlay is closed
    await waitFor(() => {
      expect(queryByPlaceholderText('搜索记录...')).toBeNull();
    });
  });
});
