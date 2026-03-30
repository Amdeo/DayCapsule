const mockFlushPendingPhotoUploads = jest.fn();
const mockFlushPendingVoiceUploads = jest.fn();

jest.mock('../photoUploadQueue', () => ({
  flushPendingPhotoUploads: () => mockFlushPendingPhotoUploads(),
}));

jest.mock('../voiceUploadQueue', () => ({
  flushPendingVoiceUploads: () => mockFlushPendingVoiceUploads(),
}));

import { recoverPendingUploadQueues } from '../uploadQueueRecoveryService';

describe('uploadQueueRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flushes both pending upload queues', async () => {
    mockFlushPendingPhotoUploads.mockResolvedValue(undefined);
    mockFlushPendingVoiceUploads.mockResolvedValue(undefined);

    await recoverPendingUploadQueues();

    expect(mockFlushPendingPhotoUploads).toHaveBeenCalledTimes(1);
    expect(mockFlushPendingVoiceUploads).toHaveBeenCalledTimes(1);
  });
});
