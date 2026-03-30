jest.mock('react-native', () => {
  return {
    View: 'View',
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn() },
    BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), removeEventListener: jest.fn() },
    Pressable: 'Pressable',
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Platform: { OS: 'ios', select: (obj) => obj.ios ?? obj.default },
    StyleSheet: { create: (s) => s, hairlineWidth: 0.5, absoluteFill: {}, absoluteFillObject: {} },
  };
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    loadEntries: jest.fn(),
    addEntry: jest.fn(),
    addLocalEntry: jest.fn(),
    deleteEntry: jest.fn(),
    updateLocalEntry: jest.fn(),
    replaceEntry: jest.fn(),
    updateRecordingStatus: jest.fn(),
    updateRecordingDuration: jest.fn(),
    completeRecording: jest.fn(),
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      loadSettings: jest.fn().mockResolvedValue(undefined),
      cloudMode: true,
    }),
  },
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: {
    getState: () => ({
      loadCommonTags: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/store/cloudSyncIndicatorStore', () => ({
  useCloudSyncIndicatorStore: {
    getState: () => ({
      refresh: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: {
    prewarmAudioSystem: jest.fn().mockResolvedValue(undefined),
    cancelRecording: jest.fn().mockResolvedValue(undefined),
    getRecordingDuration: jest.fn().mockResolvedValue(0),
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue({ uri: '', duration: 0, size: 0, mimeType: 'audio/m4a' }),
    saveVoiceToCache: jest.fn().mockResolvedValue(''),
    preloadAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
    savePhotoToCache: jest.fn(),
  },
}));

jest.mock('@/src/components/Timeline.v2', () => ({
  Timeline: 'Timeline',
}));

jest.mock('@/src/components/Sidebar', () => ({
  Sidebar: 'Sidebar',
}));

jest.mock('@/src/components/TextEditor', () => ({
  TextEditor: 'TextEditor',
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
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

jest.mock('@/src/services/photoIntegrityService', () => ({
  buildPhotoLogPayload: jest.fn(() => ({})),
  fingerprintPhotoFile: jest.fn(),
}));

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

import type { Entry } from '@/src/types/entry';
import {
  clearRecordingTimerForTest,
  assertCanStartVoiceRecordingForTest,
  readErrorCodeForTest,
  startCloudVoiceRecordingForTest,
  finalizeCloudVoiceRecordingForTest,
  type VoiceCloudStartDeps,
  type VoiceCloudFinalizeDeps,
} from '../index';

function toDisplayedRecordingDuration(duration: number): number {
  return Math.max(0, Math.floor(duration));
}

const PREPARED_VOICE_MEDIA = [
  {
    uri: 'file:///cache/final.m4a',
    mimeType: 'audio/m4a',
    size: 2048,
    duration: 12000,
  },
];

function makeStartDeps(overrides: Partial<VoiceCloudStartDeps> = {}): VoiceCloudStartDeps {
  return {
    now: () => 1774104000000,
    startRecording: jest.fn().mockResolvedValue(undefined),
    createLocalEntry: jest.fn().mockImplementation(async (entry) => ({
      id: '1774104000000_local',
      timestamp: 1774104000000,
      ...entry,
    })),
    ...overrides,
  };
}

function makeFinalizeDeps(overrides: Partial<VoiceCloudFinalizeDeps> = {}): VoiceCloudFinalizeDeps {
  return {
    stopRecording: jest.fn().mockResolvedValue({
      uri: 'file:///cache/recording.m4a',
      duration: 12,
      size: 2048,
      mimeType: 'audio/m4a',
    }),
    prepareVoiceEntryMedia: jest.fn().mockResolvedValue({
      media: PREPARED_VOICE_MEDIA,
      createdFiles: ['file:///cache/final.m4a'],
    }),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
    deleteEntry: jest.fn().mockResolvedValue(undefined),
    deleteLocalFile: jest.fn().mockResolvedValue(undefined),
    enqueueUpload: jest.fn(),
    preloadAudio: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('cloud voice recording helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts cloud recording before inserting temporary voice entry', async () => {
    const deps = makeStartDeps();

    const entry = await startCloudVoiceRecordingForTest(deps);

    expect(deps.startRecording).toHaveBeenCalledTimes(1);
    expect(deps.createLocalEntry).toHaveBeenCalledWith({
      type: 'voice',
      content: '',
      localReadyState: 'processing',
      recordingStatus: 'recording',
      recordingDuration: 0,
      syncStatus: 'pending_upload',
      media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
    });
    expect(entry).toMatchObject<Entry>({
      id: '1774104000000_local',
      type: 'voice',
      content: '',
      localReadyState: 'processing',
      recordingStatus: 'recording',
      recordingDuration: 0,
      syncStatus: 'pending_upload',
    });
  });

  it('keeps the same voice entry in processing while local voice preparation runs', async () => {
    let resolvePrepare!: (value: { media: typeof PREPARED_VOICE_MEDIA; createdFiles: string[] }) => void;
    const preparePromise = new Promise<{ media: typeof PREPARED_VOICE_MEDIA; createdFiles: string[] }>((resolve) => {
      resolvePrepare = resolve;
    });
    const deps = makeFinalizeDeps({
      prepareVoiceEntryMedia: jest.fn(() => preparePromise),
    });

    const finalizePromise = finalizeCloudVoiceRecordingForTest('temp-voice-processing', deps);

    await Promise.resolve();

    expect(deps.updateLocalEntry).toHaveBeenNthCalledWith(1, 'temp-voice-processing', {
      recordingStatus: 'stopping',
    });
    expect(deps.deleteEntry).not.toHaveBeenCalled();
    expect(deps.updateLocalEntry).not.toHaveBeenCalledWith('temp-voice-processing', expect.objectContaining({
      recordingStatus: 'completed',
    }));

    resolvePrepare({
      media: PREPARED_VOICE_MEDIA,
      createdFiles: ['file:///cache/final.m4a'],
    });

    await expect(finalizePromise).resolves.toBeUndefined();
  });

  it('marks the voice entry ready after saveVoiceToCache succeeds', async () => {
    const deps = makeFinalizeDeps();

    await finalizeCloudVoiceRecordingForTest('temp-voice-1', deps);

    expect(deps.prepareVoiceEntryMedia).toHaveBeenCalledWith('temp-voice-1', {
      uri: 'file:///cache/recording.m4a',
      duration: 12,
      size: 2048,
      mimeType: 'audio/m4a',
    });
    expect(deps.updateLocalEntry).toHaveBeenCalledWith('temp-voice-1', {
      recordingStatus: 'completed',
      localReadyState: 'ready',
      syncStatus: 'pending_upload',
      recordingDuration: 12,
      media: PREPARED_VOICE_MEDIA,
    });
    expect(deps.enqueueUpload).toHaveBeenCalledWith('temp-voice-1');
    expect(deps.preloadAudio).toHaveBeenCalledWith('file:///cache/final.m4a');
  });

  it('marks the local voice card as stopping before stopRecording resolves', async () => {
    let resolveStop!: (value: { uri: string; size: number; duration: number; mimeType: string }) => void;
    const stopPromise = new Promise<{ uri: string; size: number; duration: number; mimeType: string }>((resolve) => {
      resolveStop = resolve;
    });
    const deps = makeFinalizeDeps({
      stopRecording: jest.fn(() => stopPromise),
    });

    const finalizePromise = finalizeCloudVoiceRecordingForTest('temp-voice-stopping', deps);

    await Promise.resolve();

    expect(deps.updateLocalEntry).toHaveBeenNthCalledWith(1, 'temp-voice-stopping', {
      recordingStatus: 'stopping',
    });

    resolveStop({
      uri: 'file:///cache/recording.m4a',
      duration: 12,
      size: 2048,
      mimeType: 'audio/m4a',
    });

    await expect(finalizePromise).resolves.toBeUndefined();
  });

  it('deletes the voice entry instead of restoring recording when local preparation fails', async () => {
    const deps = makeFinalizeDeps({
      prepareVoiceEntryMedia: jest.fn().mockRejectedValue(Object.assign(new Error('cache down'), {
        createdFiles: ['file:///cache/final.m4a'],
      })),
    });

    await expect(finalizeCloudVoiceRecordingForTest('temp-voice-2', deps)).rejects.toThrow('cache down');

    expect(deps.deleteLocalFile).toHaveBeenCalledWith('file:///cache/final.m4a');
    expect(deps.deleteEntry).toHaveBeenCalledWith('temp-voice-2');
    expect(deps.updateLocalEntry).not.toHaveBeenCalledWith('temp-voice-2', {
      recordingStatus: 'recording',
    });
    expect(deps.enqueueUpload).not.toHaveBeenCalled();
  });

  it('clears active recording timer immediately', () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const timerRef = {
      current: setInterval(() => {}, 100),
    };

    clearRecordingTimerForTest(timerRef);

    expect(timerRef.current).toBeNull();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
    clearIntervalSpy.mockRestore();
  });

  it('publishes recording duration as whole seconds only', () => {
    expect(toDisplayedRecordingDuration(0)).toBe(0);
    expect(toDisplayedRecordingDuration(0.9)).toBe(0);
    expect(toDisplayedRecordingDuration(1.01)).toBe(1);
    expect(toDisplayedRecordingDuration(12.99)).toBe(12);
  });

  it('blocks starting a new recording while another one is active', () => {
    expect(() => assertCanStartVoiceRecordingForTest('active-voice-1')).toThrow('ACTIVE_RECORDING_IN_PROGRESS');

    try {
      assertCanStartVoiceRecordingForTest('active-voice-1');
    } catch (error) {
      expect((error as { code?: string }).code).toBe('ACTIVE_RECORDING_IN_PROGRESS');
    }
  });

  it('reads string error codes from unknown values only when present', () => {
    expect(readErrorCodeForTest({ code: 'PERMISSION_DENIED' })).toBe('PERMISSION_DENIED');
    expect(readErrorCodeForTest({ code: 123 })).toBeUndefined();
    expect(readErrorCodeForTest(new Error('no code'))).toBeUndefined();
    expect(readErrorCodeForTest(null)).toBeUndefined();
  });
});
