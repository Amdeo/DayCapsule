import { flushPendingPhotoUploads } from './photoUploadQueue';
import { flushPendingVoiceUploads } from './voiceUploadQueue';

export async function recoverPendingUploadQueues(): Promise<void> {
  await flushPendingPhotoUploads();
  await flushPendingVoiceUploads();
}
