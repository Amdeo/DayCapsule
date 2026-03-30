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
  return {
    async flushPendingUploads(): Promise<void> {
      let firstError: unknown = null;

      await deps.flushPendingVoiceUploads().catch((error) => {
        firstError = firstError ?? error;
      });

      await deps.flushPendingPhotoUploads().catch((error) => {
        firstError = firstError ?? error;
      });

      if (firstError) {
        throw firstError;
      }
    },
  };
}
