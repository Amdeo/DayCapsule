jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';

import {
  buildIntegrityDecision,
  fingerprintPhotoFile,
} from '../photoIntegrityService';

const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const mockManipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;
const mockDigestStringAsync = Crypto.digestStringAsync as jest.Mock;

describe('photoIntegrityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a healthy persisted photo fingerprint', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64-photo');
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048 });
    mockManipulateAsync.mockResolvedValueOnce({ uri: 'file:///persisted.jpg', width: 1200, height: 900 });
    mockDigestStringAsync.mockResolvedValueOnce('sha256-persisted');

    const result = await fingerprintPhotoFile('file:///persisted.jpg');

    expect(result).toEqual(expect.objectContaining({
      uri: 'file:///persisted.jpg',
      sha256: 'sha256-persisted',
      size: 2048,
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    }));
  });

  it('marks a cloud mismatch as repairable only when a healthy local source exists', () => {
    expect(buildIntegrityDecision({
      persistedHash: 'local-good',
      remoteHash: 'remote-bad',
      localSourceExists: true,
    })).toEqual(expect.objectContaining({
      integrityStatus: 'cloud_content_suspect',
      repairable: true,
      repairSource: 'local-original',
    }));

    expect(buildIntegrityDecision({
      persistedHash: 'local-good',
      remoteHash: 'remote-bad',
      localSourceExists: false,
    })).toEqual(expect.objectContaining({
      integrityStatus: 'download_mismatch',
      repairable: false,
    }));
  });
});
