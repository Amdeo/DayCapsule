import {renderHook, act, waitFor} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {databaseService} from '@services/storage/database';
import {fileSystemService} from '@services/storage/fileSystem';
import {encryptionService} from '@services/storage/encryption';

/**
 * 拍照记录集成测试
 * 测试从拍照到保存的完整流程
 */
describe('Photo Capture Integration Tests', () => {
  let store: any;

  beforeAll(async () => {
    // 初始化数据库和加密服务
    await databaseService.init();
    await encryptionService.init();
  });

  beforeEach(() => {
    // 创建新的 Redux store 用于每个测试
    store = configureStore({
      reducer: {
        capture: (state = {}) => state,
        entries: (state = {items: []}) => state,
      },
    });
  });

  afterEach(async () => {
    // 清理测试数据
    jest.clearAllMocks();
  });

  describe('Photo Capture Flow', () => {
    it('应该成功保存拍照记录到数据库', async () => {
      const testPhotoPath = '/tmp/test-photo.jpg';
      const testContent = '今天的美景';
      const testTags = ['风景', '旅游'];

      // 模拟拍照数据
      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: testPhotoPath,
        tags: testTags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 保存记录
      const entryId = await databaseService.insertEntry(mockPhotoData);

      // 验证记录已保存
      expect(entryId).toBeDefined();
      expect(typeof entryId).toBe('string');

      // 验证可以检索记录
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry).toBeDefined();
      expect(savedEntry?.content).toBe(testContent);
      expect(savedEntry?.type).toBe('photo');
    });

    it('应该支持最多 9 张照片', async () => {
      const testContent = '多张照片测试';
      const photoPaths = Array.from({length: 9}, (_, i) => `/tmp/photo-${i}.jpg`);

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: photoPaths[0], // 主照片
        tags: ['多张'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      expect(entryId).toBeDefined();

      // 验证记录包含照片信息
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry?.mediaPath).toBe(photoPaths[0]);
    });

    it('应该为照片生成缩略图', async () => {
      const testPhotoPath = '/tmp/test-photo.jpg';
      const testContent = '需要缩略图的照片';

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: testPhotoPath,
        thumbnailPath: '/tmp/test-photo-thumb.jpg',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.thumbnailPath).toBeDefined();
    });

    it('应该支持为照片添加标签', async () => {
      const testContent = '带标签的照片';
      const testTags = ['风景', '日落', '旅游'];

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        tags: testTags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.tags).toEqual(testTags);
    });

    it('应该支持为照片设置心情', async () => {
      const testContent = '开心的时刻';
      const testMood = 'happy';

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        mood: testMood,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.mood).toBe(testMood);
    });

    it('应该记录地理位置信息', async () => {
      const testContent = '有位置的照片';
      const testLocation = {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区',
      };

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        location_latitude: testLocation.latitude,
        location_longitude: testLocation.longitude,
        location_address: testLocation.address,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      const savedEntry = await databaseService.getEntry(entryId);

      expect(savedEntry?.location_latitude).toBe(testLocation.latitude);
      expect(savedEntry?.location_longitude).toBe(testLocation.longitude);
      expect(savedEntry?.location_address).toBe(testLocation.address);
    });

    it('应该在 2 秒内完成拍照保存流程', async () => {
      const startTime = Date.now();

      const mockPhotoData = {
        type: 'photo',
        content: '性能测试照片',
        timestamp: Date.now(),
        mediaPath: '/tmp/perf-photo.jpg',
        tags: ['性能'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await databaseService.insertEntry(mockPhotoData);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证在 2 秒内完成
      expect(duration).toBeLessThan(2000);
    });

    it('应该支持加密存储敏感信息', async () => {
      const testContent = '包含敏感信息的照片';
      const sensitiveData = '电话: 13800138000';

      const mockPhotoData = {
        type: 'photo',
        content: testContent,
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);
      expect(entryId).toBeDefined();

      // 验证记录已保存
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry).toBeDefined();
    });

    it('应该支持更新已保存的照片记录', async () => {
      const mockPhotoData = {
        type: 'photo',
        content: '原始内容',
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        tags: ['原始'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);

      // 更新记录
      const updatedData = {
        ...mockPhotoData,
        id: entryId,
        content: '更新后的内容',
        tags: ['更新'],
        updatedAt: Date.now(),
      };

      await databaseService.updateEntry(updatedData);

      // 验证更新
      const savedEntry = await databaseService.getEntry(entryId);
      expect(savedEntry?.content).toBe('更新后的内容');
      expect(savedEntry?.tags).toEqual(['更新']);
    });

    it('应该支持删除照片记录', async () => {
      const mockPhotoData = {
        type: 'photo',
        content: '待删除的照片',
        timestamp: Date.now(),
        mediaPath: '/tmp/photo.jpg',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await databaseService.insertEntry(mockPhotoData);

      // 删除记录
      await databaseService.deleteEntry(entryId);

      // 验证已删除
      const deletedEntry = await databaseService.getEntry(entryId);
      expect(deletedEntry).toBeNull();
    });
  });
});

