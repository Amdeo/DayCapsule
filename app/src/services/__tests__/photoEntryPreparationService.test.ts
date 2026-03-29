jest.mock('../photoIntegrityService', () => ({
  fingerprintPhotoFile: jest.fn(),
  buildPhotoLogPayload: jest.fn((input) => input),
}));

jest.mock('../photoService', () => ({
  PhotoService: {
    savePhotoToStorage: jest.fn(),
  },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { fingerprintPhotoFile } from '../photoIntegrityService';
import { preparePhotoEntryMedia } from '../photoEntryPreparationService';

const PHOTO_RESULT = {
  uri: 'content://media/external/images/1234',
  width: 3024,
  height: 4032,
  aspectRatio: 3024 / 4032,
};

const SAVED_PHOTO = {
  originalUri: 'file:///cache/media/photos/display/photo_123.jpg',
  thumbnailUri: 'file:///cache/media/photos/thumbnails/thumb_123.jpg',
  aspectRatio: PHOTO_RESULT.aspectRatio,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
};

const SOURCE_FINGERPRINT = {
  uri: PHOTO_RESULT.uri,
  sha256: 'source-hash',
  size: 8000,
  width: PHOTO_RESULT.width,
  height: PHOTO_RESULT.height,
  mimeType: 'image/jpeg' as const,
};

const PERSISTED_FINGERPRINT = {
  uri: SAVED_PHOTO.originalUri,
  sha256: 'persisted-hash',
  size: 2048,
  width: 1200,
  height: 900,
  mimeType: 'image/jpeg' as const,
};

const mockFingerprintPhotoFile = fingerprintPhotoFile as jest.Mock;

describe('preparePhotoEntryMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepares persisted media from preview results and returns createdFiles for rollback', async () => {
    mockFingerprintPhotoFile
      .mockResolvedValueOnce(SOURCE_FINGERPRINT)
      .mockResolvedValueOnce(PERSISTED_FINGERPRINT);

    const savePhoto = jest.fn().mockResolvedValue(SAVED_PHOTO);

    const prepared = await preparePhotoEntryMedia([PHOTO_RESULT], {
      savePhoto,
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      deleteLocalFile: jest.fn().mockResolvedValue(undefined),
      now: () => 1774104000000,
    });

    expect(savePhoto).toHaveBeenCalledWith(
      PHOTO_RESULT.uri,
      expect.any(String),
      'medium',
      PHOTO_RESULT.aspectRatio
    );
    expect(prepared.createdFiles).toEqual([
      SAVED_PHOTO.originalUri,
      SAVED_PHOTO.thumbnailUri,
    ]);
    expect(prepared.media).toEqual([
      expect.objectContaining({
        uri: SAVED_PHOTO.originalUri,
        thumbnail: SAVED_PHOTO.thumbnailUri,
        size: PERSISTED_FINGERPRINT.size,
        metadata: expect.objectContaining({
          sourceHash: SOURCE_FINGERPRINT.sha256,
          persistedHash: PERSISTED_FINGERPRINT.sha256,
          integrityStatus: 'healthy',
        }),
      }),
    ]);
  });

  it('cleans up any created files when one photo preparation step fails', async () => {
    mockFingerprintPhotoFile
      .mockResolvedValueOnce(SOURCE_FINGERPRINT)
      .mockResolvedValueOnce(PERSISTED_FINGERPRINT)
      .mockResolvedValueOnce({ ...SOURCE_FINGERPRINT, uri: 'content://media/external/images/5678' });

    const deleteLocalFile = jest.fn().mockResolvedValue(undefined);
    const savePhoto = jest.fn()
      .mockResolvedValueOnce(SAVED_PHOTO)
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(
      preparePhotoEntryMedia(
        [
          PHOTO_RESULT,
          { ...PHOTO_RESULT, uri: 'content://media/external/images/5678' },
        ],
        {
          savePhoto,
          fingerprintPhotoFile: mockFingerprintPhotoFile,
          deleteLocalFile,
          now: () => 1774104000000,
        }
      )
    ).rejects.toThrow('disk full');

    expect(deleteLocalFile).toHaveBeenCalledWith(SAVED_PHOTO.originalUri);
    expect(deleteLocalFile).toHaveBeenCalledWith(SAVED_PHOTO.thumbnailUri);
  });

  it('marks integrity as upload_mismatch when persisted hash data is unavailable', async () => {
    mockFingerprintPhotoFile
      .mockResolvedValueOnce(SOURCE_FINGERPRINT)
      .mockResolvedValueOnce({ ...PERSISTED_FINGERPRINT, sha256: '' });

    const prepared = await preparePhotoEntryMedia([PHOTO_RESULT], {
      savePhoto: jest.fn().mockResolvedValue(SAVED_PHOTO),
      fingerprintPhotoFile: mockFingerprintPhotoFile,
      deleteLocalFile: jest.fn().mockResolvedValue(undefined),
      now: () => 1774104000000,
    });

    expect(prepared.media).toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceHash: SOURCE_FINGERPRINT.sha256,
          persistedHash: '',
          integrityStatus: 'upload_mismatch',
          integrityReason: 'persisted-hash-missing',
          repairable: false,
        }),
      }),
    ]);
  });
});
