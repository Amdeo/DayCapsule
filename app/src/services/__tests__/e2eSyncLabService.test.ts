jest.mock('../showPhotoRepairPrompt', () => ({
  showPhotoRepairPrompt: jest.fn(),
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      setMediaValidationSummary: jest.fn(async () => undefined),
    }),
  },
}));

jest.mock('@/src/store/mediaRepairStore', () => ({
  useMediaRepairStore: {
    getState: () => ({
      replaceIssues: jest.fn(),
      clearIssues: jest.fn(),
    }),
  },
}));

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: {
    getState: () => ({
      entries: [],
      addLocalEntry: jest.fn(),
      deleteEntry: jest.fn(),
    }),
  },
}));

import { createE2ESyncLabService } from '../e2eSyncLabService';
import type { Entry } from '@/src/types/entry';

describe('e2eSyncLabService', () => {
  const mockSetMediaValidationSummary = jest.fn(async () => undefined);
  const mockReplaceIssues = jest.fn();
  const mockClearIssues = jest.fn();
  const mockAddLocalEntry = jest.fn();
  const mockDeleteEntry = jest.fn(async () => undefined);
  const mockPrepareFixturePhoto = jest.fn(async () => ({
    uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
    persistedHash: 'fixture-local-good-hash',
    size: 2048,
    width: 1200,
    height: 900,
  }));
  let mockEntries: Entry[] = [];

  const createService = () => createE2ESyncLabService({
    setMediaValidationSummary: mockSetMediaValidationSummary,
    replaceIssues: mockReplaceIssues,
    clearIssues: mockClearIssues,
    getEntries: () => mockEntries,
    addLocalEntry: mockAddLocalEntry,
    deleteEntry: mockDeleteEntry,
    prepareFixturePhoto: mockPrepareFixturePhoto,
    now: () => 1700000000000,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEntries = [];
  });

  it('reuses the dedicated photo fixture when injecting a suspect repairable media issue', async () => {
    mockEntries = [
      {
        id: 'entry-photo-1',
        type: 'photo',
        content: 'E2E Sync Lab Fixture',
        timestamp: 1700000000000,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
            remoteUri: 'https://cdn.example.com/e2e-sync-entry-1.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
            metadata: {
              localMediaId: 'e2e-sync-local-media-1',
              persistedHash: 'fixture-local-good-hash',
              createdAt: 1700000000000,
              modifiedAt: 1700000000000,
            },
          },
        ],
      },
    ];

    await createService().injectSuspectRepairable();

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(expect.objectContaining({
      status: 'partial',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 1,
      lastError: 'cloud hash mismatch while local original is still healthy',
      lastValidatedAt: 1700000000000,
    }));
    expect(mockReplaceIssues).toHaveBeenCalledWith([
      expect.objectContaining({
        entryId: 'entry-photo-1',
        localMediaId: 'e2e-sync-local-media-1',
        localUri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
        persistedHash: 'fixture-local-good-hash',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'cloud hash mismatch while local original is still healthy',
      }),
    ]);
    expect(mockAddLocalEntry).not.toHaveBeenCalled();
  });

  it('creates a local photo fixture entry when no photo entries exist before injecting suspect issue', async () => {
    mockAddLocalEntry.mockResolvedValueOnce({
      id: 'fixture-entry-1',
      type: 'photo',
      content: 'E2E Sync Lab Fixture',
      timestamp: 1700000000000,
      syncStatus: 'synced',
      media: [
        {
          uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'e2e-sync-local-media-1',
            persistedHash: 'fixture-local-good-hash',
            createdAt: 1700000000000,
            modifiedAt: 1700000000000,
          },
        },
      ],
    });

    await createService().injectSuspectRepairable();

    expect(mockAddLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      type: 'photo',
      syncStatus: 'pending_upload',
      syncOp: 'create',
      media: [
        expect.objectContaining({
          uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: expect.objectContaining({
            localMediaId: 'e2e-sync-local-media-1',
            persistedHash: 'fixture-local-good-hash',
          }),
        }),
      ],
    }));
    expect(mockReplaceIssues).toHaveBeenCalledWith([
      expect.objectContaining({
        entryId: 'fixture-entry-1',
        localMediaId: 'e2e-sync-local-media-1',
        localUri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
        persistedHash: 'fixture-local-good-hash',
      }),
    ]);
  });

  it('creates the dedicated photo fixture when only non-lab photos exist', async () => {
    mockEntries = [
      {
        id: 'user-photo-1',
        type: 'photo',
        content: '普通照片',
        timestamp: 1700000000000,
        syncStatus: 'synced',
        media: [
          {
            uri: 'file:///documents/media/photos/original/user-photo.jpg',
            remoteUri: 'https://cdn.example.com/user-photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            metadata: {
              localMediaId: 'user-local-media-1',
              createdAt: 1700000000000,
              modifiedAt: 1700000000000,
            },
          },
        ],
      },
    ];
    mockAddLocalEntry.mockResolvedValueOnce({
      id: 'fixture-entry-2',
      type: 'photo',
      content: 'E2E Sync Lab Fixture',
      timestamp: 1700000000000,
      syncStatus: 'pending_upload',
      syncOp: 'create',
      updatedAt: 1700000000000,
      deleted: false,
      media: [
        {
          uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'e2e-sync-local-media-1',
            persistedHash: 'fixture-local-good-hash',
            createdAt: 1700000000000,
            modifiedAt: 1700000000000,
          },
        },
      ],
    });

    await createService().injectSuspectRepairable();

    expect(mockAddLocalEntry).toHaveBeenCalledTimes(1);
    expect(mockReplaceIssues).toHaveBeenCalledWith([
      expect.objectContaining({
        entryId: 'fixture-entry-2',
        localMediaId: 'e2e-sync-local-media-1',
      }),
    ]);
  });

  it('injects a repair pending fixture without repairable issues', async () => {
    await createService().injectRepairPending();

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith(expect.objectContaining({
      status: 'partial',
      total: 1,
      downloaded: 1,
      missing: 0,
      failed: 0,
      suspect: 1,
      repairable: 0,
      lastError: 'waiting for sync confirmation after user-approved repair',
      lastValidatedAt: 1700000000000,
    }));
    expect(mockClearIssues).toHaveBeenCalledTimes(1);
  });

  it('creates a local text fixture entry when no text entries exist before injecting text detail fixture', async () => {
    mockAddLocalEntry.mockResolvedValueOnce({
      id: 'fixture-text-entry-1',
      type: 'text',
      content: 'E2E Sync Lab Text Detail Fixture',
      timestamp: 1700000000000,
      syncStatus: 'pending_upload',
      syncOp: 'create',
      updatedAt: 1700000000000,
      deleted: false,
      tags: ['e2e-sync-lab', 'detail'],
    });

    await createService().injectTextDetailFixture();

    expect(mockAddLocalEntry).toHaveBeenCalledWith(expect.objectContaining({
      type: 'text',
      content: 'E2E Sync Lab Text Detail Fixture',
      syncStatus: 'pending_upload',
      syncOp: 'create',
      updatedAt: 1700000000000,
      deleted: false,
      tags: ['e2e-sync-lab', 'detail'],
    }));
    expect(mockSetMediaValidationSummary).not.toHaveBeenCalled();
    expect(mockReplaceIssues).not.toHaveBeenCalled();
  });

  it('reuses the existing injected text fixture instead of creating duplicates', async () => {
    mockAddLocalEntry.mockResolvedValueOnce({
      id: 'fixture-text-entry-1',
      type: 'text',
      content: 'E2E Sync Lab Text Detail Fixture',
      timestamp: 1700000000000,
      syncStatus: 'pending_upload',
      syncOp: 'create',
      updatedAt: 1700000000000,
      deleted: false,
      tags: ['e2e-sync-lab', 'detail'],
    });

    const service = createService();

    await service.injectTextDetailFixture();
    mockEntries = [
      {
        id: 'fixture-text-entry-1',
        type: 'text',
        content: 'E2E Sync Lab Text Detail Fixture',
        timestamp: 1700000000000,
        syncStatus: 'pending_upload',
        syncOp: 'create',
        updatedAt: 1700000000000,
        deleted: false,
        tags: ['e2e-sync-lab', 'detail'],
      },
    ];

    await service.injectTextDetailFixture();

    expect(mockAddLocalEntry).toHaveBeenCalledTimes(1);
  });

  it('clears injected fixtures back to the idle summary', async () => {
    await createService().clearFixtures();

    expect(mockSetMediaValidationSummary).toHaveBeenCalledWith({
      status: 'idle',
      total: 0,
      downloaded: 0,
      missing: 0,
      failed: 0,
      suspect: 0,
      repairable: 0,
      lastError: null,
      lastValidatedAt: null,
    });
    expect(mockClearIssues).toHaveBeenCalledTimes(1);
    expect(mockDeleteEntry).not.toHaveBeenCalled();
  });

  it('removes the injected text fixture when clearing fixtures', async () => {
    const createdEntry = {
      id: 'fixture-text-entry-1',
      type: 'text',
      content: 'E2E Sync Lab Text Detail Fixture',
      timestamp: 1700000000000,
      syncStatus: 'pending_upload',
      syncOp: 'create',
      updatedAt: 1700000000000,
      deleted: false,
      tags: ['e2e-sync-lab', 'detail'],
    };
    mockAddLocalEntry.mockImplementationOnce(async () => {
      mockEntries = [createdEntry];
      return createdEntry;
    });

    const service = createService();

    await service.injectTextDetailFixture();
    await service.clearFixtures();

    expect(mockDeleteEntry).toHaveBeenCalledWith('fixture-text-entry-1');
  });

  it('clears an existing text fixture even when the tracked id was reset', async () => {
    mockEntries = [
      {
        id: 'fixture-text-entry-2',
        type: 'text',
        content: 'E2E Sync Lab Text Detail Fixture',
        timestamp: 1700000000000,
        syncStatus: 'pending_upload',
        syncOp: 'create',
        updatedAt: 1700000000000,
        deleted: false,
        tags: ['e2e-sync-lab', 'detail'],
      },
    ];

    await createService().clearFixtures();

    expect(mockDeleteEntry).toHaveBeenCalledWith('fixture-text-entry-2');
  });

  it('clears an existing photo fixture even when the tracked id was reset', async () => {
    mockEntries = [
      {
        id: 'fixture-photo-entry-2',
        type: 'photo',
        content: 'E2E Sync Lab Fixture',
        timestamp: 1700000000000,
        syncStatus: 'pending_upload',
        syncOp: 'create',
        updatedAt: 1700000000000,
        deleted: false,
        media: [
          {
            uri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.jpg',
            mimeType: 'image/jpeg',
            size: 2048,
            metadata: {
              localMediaId: 'e2e-sync-local-media-1',
              persistedHash: 'fixture-local-good-hash',
              createdAt: 1700000000000,
              modifiedAt: 1700000000000,
            },
          },
        ],
      },
    ];

    await createService().clearFixtures();

    expect(mockDeleteEntry).toHaveBeenCalledWith('fixture-photo-entry-2');
  });
});
