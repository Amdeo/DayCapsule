import type { Entry } from '@/src/types/entry';

export const buildPendingInsertEntry = (
  entry: Omit<Entry, 'id' | 'timestamp'>,
  cloudMode: boolean
): Omit<Entry, 'id' | 'timestamp'> => {
  if (!cloudMode) {
    return {
      ...entry,
      syncStatus: 'synced',
      syncOp: entry.syncOp ?? 'update',
    };
  }

  return {
    ...entry,
    syncStatus:
      entry.syncStatus === 'pending_upload' ||
      entry.syncStatus === 'uploading' ||
      entry.syncStatus === 'pending_delete'
        ? entry.syncStatus
        : 'pending',
    syncOp: entry.syncOp ?? 'create',
    updatedAt: entry.updatedAt ?? Date.now(),
    baseUpdatedAt: entry.baseUpdatedAt ?? entry.updatedAt,
  };
};

export const buildPendingUpdate = (
  updates: Partial<Entry>,
  cloudMode: boolean
): Partial<Entry> => {
  if (!cloudMode) {
    return {
      ...updates,
      syncStatus: updates.syncStatus ? 'synced' : updates.syncStatus,
      syncOp: updates.syncOp ?? 'update',
    };
  }

  if (
    updates.syncStatus === 'pending_upload' ||
    updates.syncStatus === 'uploading' ||
    updates.syncStatus === 'pending_delete'
  ) {
    return {
      ...updates,
      updatedAt: updates.updatedAt ?? Date.now(),
      baseUpdatedAt: updates.baseUpdatedAt ?? updates.updatedAt,
    };
  }

  return {
    ...updates,
    syncStatus: updates.syncStatus ?? 'pending',
    syncOp: updates.syncOp ?? 'update',
    updatedAt: updates.updatedAt ?? Date.now(),
    baseUpdatedAt: updates.baseUpdatedAt ?? updates.updatedAt,
  };
};
