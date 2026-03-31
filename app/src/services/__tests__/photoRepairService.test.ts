jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/database/operations', () => ({
  getEntryById: jest.fn(),
  updateEntry: jest.fn(),
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    uploadFile: jest.fn(),
  })),
}));

jest.mock('@/src/services/cloudSyncService', () => ({
  createCloudSyncService: jest.fn(() => ({
    syncNow: jest.fn(),
  })),
}));

jest.mock('@/src/services/photoIntegrityService', () => ({
  buildPhotoLogPayload: jest.fn((payload: unknown) => payload),
  fingerprintPhotoFile: jest.fn(),
}));

import { createPhotoRepairService } from '../photoRepairService';
import type { MediaRepairIssue } from '../cloudMediaSyncService';
import { logger } from '@/src/utils/logger';

describe('photoRepairService', () => {
  const issue: MediaRepairIssue = {
    entryId: 'entry-1',
    mediaIndex: 0,
    localMediaId: 'local-1',
    localUri: 'file:///documents/media/photos/original/photo-1.jpg',
    remoteUri: 'https://cdn.example.com/photo-1.jpg',
    persistedHash: 'local-good',
    remoteHash: 'remote-bad',
    downloadedHash: 'remote-bad',
    integrityStatus: 'repair_prompt_required',
    integrityReason: 'cloud hash mismatch while local original is still healthy',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-uploads the healthy local source and marks the entry pending sync when the user confirms repair', async () => {
    const mockGetEntryById = jest.fn().mockResolvedValue({
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      updatedAt: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: issue.localUri,
          remoteUri: issue.remoteUri,
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'local-1',
            persistedHash: 'local-good',
            remoteHash: 'remote-bad',
            integrityStatus: 'repair_prompt_required',
            repairable: true,
            createdAt: 1,
            modifiedAt: 1,
          },
        },
      ],
    });
    const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);
    const mockUploadFile = jest.fn().mockResolvedValue({
      id: 'media-new',
      url: '/api/media/media-new',
      remoteHash: 'sha256-new',
      validationStatus: 'healthy',
      validationError: null,
    });
    const mockSyncNow = jest.fn().mockResolvedValue(undefined);
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'local-good',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await createPhotoRepairService({
      getEntryById: mockGetEntryById,
      updateEntry: mockUpdateEntry,
      uploadFile: mockUploadFile,
      syncNow: mockSyncNow,
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      now: () => 1234,
    }).repair(issue);

    expect(mockUploadFile).toHaveBeenCalledWith(
      '/media/upload',
      issue.localUri,
      'file',
      {
        metadata: {
          traceId: 'local-1',
          localMediaId: 'local-1',
          persistedHash: 'local-good',
          sourceHash: 'local-good',
          size: 2048,
          width: 1200,
          height: 900,
        },
      },
    );
    expect(mockUpdateEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        syncStatus: 'pending',
        syncOp: 'update',
        updatedAt: 1234,
        media: [
          expect.objectContaining({
            remoteUri: '/api/media/media-new',
            metadata: expect.objectContaining({
              remoteHash: 'sha256-new',
              integrityStatus: 'repair_pending',
              integrityReason: 'waiting for sync confirmation after user-approved repair',
              repairable: false,
              modifiedAt: 1234,
            }),
          }),
        ],
      }),
    );
    expect(mockSyncNow).toHaveBeenCalledTimes(1);
  });

  it('uses the entry localMediaId as fallback in upload metadata and completion logs when the issue omits it', async () => {
    const fallbackLocalMediaId = 'local-from-entry';
    const issueWithoutLocalMediaId: MediaRepairIssue = {
      ...issue,
      localMediaId: undefined,
    };
    const mockGetEntryById = jest.fn().mockResolvedValue({
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      updatedAt: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: issue.localUri,
          remoteUri: issue.remoteUri,
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: fallbackLocalMediaId,
            persistedHash: 'local-good',
            remoteHash: 'remote-bad',
            integrityStatus: 'repair_prompt_required',
            repairable: true,
            createdAt: 1,
            modifiedAt: 1,
          },
        },
      ],
    });
    const mockUploadFile = jest.fn().mockResolvedValue({
      id: 'media-new',
      url: '/api/media/media-new',
      remoteHash: 'sha256-new',
      validationStatus: 'healthy',
      validationError: null,
    });
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'local-good',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await createPhotoRepairService({
      getEntryById: mockGetEntryById,
      updateEntry: jest.fn().mockResolvedValue(undefined),
      uploadFile: mockUploadFile,
      syncNow: jest.fn().mockResolvedValue(undefined),
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      now: () => 1234,
    }).repair(issueWithoutLocalMediaId);

    expect(mockUploadFile).toHaveBeenCalledWith(
      '/media/upload',
      issue.localUri,
      'file',
      {
        metadata: expect.objectContaining({
          traceId: fallbackLocalMediaId,
          localMediaId: fallbackLocalMediaId,
        }),
      },
    );
    expect(logger.log).toHaveBeenCalledWith(
      'photo.repair.completed',
      expect.objectContaining({
        localMediaId: fallbackLocalMediaId,
        remoteUri: '/api/media/media-new',
        remoteHash: 'sha256-new',
        integrityStatus: 'repair_pending',
      }),
    );
  });

  it('rejects repair when the healthy local source no longer matches the persisted hash', async () => {
    const mockUploadFile = jest.fn();
    const mockUpdateEntry = jest.fn();
    const mockSyncNow = jest.fn();
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'tampered-hash',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await expect(createPhotoRepairService({
      getEntryById: jest.fn(),
      updateEntry: mockUpdateEntry,
      uploadFile: mockUploadFile,
      syncNow: mockSyncNow,
      fingerprintPhotoFile: mockFingerprintPhotoFile,
    }).repair(issue)).rejects.toThrow('Healthy local source is no longer available');

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
    expect(mockSyncNow).not.toHaveBeenCalled();
  });

  it('logs the uploaded remote media details when sync confirmation fails after a repair upload', async () => {
    const mockGetEntryById = jest.fn().mockResolvedValue({
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      updatedAt: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: issue.localUri,
          remoteUri: issue.remoteUri,
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: 'local-1',
            persistedHash: 'local-good',
            remoteHash: 'remote-bad',
            integrityStatus: 'repair_prompt_required',
            repairable: true,
            createdAt: 1,
            modifiedAt: 1,
          },
        },
      ],
    });
    const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);
    const mockUploadFile = jest.fn().mockResolvedValue({
      id: 'media-new',
      url: '/api/media/media-new',
      remoteHash: 'sha256-new',
      validationStatus: 'healthy',
      validationError: null,
    });
    const mockSyncNow = jest.fn().mockRejectedValue(new Error('sync unavailable'));
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'local-good',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await expect(createPhotoRepairService({
      getEntryById: mockGetEntryById,
      updateEntry: mockUpdateEntry,
      uploadFile: mockUploadFile,
      syncNow: mockSyncNow,
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      now: () => 1234,
    }).repair(issue)).rejects.toThrow('sync unavailable');

    expect(mockUpdateEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        syncStatus: 'pending',
        syncOp: 'update',
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      'photo.repair.failed',
      expect.objectContaining({
        remoteUri: '/api/media/media-new',
        remoteHash: 'sha256-new',
        integrityStatus: 'repair_failed',
        integrityReason: 'sync unavailable',
      }),
    );
  });

  it('uses the entry localMediaId as fallback in failure logs when the issue omits it', async () => {
    const fallbackLocalMediaId = 'local-from-entry';
    const issueWithoutLocalMediaId: MediaRepairIssue = {
      ...issue,
      localMediaId: undefined,
    };
    const mockGetEntryById = jest.fn().mockResolvedValue({
      id: 'entry-1',
      type: 'photo',
      content: '',
      timestamp: 1,
      updatedAt: 2,
      syncStatus: 'synced',
      media: [
        {
          uri: issue.localUri,
          remoteUri: issue.remoteUri,
          mimeType: 'image/jpeg',
          size: 2048,
          metadata: {
            localMediaId: fallbackLocalMediaId,
            persistedHash: 'local-good',
            remoteHash: 'remote-bad',
            integrityStatus: 'repair_prompt_required',
            repairable: true,
            createdAt: 1,
            modifiedAt: 1,
          },
        },
      ],
    });
    const mockUploadFile = jest.fn().mockResolvedValue({
      id: 'media-new',
      url: '/api/media/media-new',
      remoteHash: 'sha256-new',
      validationStatus: 'healthy',
      validationError: null,
    });
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'local-good',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await expect(createPhotoRepairService({
      getEntryById: mockGetEntryById,
      updateEntry: jest.fn().mockResolvedValue(undefined),
      uploadFile: mockUploadFile,
      syncNow: jest.fn().mockRejectedValue(new Error('sync unavailable')),
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      now: () => 1234,
    }).repair(issueWithoutLocalMediaId)).rejects.toThrow('sync unavailable');

    expect(logger.log).toHaveBeenCalledWith(
      'photo.repair.failed',
      expect.objectContaining({
        localMediaId: fallbackLocalMediaId,
        remoteUri: '/api/media/media-new',
        remoteHash: 'sha256-new',
        integrityStatus: 'repair_failed',
        integrityReason: 'sync unavailable',
      }),
    );
  });

  it('logs photo.repair.confirmed before resolving the repair target entry', async () => {
    const mockFingerprintPhotoFile = jest.fn().mockResolvedValue({
      uri: issue.localUri,
      sha256: 'local-good',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    });

    await expect(createPhotoRepairService({
      getEntryById: jest.fn().mockResolvedValue(null),
      updateEntry: jest.fn(),
      uploadFile: jest.fn(),
      syncNow: jest.fn(),
      fingerprintPhotoFile: mockFingerprintPhotoFile,
    }).repair(issue)).rejects.toThrow('Repair target entry is missing');

    expect(logger.log).toHaveBeenCalledWith(
      'photo.repair.confirmed',
      expect.objectContaining({
        localMediaId: issue.localMediaId,
        remoteUri: issue.remoteUri,
      }),
    );
  });
});
