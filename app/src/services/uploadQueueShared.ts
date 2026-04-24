/**
 * Shared upload queue primitives used by photoUploadQueue and voiceUploadQueue.
 * Full generic factory extraction is deferred to a future dedicated refactor.
 */

export const RETRY_BACKOFF_MS = [15_000, 30_000, 60_000, 120_000] as const;

export function consumeCanceledEntry(canceled: Set<string>, entryId: string): boolean {
  if (!canceled.has(entryId)) {
    return false;
  }
  canceled.delete(entryId);
  return true;
}
