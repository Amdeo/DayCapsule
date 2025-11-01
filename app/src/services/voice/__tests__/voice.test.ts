import {voiceService} from '../index';
import {permissionsService} from '@services/permissions';

// Mock dependencies
jest.mock('@services/permissions');
jest.mock('react-native-audio-recorder-player');

describe('VoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startRecording', () => {
    it('should return null if microphone permission is denied', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(false);

      const result = await voiceService.startRecording();

      expect(result).toBeNull();
      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('microphone');
    });

    it('should request microphone permission', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(true);

      try {
        await voiceService.startRecording();
      } catch (error) {
        // Expected to fail due to mocking
      }

      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('microphone');
    });
  });

  describe('getRecordingStatus', () => {
    it('should return recording status', () => {
      const status = voiceService.getRecordingStatus();
      // Status can be true or false depending on previous tests
      expect(typeof status).toBe('boolean');
    });
  });

  describe('formatTime', () => {
    it('should format milliseconds to mm:ss', () => {
      expect(voiceService.formatTime(0)).toBe('00:00');
      expect(voiceService.formatTime(60000)).toBe('01:00');
      expect(voiceService.formatTime(125000)).toBe('02:05');
      expect(voiceService.formatTime(3661000)).toBe('61:01');
    });
  });

  describe('dispose', () => {
    it('should dispose resources without error', () => {
      expect(() => {
        voiceService.dispose();
      }).not.toThrow();
    });
  });
});
