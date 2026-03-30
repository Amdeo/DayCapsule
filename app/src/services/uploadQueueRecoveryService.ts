import { flushPendingPhotoUploads } from './photoUploadQueue';
import { flushPendingVoiceUploads } from './voiceUploadQueue';

export interface UploadQueueRecoveryServiceDeps {
  flushPendingVoiceUploads: () => Promise<void>;
  flushPendingPhotoUploads: () => Promise<void>;
}

export interface UploadQueueRecoveryResult {
  voiceError: unknown | null;
  photoError: unknown | null;
}

const defaultDeps: UploadQueueRecoveryServiceDeps = {
  flushPendingVoiceUploads,
  flushPendingPhotoUploads,
};

export function createUploadQueueRecoveryService(
  deps: UploadQueueRecoveryServiceDeps = defaultDeps
) {
  const captureFirstError = async (
    operation: () => Promise<void>,
    onError: (error: unknown) => void
  ) => {
    try {
      await operation();
    } catch (error) {
      onError(error);
    }
  };

  return {
    async flushPendingUploads(): Promise<UploadQueueRecoveryResult> {
      const result: UploadQueueRecoveryResult = {
        voiceError: null,
        photoError: null,
      };

      await captureFirstError(deps.flushPendingVoiceUploads, (error) => {
        result.voiceError = error;
      });

      await captureFirstError(deps.flushPendingPhotoUploads, (error) => {
        result.photoError = error;
      });

      return result;
    },
  };
}
