import type { Entry } from '@/src/types/entry';
import { localDataSource } from '@/src/database/dataSource';
import { deleteFile } from '@/src/utils/fileSystem';
import { logger } from '@/src/utils/logger';

export const removeBrokenRecordingEntries = async (page: Entry[]): Promise<Entry[]> => {
  const cleaned: Entry[] = [];

  for (const entry of page) {
    if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'paused') {
      try {
        await localDataSource.deleteEntry(entry.id);
        logger.log('🧹 清理无效录音:', entry.id);
        continue;
      } catch {
        // 如果删除失败，保留原 entry，避免静默丢数据
      }
    }

    cleaned.push(entry);
  }

  return cleaned;
};

export const getLocalMediaFileUris = (entry?: Entry): string[] =>
  Array.from(
    new Set(
      (entry?.media ?? []).flatMap((media) =>
        [media.uri, media.thumbnail].filter((uri): uri is string => Boolean(uri))
      )
    )
  );

export const deleteLocalMediaFiles = async (entry?: Entry): Promise<void> => {
  for (const uri of getLocalMediaFileUris(entry)) {
    await deleteFile(uri).catch(() => {});
  }
};
