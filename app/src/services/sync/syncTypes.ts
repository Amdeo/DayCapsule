/**
 * 云同步私有类型定义
 * 仅供 cloudSyncService 及其子模块内部使用
 */

import type { Entry } from '@/src/types/entry';
import type { InitialSyncState } from '@/src/store/syncStore';

export interface SyncStatus {
  lastSyncAt: number | null;
  lastSyncError: string | null;
  initialSyncState: InitialSyncState;
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
  conflictCopies: number;
}

export interface SyncServiceApi {
  syncNow: () => Promise<void>;
  getStatus: () => Promise<SyncStatus>;
}

export type ServerEntryPayload = {
  id: string;
  type: Entry['type'];
  content?: string;
  tags?: string[] | string | null;
  media?: Entry['media'] | string | null;
  recordingStatus?: Entry['recordingStatus'] | null;
  recordingDuration?: number | null;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: Entry['syncStatus'] | null;
  userId?: string | null;
};

export type ServerChangePayload = {
  changeId: number;
  op: 'create' | 'update' | 'delete';
  entry: ServerEntryPayload;
};

export type ConflictPayload = {
  changeId: string;
  entryId: string;
  reason: string;
  serverEntry: ServerEntryPayload;
  clientEntry: ServerEntryPayload;
};

export type SyncResponsePayload = {
  newCursor: number;
  results: SyncResult[];
  serverChanges: ServerChangePayload[];
  conflicts: ConflictPayload[];
};

export type SyncResult = {
  changeId: string;
  status: 'applied' | 'conflicted' | 'ignored';
  entryId: string;
};
