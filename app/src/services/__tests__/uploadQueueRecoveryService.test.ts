const mockFlushPendingPhotoUploads = jest.fn();
const mockFlushPendingVoiceUploads = jest.fn();

jest.mock('../photoUploadQueue', () => ({
  flushPendingPhotoUploads: () => mockFlushPendingPhotoUploads(),
}));

jest.mock('../voiceUploadQueue', () => ({
  flushPendingVoiceUploads: () => mockFlushPendingVoiceUploads(),
}));

import { createUploadQueueRecoveryService } from '../uploadQueueRecoveryService';

describe('uploadQueueRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flushes both pending upload queues through one entrypoint', async () => {
    mockFlushPendingPhotoUploads.mockResolvedValue(undefined);
    mockFlushPendingVoiceUploads.mockResolvedValue(undefined);

    const service = createUploadQueueRecoveryService();

    await service.flushPendingUploads();

    expect(mockFlushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockFlushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(mockFlushPendingVoiceUploads.mock.invocationCallOrder[0]).toBeLessThan(
      mockFlushPendingPhotoUploads.mock.invocationCallOrder[0]
    );
  });

  it('accepts injected queue flush dependencies', async () => {
    const flushPendingVoiceUploads = jest.fn(async () => undefined);
    const flushPendingPhotoUploads = jest.fn(async () => undefined);

    const service = createUploadQueueRecoveryService({
      flushPendingVoiceUploads,
      flushPendingPhotoUploads,
    });

    await service.flushPendingUploads();

    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
  });

  it('still attempts the photo queue when voice flushing throws synchronously', async () => {
    const voiceError = new Error('voice queue failed');
    const flushPendingVoiceUploads = jest.fn(() => {
      throw voiceError;
    });
    const flushPendingPhotoUploads = jest.fn(async () => undefined);

    const service = createUploadQueueRecoveryService({
      flushPendingVoiceUploads,
      flushPendingPhotoUploads,
    });

    await expect(service.flushPendingUploads()).resolves.toEqual({
      voiceError,
      photoError: null,
    });

    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
  });

  it('returns queue-specific errors when both queues fail', async () => {
    const voiceError = new Error('voice queue failed');
    const photoError = new Error('photo queue failed');

    const service = createUploadQueueRecoveryService({
      flushPendingVoiceUploads: jest.fn(async () => {
        throw voiceError;
      }),
      flushPendingPhotoUploads: jest.fn(async () => {
        throw photoError;
      }),
    });

    await expect(service.flushPendingUploads()).resolves.toEqual({
      voiceError,
      photoError,
    });
  });
});
