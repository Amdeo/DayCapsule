import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../../../../app/(tabs)/index';

const mockLoadEntries = jest.fn().mockResolvedValue(undefined);
const mockAddEntry = jest.fn().mockResolvedValue(undefined);
const mockAddLocalEntry = jest.fn().mockResolvedValue(undefined);
const mockUpdateLocalEntry = jest.fn().mockResolvedValue(undefined);
const mockReplaceEntry = jest.fn().mockResolvedValue(undefined);
const mockDeleteEntry = jest.fn().mockResolvedValue(undefined);
const mockUpdateRecordingStatus = jest.fn().mockResolvedValue(undefined);
const mockUpdateRecordingDuration = jest.fn().mockResolvedValue(undefined);
const mockCompleteRecording = jest.fn().mockResolvedValue(undefined);
const mockRefreshCloudSyncIndicator = jest.fn().mockResolvedValue(undefined);
const mockLoadSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadCommonTags = jest.fn().mockResolvedValue(undefined);
const mockEntryStoreState = {
  loadEntries: mockLoadEntries,
  addEntry: mockAddEntry,
  addLocalEntry: mockAddLocalEntry,
  updateLocalEntry: mockUpdateLocalEntry,
  replaceEntry: mockReplaceEntry,
  deleteEntry: mockDeleteEntry,
  updateRecordingStatus: mockUpdateRecordingStatus,
  updateRecordingDuration: mockUpdateRecordingDuration,
  completeRecording: mockCompleteRecording,
};
const mockSettingsState = {
  loadSettings: mockLoadSettings,
  cloudMode: false,
};
const mockCommonTagsState = {
  loadCommonTags: mockLoadCommonTags,
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => mockEntryStoreState,
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
    preloadAudio: jest.fn().mockResolvedValue(undefined),
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
  Timeline: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'timeline-stub' });
  },
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: ({ setShowStats }: { setShowStats: (value: boolean) => void }) => {
    const React = require('react');
    const { View, Pressable, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'sidebar-stub' },
      React.createElement(
        Pressable,
        { testID: 'sidebar-open-stats', onPress: () => setShowStats(true) },
        React.createElement(Text, null, '打开统计')
      )
    );
  },
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'text-editor-stub' });
  },
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
  entryStore?: Partial<typeof mockEntryStoreState>;
  settings?: Partial<typeof mockSettingsState>;
  commonTags?: Partial<typeof mockCommonTagsState>;
}

export function renderHomeScreen(overrides: RenderHomeScreenOptions = {}) {
  Object.assign(mockEntryStoreState, {
    loadEntries: mockLoadEntries,
    addEntry: mockAddEntry,
    addLocalEntry: mockAddLocalEntry,
    updateLocalEntry: mockUpdateLocalEntry,
    replaceEntry: mockReplaceEntry,
    deleteEntry: mockDeleteEntry,
    updateRecordingStatus: mockUpdateRecordingStatus,
    updateRecordingDuration: mockUpdateRecordingDuration,
    completeRecording: mockCompleteRecording,
    ...overrides.entryStore,
  });
  Object.assign(mockSettingsState, {
    loadSettings: mockLoadSettings,
    cloudMode: false,
    ...overrides.settings,
  });
  Object.assign(mockCommonTagsState, {
    loadCommonTags: mockLoadCommonTags,
    ...overrides.commonTags,
  });

  return {
    mocks: {
      entryStore: mockEntryStoreState,
      settings: mockSettingsState,
      commonTags: mockCommonTagsState,
      refreshCloudSyncIndicator: mockRefreshCloudSyncIndicator,
    },
    screen: render(<HomeScreen />),
  };
}
