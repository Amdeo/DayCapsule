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
  startCloudVoiceRecordingForTest,
  finalizeCloudVoiceRecordingForTest,
  toDisplayedRecordingDurationForTest,
  type VoiceCloudStartDeps,
  type VoiceCloudFinalizeDeps,
} from '../index';

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
    saveVoiceToCache: jest.fn().mockResolvedValue('file:///cache/final.m4a'),
    updateLocalEntry: jest.fn().mockResolvedValue(undefined),
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
      recordingStatus: 'recording',
      recordingDuration: 0,
      syncStatus: 'pending_upload',
      media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
    });
    expect(entry).toMatchObject<Entry>({
      id: '1774104000000_local',
      type: 'voice',
      content: '',
      recordingStatus: 'recording',
      recordingDuration: 0,
      syncStatus: 'pending_upload',
    });
  });

  it('finalizes cloud recording by persisting cache file locally and enqueueing upload', async () => {
    const deps = makeFinalizeDeps();

    await finalizeCloudVoiceRecordingForTest('temp-voice-1', deps);

    expect(deps.saveVoiceToCache).toHaveBeenCalledWith('file:///cache/recording.m4a', 'temp-voice-1');
    expect(deps.updateLocalEntry).toHaveBeenCalledWith('temp-voice-1', {
      recordingStatus: 'completed',
      syncStatus: 'pending_upload',
      recordingDuration: 12,
      media: [
        {
          uri: 'file:///cache/final.m4a',
          mimeType: 'audio/m4a',
          size: 2048,
          duration: 12000,
        },
      ],
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

  it('keeps the local voice card when enqueueing background upload fails', async () => {
    const deps = makeFinalizeDeps({
      enqueueUpload: jest.fn(() => {
        throw new Error('queue down');
      }),
    });

    await expect(finalizeCloudVoiceRecordingForTest('temp-voice-2', deps)).resolves.toBeUndefined();

    expect(deps.updateLocalEntry).toHaveBeenCalledWith('temp-voice-2', {
      recordingStatus: 'completed',
      syncStatus: 'pending_upload',
      recordingDuration: 12,
      media: [
        {
          uri: 'file:///cache/final.m4a',
          mimeType: 'audio/m4a',
          size: 2048,
          duration: 12000,
        },
      ],
    });
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
    expect(toDisplayedRecordingDurationForTest(0)).toBe(0);
    expect(toDisplayedRecordingDurationForTest(0.9)).toBe(0);
    expect(toDisplayedRecordingDurationForTest(1.01)).toBe(1);
    expect(toDisplayedRecordingDurationForTest(12.99)).toBe(12);
  });

  it('blocks starting a new recording while another one is active', () => {
    expect(() => assertCanStartVoiceRecordingForTest('active-voice-1')).toThrow('ACTIVE_RECORDING_IN_PROGRESS');

    try {
      assertCanStartVoiceRecordingForTest('active-voice-1');
    } catch (error) {
      expect((error as { code?: string }).code).toBe('ACTIVE_RECORDING_IN_PROGRESS');
    }
  });
});
