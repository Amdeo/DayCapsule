import * as FileSystem from 'expo-file-system/legacy';

import type { MediaRepairIssue } from '@/src/services/cloudMediaSyncService';
import {
  fingerprintPhotoFile,
  type PhotoFileFingerprint,
} from '@/src/services/photoIntegrityService';
import { useEntryStore } from '@/src/store/entryStore';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import {
  useSyncStore,
  type MediaSyncValidationSummary,
} from '@/src/store/syncStore';
import type { Entry } from '@/src/types/entry';

const REPAIR_PROMPT_REASON = 'cloud hash mismatch while local original is still healthy';
const REPAIR_PENDING_REASON = 'waiting for sync confirmation after user-approved repair';
const E2E_FIXTURE_LOCAL_MEDIA_ID = 'e2e-sync-local-media-1';
const E2E_FIXTURE_FILENAME = 'e2e-sync-entry-1.png';
const E2E_PHOTO_FIXTURE_CONTENT = 'E2E Sync Lab Fixture';
const E2E_TEXT_FIXTURE_CONTENT = 'E2E Sync Lab Text Detail Fixture';
const E2E_TEXT_FIXTURE_TAGS = ['e2e-sync-lab', 'detail'];

const IDLE_MEDIA_VALIDATION_SUMMARY: MediaSyncValidationSummary = {
  status: 'idle',
  total: 0,
  downloaded: 0,
  missing: 0,
  failed: 0,
  suspect: 0,
  repairable: 0,
  lastError: null,
  lastValidatedAt: null,
};

type PreparedFixturePhoto = {
  uri: string;
  persistedHash: string;
  size: number;
  width: number;
  height: number;
};

export interface E2ESyncLabServiceDeps {
  setMediaValidationSummary: (summary: MediaSyncValidationSummary) => Promise<void>;
  replaceIssues: (issues: MediaRepairIssue[]) => void;
  clearIssues: () => void;
  getEntries: () => Entry[];
  addLocalEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
  prepareFixturePhoto: () => Promise<PreparedFixturePhoto>;
  now: () => number;
}

export interface E2ESyncLabService {
  injectSuspectRepairable: () => Promise<void>;
  injectRepairPending: () => Promise<void>;
  injectTextDetailFixture: () => Promise<void>;
  clearFixtures: () => Promise<void>;
}

function getFixtureFileUri(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('E2E Sync Lab requires FileSystem.documentDirectory');
  }

  return `${FileSystem.documentDirectory}e2e-sync-lab/${E2E_FIXTURE_FILENAME}`;
}

async function prepareDefaultFixturePhoto(): Promise<PreparedFixturePhoto> {
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  const fixtureUri = getFixtureFileUri();
  const fixtureDir = fixtureUri.slice(0, fixtureUri.lastIndexOf('/') + 1);
  const asset = Asset.fromModule(require('../../assets/images/icon.png'));
  await asset.downloadAsync();
  const assetUri = asset.localUri ?? asset.uri;

  if (!assetUri) {
    throw new Error('E2E Sync Lab fixture asset failed to resolve');
  }

  await FileSystem.makeDirectoryAsync(fixtureDir, { intermediates: true });
  await FileSystem.deleteAsync(fixtureUri, { idempotent: true });
  await FileSystem.copyAsync({
    from: assetUri,
    to: fixtureUri,
  });

  const fingerprint: PhotoFileFingerprint = await fingerprintPhotoFile(fixtureUri);
  return {
    uri: fixtureUri,
    persistedHash: fingerprint.sha256,
    size: fingerprint.size,
    width: fingerprint.width,
    height: fingerprint.height,
  };
}

function findPhotoFixtureEntry(entries: Entry[]): Entry | null {
  return entries.find((entry) =>
    entry.type === 'photo'
    && !entry.deleted
    && entry.content === E2E_PHOTO_FIXTURE_CONTENT
    && Array.isArray(entry.media)
    && entry.media.some((media) => media.metadata?.localMediaId === E2E_FIXTURE_LOCAL_MEDIA_ID)
  ) ?? null;
}

function findTextFixtureEntry(entries: Entry[]): Entry | null {
  return entries.find((entry) =>
    entry.type === 'text'
    && !entry.deleted
    && entry.content === E2E_TEXT_FIXTURE_CONTENT
    && E2E_TEXT_FIXTURE_TAGS.every((tag) => entry.tags?.includes(tag))
  ) ?? null;
}

function buildFixtureEntry(
  photo: PreparedFixturePhoto,
  now: number,
): Omit<Entry, 'id' | 'timestamp'> {
  return {
    type: 'photo',
    content: E2E_PHOTO_FIXTURE_CONTENT,
    media: [
      {
        uri: photo.uri,
        mimeType: 'image/jpeg',
        size: photo.size,
        metadata: {
          localMediaId: E2E_FIXTURE_LOCAL_MEDIA_ID,
          sourceHash: photo.persistedHash,
          persistedHash: photo.persistedHash,
          width: photo.width,
          height: photo.height,
          createdAt: now,
          modifiedAt: now,
        },
      },
    ],
    syncStatus: 'pending_upload',
    syncOp: 'create',
    updatedAt: now,
    deleted: false,
  };
}

