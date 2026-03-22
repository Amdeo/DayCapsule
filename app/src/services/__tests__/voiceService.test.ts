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
