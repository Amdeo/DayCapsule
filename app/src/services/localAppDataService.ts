import * as DB from '@/src/database/operations';
import { clearDirectory, getMediaPaths } from '@/src/utils/fileSystem';

export const clearLocalAppData = async (): Promise<void> => {
  const mediaPaths = getMediaPaths();

  await Promise.all([
    clearDirectory(mediaPaths.photoOriginal),
    clearDirectory(mediaPaths.photoDisplay),
    clearDirectory(mediaPaths.photoThumbnail),
    clearDirectory(mediaPaths.voiceOriginal),
    clearDirectory(mediaPaths.voiceCompressed),
    clearDirectory(mediaPaths.temp),
  ]);

  await DB.clearAllEntries();
};
