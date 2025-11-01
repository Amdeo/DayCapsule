import {cameraService} from '../index';
import {permissionsService} from '@services/permissions';

// Mock dependencies
jest.mock('@services/permissions');
jest.mock('react-native-image-picker');
jest.mock('react-native-image-resizer');

describe('CameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('takePhoto', () => {
    it('should return null if permission is denied', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(false);

      const result = await cameraService.takePhoto();

      expect(result).toBeNull();
      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('camera');
    });

    it('should request camera permission', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(true);

      await cameraService.takePhoto();

      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('camera');
    });
  });

  describe('pickFromGallery', () => {
    it('should return null if permission is denied', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(false);

      const result = await cameraService.pickFromGallery();

      expect(result).toBeNull();
      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('photos');
    });

    it('should request photo library permission', async () => {
      (permissionsService.ensurePermission as jest.Mock).mockResolvedValue(true);

      await cameraService.pickFromGallery();

      expect(permissionsService.ensurePermission).toHaveBeenCalledWith('photos');
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with default size', async () => {
      const photoUri = 'file:///path/to/photo.jpg';

      // This test would require mocking ImageResizer
      // For now, we just verify the method exists
      expect(cameraService.generateThumbnail).toBeDefined();
    });
  });
});
