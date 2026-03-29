import type { MediaInfo } from '@/src/types/entry';
import type { AudioFile } from '@/src/services/voiceService';
import { VoiceService } from '@/src/services/voiceService';

export interface PreparedVoiceEntryMedia {
  media: MediaInfo[];
  createdFiles: string[];
}

export interface VoiceEntryPreparationError extends Error {
  createdFiles?: string[];
}

export interface PrepareVoiceEntryMediaDeps {
  saveVoiceToCache: typeof VoiceService.saveVoiceToCache;
}

const defaultDeps: PrepareVoiceEntryMediaDeps = {
  saveVoiceToCache: VoiceService.saveVoiceToCache.bind(VoiceService),
};

const inFlightPreparations = new Map<string, Promise<PreparedVoiceEntryMedia>>();

export async function prepareVoiceEntryMedia(
  entryId: string,
  audioFile: AudioFile,
  deps: PrepareVoiceEntryMediaDeps = defaultDeps
): Promise<PreparedVoiceEntryMedia> {
  const existing = inFlightPreparations.get(entryId);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    const persistedUri = await deps.saveVoiceToCache(audioFile.uri, entryId);

    return {
      media: [
        {
          uri: persistedUri,
          mimeType: audioFile.mimeType,
          size: audioFile.size,
          duration: Math.floor(audioFile.duration * 1000),
        },
      ],
      createdFiles: [persistedUri],
    };
  })();

  inFlightPreparations.set(entryId, task);

  try {
    return await task;
  } finally {
    if (inFlightPreparations.get(entryId) === task) {
      inFlightPreparations.delete(entryId);
    }
  }
}
