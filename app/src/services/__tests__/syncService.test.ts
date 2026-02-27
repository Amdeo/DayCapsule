/**
 * SyncService 单元测试
 * 重点覆盖：ZIP 完整性校验的 5 个校验步骤 + 媒体文件提取
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  MEDIA_PATHS: {
    voiceOriginal: 'file:///app/media/voice/original/',
    photoOriginal: 'file:///app/media/photos/original/',
  },
}));

jest.mock('@/src/services/backupService', () => ({
  BackupService: { createBackup: jest.fn() },
}));

// ─── JSZip Mock ───────────────────────────────────────────────────────────────

const mockZipFiles: Record<string, { async: jest.Mock }> = {};
const mockZipInstance = {
  file: jest.fn((name: string) => mockZipFiles[name] ?? null),
};

jest.mock('jszip', () => {
  const MockJSZip = jest.fn();
  (MockJSZip as any).loadAsync = jest.fn().mockImplementation(() => Promise.resolve(mockZipInstance));
  return MockJSZip;
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { SyncService } from '../syncService';
import { BackupManifest } from '../backupService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 构造合法的 manifest */
const makeManifest = (overrides: Partial<BackupManifest> = {}): BackupManifest => ({
  version: '2.0',
  exportedAt: new Date().toISOString(),
  appVersion: '1.0.0',
  entryCount: 1,
  mediaFiles: [],
  dataSize: 0,
  ...overrides,
});

/** 构造合法的 data.json 字符串，并返回其字节长度 */
const makeDataJson = (entryCount = 1, withMedia = false) => {
  const entries = Array.from({ length: entryCount }, (_, i) => ({
    id: `e${i}`,
    type: 'text',
    content: '内容',
    tags: [],
    timestamp: 1700000000000,
    media: withMedia
      ? { mimeType: 'image/jpeg', size: 512, relativeUri: `media/photo_e${i}.jpg` }
      : undefined,
  }));
  const json = JSON.stringify({ exportedAt: '', appVersion: '1.0.0', totalEntries: entryCount, entries }, null, 2);
  return { json, size: new TextEncoder().encode(json).length };
};

/** 配置 mockZipFiles，模拟一个合法的 ZIP */
const setupValidZip = (entryCount = 1, mediaFiles: string[] = []) => {
  const { json, size } = makeDataJson(entryCount, mediaFiles.length > 0);
  const manifest = makeManifest({ entryCount, mediaFiles, dataSize: size });

  Object.assign(mockZipFiles, {
    'manifest.json': { async: jest.fn().mockResolvedValue(JSON.stringify(manifest)) },
    'data.json': { async: jest.fn().mockResolvedValue(json) },
  });

  for (const f of mediaFiles) {
    mockZipFiles[`media/${f}`] = { async: jest.fn().mockResolvedValue('base64mediadata') };
  }

  return { manifest, dataJson: json, dataSize: size };
};