async function ensureRepairTargetEntry(
  deps: E2ESyncLabServiceDeps,
  photo: PreparedFixturePhoto,
): Promise<Entry> {
  const existing = findPhotoFixtureEntry(deps.getEntries());
  if (existing) {
    return existing;
  }

  return deps.addLocalEntry(buildFixtureEntry(photo, deps.now()));
}

function buildTextFixtureEntry(now: number): Omit<Entry, 'id' | 'timestamp'> {
  return {
    type: 'text',
    content: E2E_TEXT_FIXTURE_CONTENT,
    tags: E2E_TEXT_FIXTURE_TAGS,
    syncStatus: 'pending_upload',
    syncOp: 'create',
    updatedAt: now,
    deleted: false,
  };
}

async function ensureTextFixtureEntry(
  deps: E2ESyncLabServiceDeps,
): Promise<Entry> {
  const existing = findTextFixtureEntry(deps.getEntries());
  if (existing) {
    return existing;
  }

  return deps.addLocalEntry(buildTextFixtureEntry(deps.now()));
}

function buildSuspectRepairableIssue(
  entry: Entry,
  photo: PreparedFixturePhoto,
): MediaRepairIssue {
  const media = entry.media?.[0];

  return {
    entryId: entry.id,
    mediaIndex: 0,
    localMediaId: media?.metadata?.localMediaId ?? E2E_FIXTURE_LOCAL_MEDIA_ID,
    localUri: photo.uri,
    remoteUri: media?.remoteUri ?? 'https://cdn.example.com/e2e-sync-entry-1.jpg',
    persistedHash: photo.persistedHash,
    remoteHash: 'e2e-remote-bad-hash',
    downloadedHash: 'e2e-downloaded-bad-hash',
    integrityStatus: 'repair_prompt_required',
    integrityReason: REPAIR_PROMPT_REASON,
  };
}

export function createE2ESyncLabService(
  deps?: Partial<E2ESyncLabServiceDeps>
): E2ESyncLabService {
  const resolvedDeps: E2ESyncLabServiceDeps = {
    setMediaValidationSummary: deps?.setMediaValidationSummary
      ?? ((summary) => useSyncStore.getState().setMediaValidationSummary(summary)),
    replaceIssues: deps?.replaceIssues
      ?? ((issues) => useMediaRepairStore.getState().replaceIssues(issues)),
    clearIssues: deps?.clearIssues
      ?? (() => useMediaRepairStore.getState().clearIssues()),
    getEntries: deps?.getEntries ?? (() => useEntryStore.getState().entries),
    addLocalEntry: deps?.addLocalEntry
      ?? ((entry) => useEntryStore.getState().addLocalEntry(entry)),
    deleteEntry: deps?.deleteEntry
      ?? ((id) => useEntryStore.getState().deleteEntry(id)),
    prepareFixturePhoto: deps?.prepareFixturePhoto ?? prepareDefaultFixturePhoto,
    now: deps?.now ?? (() => Date.now()),
  };

  const injectSuspectRepairable = async (): Promise<void> => {
    const preparedPhoto = await resolvedDeps.prepareFixturePhoto();
    const repairTargetEntry = await ensureRepairTargetEntry(resolvedDeps, preparedPhoto);

    await resolvedDeps.setMediaValidationSummary({
      status: 'partial',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 1,
      lastError: REPAIR_PROMPT_REASON,
      lastValidatedAt: resolvedDeps.now(),
    });
    resolvedDeps.replaceIssues([buildSuspectRepairableIssue(repairTargetEntry, preparedPhoto)]);
  };

  const injectRepairPending = async (): Promise<void> => {
    await resolvedDeps.setMediaValidationSummary({
      status: 'partial',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 0,
      lastError: REPAIR_PENDING_REASON,
      lastValidatedAt: resolvedDeps.now(),
    });
    resolvedDeps.clearIssues();
  };

  const injectTextDetailFixture = async (): Promise<void> => {
    await ensureTextFixtureEntry(resolvedDeps);
  };

  const clearFixtures = async (): Promise<void> => {
    await resolvedDeps.setMediaValidationSummary(IDLE_MEDIA_VALIDATION_SUMMARY);
    resolvedDeps.clearIssues();

    const existingPhotoFixture = findPhotoFixtureEntry(resolvedDeps.getEntries());
    if (existingPhotoFixture) {
      await resolvedDeps.deleteEntry(existingPhotoFixture.id);
    }

    const existingTextFixture = findTextFixtureEntry(resolvedDeps.getEntries());
    if (existingTextFixture) {
      await resolvedDeps.deleteEntry(existingTextFixture.id);
    }
  };

  return {
    injectSuspectRepairable,
    injectRepairPending,
    injectTextDetailFixture,
    clearFixtures,
  };
}
