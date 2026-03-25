import React from 'react';
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

jest.mock('@/src/components/Timeline.v2', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Timeline: () => React.createElement(View, { testID: 'home-screen-timeline-stub' }),
  };
});

jest.mock('@/src/components/Sidebar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Sidebar: () => React.createElement(View, { testID: 'home-screen-sidebar-stub' }),
  };
});

jest.mock('@/src/components/TextEditor', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    TextEditor: () => React.createElement(View, { testID: 'home-screen-editor-stub' }),
  };
});

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
    entries: [],
    loadEntries: jest.fn().mockResolvedValue(undefined),
    addEntry: jest.fn().mockResolvedValue(undefined),
    addLocalEntry: jest.fn().mockResolvedValue(undefined),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
    replaceEntry: jest.fn().mockResolvedValue(undefined),
    deleteEntry: jest.fn().mockResolvedValue(undefined),
    updateRecordingStatus: jest.fn().mockResolvedValue(undefined),
    updateRecordingDuration: jest.fn().mockResolvedValue(undefined),
    completeRecording: jest.fn().mockResolvedValue(undefined),
    ...overrides.entryStore,
  });
  Object.assign(mockSettingsState, {
    loadSettings: jest.fn().mockResolvedValue(undefined),
    cloudMode: false,
    ...overrides.settings,
  });
  Object.assign(mockCommonTagsState, {
    loadCommonTags: jest.fn().mockResolvedValue(undefined),
    ...overrides.commonTags,
  });
  mockRefreshCloudSyncIndicator.mockResolvedValue(undefined);

  return {
    mocks: {
      entryStore: mockEntryStoreState,
      settings: mockSettingsState,
      commonTags: mockCommonTagsState,
    },
    screen: render(<HomeScreen />),
  };
}