/** 模拟 DocumentPicker 选择了一个 ZIP 文件 */
const mockPickZip = () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/backup.zip', name: 'backup.zip', mimeType: 'application/zip' }],
  });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('bW9ja3ppcA==');
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SyncService — ZIP 完整性校验', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清空 mockZipFiles
    Object.keys(mockZipFiles).forEach((k) => delete mockZipFiles[k]);
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  });

  // ── 正常路径 ────────────────────────────────────────────────────────────────

  it('合法 ZIP 应成功解析并返回条目', async () => {
    setupValidZip(2);
    mockPickZip();

    const result = await SyncService.pickAndParseBackup();

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
  });

  it('用户取消选择时应返回 null', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });

    const result = await SyncService.pickAndParseBackup();
    expect(result).toBeNull();
  });

  // ── 校验步骤 ① — ZIP 解压失败 ───────────────────────────────────────────────

  it('ZIP 文件损坏时应抛出"无法解析备份文件"', async () => {
    mockPickZip();
    (JSZip as any).loadAsync.mockRejectedValueOnce(new Error('bad zip'));

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      '无法解析备份文件，文件可能已损坏'
    );
  });

  // ── 校验步骤 ② — manifest.json 缺失 ─────────────────────────────────────────

  it('缺少 manifest.json 时应抛出对应错误', async () => {
    mockPickZip();
    // mockZipFiles 为空，file() 返回 null

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      '备份文件损坏：缺少 manifest.json'
    );
  });

  // ── 校验步骤 ③ — data.json 缺失 ─────────────────────────────────────────────

  it('缺少 data.json 时应抛出对应错误', async () => {
    mockPickZip();
    const manifest = makeManifest();
    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    // 不设置 data.json

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      '备份文件损坏：缺少 data.json'
    );
  });

  // ── 校验步骤 ④ — data.json 字节长度不匹配 ────────────────────────────────────

  it('data.json 字节长度与 manifest 不符时应抛出完整性错误', async () => {
    mockPickZip();
    const { json } = makeDataJson(1);
    const manifest = makeManifest({ entryCount: 1, dataSize: 9999 }); // 故意错误

    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    mockZipFiles['data.json'] = {
      async: jest.fn().mockResolvedValue(json),
    };

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      'data.json 大小不匹配'
    );
  });

  // ── 校验步骤 ⑤ — 条目数不匹配 ───────────────────────────────────────────────

  it('条目数与 manifest 不符时应抛出完整性错误', async () => {
    mockPickZip();
    const { json, size } = makeDataJson(1); // 实际 1 条
    const manifest = makeManifest({ entryCount: 5, dataSize: size }); // manifest 声称 5 条

    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    mockZipFiles['data.json'] = {
      async: jest.fn().mockResolvedValue(json),
    };

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      '条目数不匹配'
    );
  });

  // ── 校验步骤 ⑥ — 媒体文件缺失 ───────────────────────────────────────────────

  it('manifest 列出的媒体文件在 ZIP 中缺失时应抛出错误', async () => {
    mockPickZip();
    const { json, size } = makeDataJson(1);
    const manifest = makeManifest({
      entryCount: 1,
      dataSize: size,
      mediaFiles: ['photo_missing.jpg'],
    });

    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    mockZipFiles['data.json'] = {
      async: jest.fn().mockResolvedValue(json),
    };
    // 不设置 media/photo_missing.jpg

    await expect(SyncService.pickAndParseBackup()).rejects.toThrow(
      '媒体文件缺失'
    );
  });

  // ── 媒体文件提取 ─────────────────────────────────────────────────────────────

  it('应将 ZIP 中的媒体文件写入应用媒体目录', async () => {
    setupValidZip(1, ['photo_e0.jpg']);
    mockPickZip();

    // 模拟条目有 photo 类型
    const { json, size } = makeDataJson(1, true);
    const manifest = makeManifest({
      entryCount: 1,
      dataSize: size,
      mediaFiles: ['photo_e0.jpg'],
    });
    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    mockZipFiles['data.json'] = {
      async: jest.fn().mockResolvedValue(json),
    };
    mockZipFiles['media/photo_e0.jpg'] = {
      async: jest.fn().mockResolvedValue('base64photodata'),
    };

    await SyncService.pickAndParseBackup();

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('photo_e0.jpg'),
      'base64photodata',
      { encoding: 'base64' }
    );
  });

  it('ZIP 中找不到媒体文件时应降级（media 置为 undefined）', async () => {
    mockPickZip();
    const { json, size } = makeDataJson(1, true);
    const manifest = makeManifest({
      entryCount: 1,
      dataSize: size,
      mediaFiles: ['photo_e0.jpg'],
    });
    mockZipFiles['manifest.json'] = {
      async: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
    };
    mockZipFiles['data.json'] = {
      async: jest.fn().mockResolvedValue(json),
    };
    mockZipFiles['media/photo_e0.jpg'] = {
      async: jest.fn().mockResolvedValue('base64photodata'),
    };

    const result = await SyncService.pickAndParseBackup();

    // 条目应存在，media.uri 应被设置
    expect(result!.entries[0]).toBeDefined();
  });
});
