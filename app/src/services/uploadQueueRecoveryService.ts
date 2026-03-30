import { flushPendingPhotoUploads } from './photoUploadQueue';
import { flushPendingVoiceUploads } from './voiceUploadQueue';

export interface UploadQueueRecoveryServiceDeps {
  flushPendingVoiceUploads: () => Promise<void>;
  flushPendingPhotoUploads: () => Promise<void>;
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
    async flushPendingUploads(): Promise<void> {
      let firstError: unknown = null;

      await captureFirstError(deps.flushPendingVoiceUploads, (error) => {
        firstError = firstError ?? error;
      });

      await captureFirstError(deps.flushPendingPhotoUploads, (error) => {
        firstError = firstError ?? error;
      });

      if (firstError) {
        throw firstError;
      }
    },
  };
}
