/**
 * BackupService 单元测试
 * 覆盖：ZIP 创建结构、manifest 内容、listBackups、pruneOldBackups
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

const mockZipInstance = {
  file: jest.fn(),
  generateAsync: jest.fn().mockResolvedValue('bW9ja3ppcA=='),
};

jest.mock('jszip', () => jest.fn().mockImplementation(() => mockZipInstance));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getContentUriAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  },
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('@/src/utils/storage', () => ({
  Storage: { getString: jest.fn(), setString: jest.fn() },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: { resolvePhotoUri: jest.fn((uri: string) => uri) },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { resolveAudioUri: jest.fn((uri: string) => uri) },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { BackupService } from '../backupService';
import { Entry } from '@/src/types/entry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'e1',
  type: 'text',
  content: '测试内容',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
  ...overrides,
});

const BACKUP_DIR = 'file:///app/backups/';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'android';
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64media');
    (FileSystem.getContentUriAsync as jest.Mock).mockResolvedValue('content://backup.zip');
    (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
      directoryUri: 'content://tree/primary:Download',
    });
    (FileSystem.StorageAccessFramework.createFileAsync as jest.Mock).mockResolvedValue(
      'content://document/primary:Download/backup.zip'
    );
  });

  // ── createBackup ────────────────────────────────────────────────────────────

  describe('createBackup', () => {
    it('应将 manifest.json 和 data.json 写入 ZIP', async () => {
      await BackupService.createBackup([makeEntry()]);

      const calls = mockZipInstance.file.mock.calls.map((c) => c[0]);
      expect(calls).toContain('manifest.json');
      expect(calls).toContain('data.json');
    });

    it('manifest 应包含正确的条目数和版本', async () => {
      const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
      await BackupService.createBackup(entries);

      const manifestCall = mockZipInstance.file.mock.calls.find(
        (c) => c[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall![1]);

      expect(manifest.version).toBe('2.0');
      expect(manifest.entryCount).toBe(2);
      expect(manifest.appVersion).toBe('1.0.0');
    });

    it('有媒体文件时应将其写入 media/ 目录并记录到 manifest', async () => {
      const entry = makeEntry({
        id: 'v1',
        type: 'voice',
        media: { uri: 'file:///app/media/voice/original/voice_v1.m4a', mimeType: 'audio/m4a', size: 1024, duration: 5000 },
      });

      await BackupService.createBackup([entry]);

      const mediaCalls = mockZipInstance.file.mock.calls.filter((c) =>
        (c[0] as string).startsWith('media/')
      );
      expect(mediaCalls.length).toBe(1);
      expect(mediaCalls[0][0]).toBe('media/voice_v1.m4a');

      const manifestCall = mockZipInstance.file.mock.calls.find(
        (c) => c[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall![1]);
      expect(manifest.mediaFiles).toContain('voice_v1.m4a');
    });

    it('媒体文件不存在时应跳过，不写入 media/', async () => {
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true })  // ensureBackupDir
        .mockResolvedValueOnce({ exists: false }); // media file check

      const entry = makeEntry({
        type: 'photo',
        media: { uri: 'file:///app/media/photos/original/missing.jpg', mimeType: 'image/jpeg', size: 0 },
      });

      await BackupService.createBackup([entry]);

      const mediaCalls = mockZipInstance.file.mock.calls.filter((c) =>
        (c[0] as string).startsWith('media/')
      );
      expect(mediaCalls.length).toBe(0);

      const manifestCall = mockZipInstance.file.mock.calls.find(
        (c) => c[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall![1]);
      expect(manifest.mediaFiles).toHaveLength(0);
    });

    it('应使用 DEFLATE 压缩生成 ZIP', async () => {
      await BackupService.createBackup([makeEntry()]);

      expect(mockZipInstance.generateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ compression: 'DEFLATE' })
      );
    });

    it('应将 ZIP 以 Base64 写入文件系统', async () => {
      await BackupService.createBackup([makeEntry()]);

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/backup_.*\.zip$/),
        'bW9ja3ppcA==',
        { encoding: 'base64' }
      );
    });
  });

  // ── listBackups ─────────────────────────────────────────────────────────────

  describe('listBackups', () => {
    it('应只返回 .zip 文件，按名称降序排列', async () => {
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        'backup_2026-01-01.zip',
        'backup_2026-01-03.zip',
        'backup_2026-01-02.zip',
        'backup_old.json',        // 旧格式，应忽略
        'other_file.txt',
      ]);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 2048,
      });

      const result = await BackupService.listBackups();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('backup_2026-01-03.zip');
      expect(result[1].name).toBe('backup_2026-01-02.zip');
      expect(result[2].name).toBe('backup_2026-01-01.zip');
    });

    it('目录为空时应返回空数组', async () => {
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
      const result = await BackupService.listBackups();
      expect(result).toEqual([]);
    });
  });

  // ── pruneOldBackups ─────────────────────────────────────────────────────────

  describe('pruneOldBackups', () => {
    it('超出保留数量的旧 ZIP 应被删除', async () => {
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        'backup_2026-01-01.zip',
        'backup_2026-01-02.zip',
        'backup_2026-01-03.zip',
        'backup_2026-01-04.zip',
        'backup_2026-01-05.zip',
      ]);

      await BackupService.pruneOldBackups(3);

      // 最旧的两个应被删除
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${BACKUP_DIR}backup_2026-01-01.zip`,
        { idempotent: true }
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${BACKUP_DIR}backup_2026-01-02.zip`,
        { idempotent: true }
      );
    });

    it('旧格式文件夹和 .json 文件应被清理', async () => {
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        'backup_2026-01-01.zip',
        'backup_2026-01-02',       // 旧文件夹格式
        'backup_2026-01-03.json',  // 旧 JSON 格式
      ]);

      await BackupService.pruneOldBackups(7);

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${BACKUP_DIR}backup_2026-01-02`,
        { idempotent: true }
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${BACKUP_DIR}backup_2026-01-03.json`,
        { idempotent: true }
      );
    });
  });

  // ── shouldBackup ────────────────────────────────────────────────────────────

  describe('backup timestamp helpers', () => {
    it('从未备份时应返回 null', async () => {
      const { Storage } = require('@/src/utils/storage');
      Storage.getString.mockResolvedValue(null);
      await expect(BackupService.getLastBackupTime()).resolves.toBeNull();
    });

    it('存在上次备份时间时应返回数值时间戳', async () => {
      const { Storage } = require('@/src/utils/storage');
      Storage.getString.mockResolvedValue('1700000000000');
      await expect(BackupService.getLastBackupTime()).resolves.toBe(1700000000000);
    });
  });

  describe('shouldBackup', () => {
    it('从未备份时应返回 true', async () => {
      const { Storage } = require('@/src/utils/storage');
      Storage.getString.mockResolvedValue(null);
      await expect(BackupService.shouldBackup()).resolves.toBe(true);
    });

    it('距上次备份超过 24 小时应返回 true', async () => {
      const { Storage } = require('@/src/utils/storage');
      const yesterday = Date.now() - 25 * 60 * 60 * 1000;
      Storage.getString.mockResolvedValue(String(yesterday));
      await expect(BackupService.shouldBackup()).resolves.toBe(true);
    });

    it('距上次备份不足 24 小时应返回 false', async () => {
      const { Storage } = require('@/src/utils/storage');
      Storage.getString.mockResolvedValue(String(Date.now() - 1000));
      await expect(BackupService.shouldBackup()).resolves.toBe(false);
    });
  });

  describe('android export helpers', () => {
    it('Android 上应将 file URI 转换为 content URI', async () => {
      await expect(
        BackupService.getAndroidShareableUri('file:///app/backups/a.zip')
      ).resolves.toBe('content://backup.zip');

      expect(FileSystem.getContentUriAsync).toHaveBeenCalledWith('file:///app/backups/a.zip');
    });

    it('非 Android 平台应直接返回原始 URI', async () => {
      (Platform as { OS: string }).OS = 'ios';

      await expect(
        BackupService.getAndroidShareableUri('file:///app/backups/a.zip')
      ).resolves.toBe('file:///app/backups/a.zip');

      expect(FileSystem.getContentUriAsync).not.toHaveBeenCalled();
    });

    it('保存到用户目录时应创建 SAF 文件并写入 ZIP 内容', async () => {
      const result = await BackupService.saveBackupToUserDirectory(
        'file:///app/backups/backup_2026-03-17.zip',
        'backup_2026-03-17.zip'
      );

      expect(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalled();
      expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenCalledWith(
        'content://tree/primary:Download',
        'backup_2026-03-17',
        'application/zip'
      );
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        'file:///app/backups/backup_2026-03-17.zip',
        { encoding: 'base64' }
      );
      expect(FileSystem.StorageAccessFramework.writeAsStringAsync).toHaveBeenCalledWith(
        'content://document/primary:Download/backup.zip',
        'base64media',
        { encoding: 'base64' }
      );
      expect(result).toEqual({
        canceled: false,
        fileName: 'backup_2026-03-17.zip',
        saved: true,
      });
    });

    it('用户取消目录选择时不应写入文件', async () => {
      (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue(
        {
          granted: false,
          directoryUri: null,
        }
      );

      const result = await BackupService.saveBackupToUserDirectory(
        'file:///app/backups/backup_2026-03-17.zip',
        'backup_2026-03-17.zip'
      );

      expect(FileSystem.StorageAccessFramework.createFileAsync).not.toHaveBeenCalled();
      expect(FileSystem.StorageAccessFramework.writeAsStringAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        canceled: true,
        fileName: null,
        saved: false,
      });
    });

    it('同名文件冲突时应自动追加序号后缀', async () => {
      (FileSystem.StorageAccessFramework.createFileAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('File already exists'))
        .mockResolvedValueOnce('content://document/primary:Download/backup_2026-03-17 (1).zip');

      const result = await BackupService.saveBackupToUserDirectory(
        'file:///app/backups/backup_2026-03-17.zip',
        'backup_2026-03-17.zip'
      );

      expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenNthCalledWith(
        1,
        'content://tree/primary:Download',
        'backup_2026-03-17',
        'application/zip'
      );
      expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenNthCalledWith(
        2,
        'content://tree/primary:Download',
        'backup_2026-03-17 (1)',
        'application/zip'
      );
      expect(result).toEqual({
        canceled: false,
        fileName: 'backup_2026-03-17 (1).zip',
        saved: true,
      });
    });
  });
});
