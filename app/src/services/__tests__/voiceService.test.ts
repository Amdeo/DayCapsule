jest.mock('expo-audio', () => {
  const soundInstance = {
    isLoaded: true,
    playing: false,
    currentTime: 0,
    duration: 12,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  };
  const recorderInstance = {
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn(() => ({
      canRecord: true,
      isRecording: true,
      durationMillis: 1000,
      url: 'file:///tmp/test.m4a',
    })),
    uri: 'file:///tmp/test.m4a',
  };
  return {
    AudioModule: {
      AudioRecorder: jest.fn(() => recorderInstance),
    },
    createAudioPlayer: jest.fn(() => soundInstance),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    getRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    RecordingPresets: {
      HIGH_QUALITY: {},
    },
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  MEDIA_PATHS: { voiceOriginal: 'file:///documents/media/voice/original/' },
  getFileInfo: jest.fn(),
  deleteFile: jest.fn(),
  copyFile: jest.fn(),
  generateUniqueFilename: jest.fn(),
}));

jest.mock('../mediaCacheService', () => ({
  MediaCacheService: {
    isRemoteUri: (uri?: string) => !!uri && /^https?:\/\//.test(uri ?? ''),
    normalizeRemoteUri: (uri: string) => uri.replace(/^http:\/\/localhost(?=[:/])/i, 'http://10.0.2.2'),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { VoiceService } from '../voiceService';
import { getFileInfo } from '@/src/utils/fileSystem';
import { AudioModule } from 'expo-audio';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('VoiceService remote audio handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rewrites localhost media URLs to 10.0.2.2 on Android', () => {
    expect(
      VoiceService.resolveAudioUri('http://localhost:3000/api/media/test-audio-id')
    ).toBe('http://10.0.2.2:3000/api/media/test-audio-id');
  });

  it('keeps local file resolution behavior for persisted voice files', () => {
    expect(
      VoiceService.resolveAudioUri('foo.m4a')
    ).toBe('file:///documents/media/voice/original/foo.m4a');
  });

  it('preloadAudio skips local file existence check for remote URLs', async () => {
    await VoiceService.preloadAudio('http://localhost:3000/api/media/test-audio-id');

    expect(getFileInfo).not.toHaveBeenCalled();
  });
});

describe('VoiceService stop recording immediacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFileInfo as jest.Mock).mockResolvedValue({ size: 2048 });
  });

  it('returns 0 duration while stopRecording is still finalizing', async () => {
    const deferred = createDeferred<{ size: number }>();
    (getFileInfo as jest.Mock).mockReturnValueOnce(deferred.promise);

    await VoiceService.startRecording();

    const stopPromise = VoiceService.stopRecording();

    await Promise.resolve();
    await expect(VoiceService.getRecordingDuration()).resolves.toBe(0);

    deferred.resolve({ size: 2048 });
    await expect(stopPromise).resolves.toMatchObject({
      uri: 'file:///tmp/test.m4a',
      size: 2048,
      duration: 1,
      mimeType: 'audio/m4a',
    });
  });

  it('finalizes recording when recorder is already stopped but the file uri exists', async () => {
    await VoiceService.startRecording();
    const recorder = (AudioModule.AudioRecorder as jest.Mock).mock.results[0].value;

    recorder.getStatus.mockReturnValue({
      canRecord: false,
      isRecording: false,
      durationMillis: 2400,
      url: 'file:///tmp/test.m4a',
    });

    await expect(VoiceService.stopRecording()).resolves.toMatchObject({
      uri: 'file:///tmp/test.m4a',
      size: 2048,
      duration: 2.4,
      mimeType: 'audio/m4a',
    });
    expect(recorder.stop).not.toHaveBeenCalled();
  });
});
