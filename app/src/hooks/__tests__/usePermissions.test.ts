const mockGetRecordingPermissionsAsync = jest.fn();
const mockRequestRecordingPermissionsAsync = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('expo-audio', () => ({
  getRecordingPermissionsAsync: (...args: unknown[]) => mockGetRecordingPermissionsAsync(...args),
  requestRecordingPermissionsAsync: (...args: unknown[]) => mockRequestRecordingPermissionsAsync(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

import { checkSpeechPermissions } from '../usePermissions';

describe('checkSpeechPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true without requesting again when recording permission is already granted', async () => {
    mockGetRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });

    await expect(checkSpeechPermissions()).resolves.toBe(true);
    expect(mockRequestRecordingPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests recording permission when current permission is not granted', async () => {
    mockGetRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });
    mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });

    await expect(checkSpeechPermissions()).resolves.toBe(true);
    expect(mockRequestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns false when permission lookup throws', async () => {
    const error = new Error('permission lookup failed');
    mockGetRecordingPermissionsAsync.mockRejectedValueOnce(error);

    await expect(checkSpeechPermissions()).resolves.toBe(false);
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to check speech permissions:', error);
  });
});
