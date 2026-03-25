import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import HomeScreen from '../../../../app/(tabs)/index';

const mockEntryStoreState = {
  entries: [] as Array<{ id: string; type: string; media?: Array<{ uri?: string }> }>,
  loadEntries: jest.fn().mockResolvedValue(undefined),
  addEntry: jest.fn().mockResolvedValue(undefined),
  addLocalEntry: jest.fn().mockResolvedValue(undefined),
  updateLocalEntry: jest.fn().mockResolvedValue(undefined),
  replaceEntry: jest.fn().mockResolvedValue(undefined),
  deleteEntry: jest.fn().mockResolvedValue(undefined),
  updateRecordingStatus: jest.fn().mockResolvedValue(undefined),
  updateRecordingDuration: jest.fn().mockResolvedValue(undefined),
  completeRecording: jest.fn().mockResolvedValue(undefined),
};

const mockSettingsState = {
  loadSettings: jest.fn().mockResolvedValue(undefined),
  cloudMode: false,
};

const mockCommonTagsState = {
  loadCommonTags: jest.fn().mockResolvedValue(undefined),
};

const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);
const mockUseEntryStore = Object.assign(
  () => mockEntryStoreState,
  {
    getState: () => mockEntryStoreState,
    setState: jest.fn(),
  }
);

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: mockUseEntryStore,
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => mockSettingsState,
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => mockCommonTagsState,
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: mockRefreshCloudSyncIndicator,
    }),
  },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    prewarmAudioSystem: jest.fn().mockResolvedValue(undefined),
    preloadAudio: jest.fn().mockResolvedValue(undefined),
    cancelRecording: jest.fn().mockResolvedValue(undefined),
    getRecordingDuration: jest.fn().mockResolvedValue(0),
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue({
      uri: 'file:///recording.m4a',
      duration: 0,
      size: 0,
      mimeType: 'audio/m4a',
    }),
    saveVoiceToStorage: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
    saveVoiceToCache: jest.fn().mockResolvedValue('file:///saved-recording.m4a'),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
    savePhotoToCache: jest.fn(),
  },
}));

jest.mock('@/src/services/voiceUploadQueue', () => ({
  enqueueVoiceUpload: jest.fn(),
  configureVoiceUploadQueueCallbacks: jest.fn(),
  flushPendingVoiceUploads: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/services/photoUploadQueue', () => ({
  enqueuePhotoUpload: jest.fn(),
  configurePhotoUploadQueueCallbacks: jest.fn(),
}));

jest.mock('@/src/components/Timeline.v2', () => ({
  Timeline: ({
    onMenuPress,
    onQuickAdd,
    onStopRecording,
  }: {
    onMenuPress: () => void;
    onQuickAdd: (type: 'text' | 'photo' | 'voice') => void;
    onStopRecording: (id: string) => void;
  }) => (
    <View testID="home-screen-timeline-stub">
      <Text>timeline</Text>
      <Pressable testID="home-screen-open-drawer" onPress={onMenuPress}>
        <Text>open-drawer</Text>
      </Pressable>
      <Pressable testID="home-screen-open-editor" onPress={() => onQuickAdd('text')}>
        <Text>open-editor</Text>
      </Pressable>
      <Pressable testID="home-screen-stop-recording" onPress={() => onStopRecording('voice-entry-1')}>
        <Text>stop-recording</Text>
      </Pressable>
    </View>
  ),
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: ({ onClose }: { onClose: () => void }) => (
    <View testID="home-screen-sidebar-stub">
      <Text>sidebar</Text>
      <Pressable testID="home-screen-close-drawer" onPress={onClose}>
        <Text>close-drawer</Text>
      </Pressable>
    </View>
  ),
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: ({
    visible,
    onSave,
    onCancel,
  }: {
    visible: boolean;
    onSave: (content: string, tags: string[]) => void;
    onCancel: () => void;
  }) => (
    <View testID="home-screen-editor-stub">
      <Text>{visible ? 'editor-visible' : 'editor-hidden'}</Text>
      <Pressable testID="home-screen-save-text" onPress={() => onSave('测试内容', ['标签'])}>
        <Text>save-text</Text>
      </Pressable>
      <Pressable testID="home-screen-cancel-text" onPress={onCancel}>
        <Text>cancel-text</Text>
      </Pressable>
    </View>
  ),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

export interface RenderHomeScreenOptions {
  entries?: Array<{ id: string; type: string; media?: Array<{ uri?: string }> }>;
  cloudMode?: boolean;
  loadEntries?: () => Promise<void>;
}

export function renderHomeScreen(options: RenderHomeScreenOptions = {}) {
  const {
    entries = [],
    cloudMode = false,
    loadEntries = jest.fn().mockResolvedValue(undefined),
  } = options;

  Object.assign(mockEntryStoreState, {
    entries,
    loadEntries,
    addEntry: jest.fn().mockResolvedValue(undefined),
    addLocalEntry: jest.fn().mockResolvedValue(undefined),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
    replaceEntry: jest.fn().mockResolvedValue(undefined),
    deleteEntry: jest.fn().mockResolvedValue(undefined),
    updateRecordingStatus: jest.fn().mockResolvedValue(undefined),
    updateRecordingDuration: jest.fn().mockResolvedValue(undefined),
    completeRecording: jest.fn().mockResolvedValue(undefined),
  });
  Object.assign(mockSettingsState, {
    loadSettings: jest.fn().mockResolvedValue(undefined),
    cloudMode,
  });
  Object.assign(mockCommonTagsState, {
    loadCommonTags: jest.fn().mockResolvedValue(undefined),
  });
  mockRefreshCloudSyncIndicator.mockResolvedValue(undefined);

  return {
    screen: render(<HomeScreen />),
    spies: {
      loadEntries: mockEntryStoreState.loadEntries,
      addEntry: mockEntryStoreState.addEntry,
    },
  };
}
