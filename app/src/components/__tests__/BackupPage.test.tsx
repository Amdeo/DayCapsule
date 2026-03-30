import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

import { BackupPage } from '../BackupPage';
import { BackupService } from '@/src/services/backupService';
import { SyncService } from '../../services/syncService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import type { Entry } from '@/src/types/entry';

const mockRestoreEntries = jest.fn<Promise<string[]>, [Entry[]]>();
const mockUpdateEntry = jest.fn<Promise<void>, [string, Partial<Entry>]>();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: [{ id: 'e1' }, { id: 'e2' }],
    restoreEntries: mockRestoreEntries,
    updateEntry: mockUpdateEntry,
  }),
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn().mockResolvedValue({ totalSize: 1024 }),
}));

jest.mock('@/src/services/backupService', () => ({
  BackupService: {
    listBackups: jest.fn().mockResolvedValue([
      { name: 'backup_2026-03-16T10-00-00-000Z.zip', uri: 'file:///a.zip', sizeBytes: 1000 },
      { name: 'backup_2026-03-16T11-00-00-000Z.zip', uri: 'file:///b.zip', sizeBytes: 1000 },
      { name: 'backup_2026-03-16T12-00-00-000Z.zip', uri: 'file:///c.zip', sizeBytes: 1000 },
    ]),
    getLastBackupTime: jest.fn().mockResolvedValue(new Date(2024, 2, 10, 0, 0, 0).getTime()),
    createBackup: jest.fn().mockResolvedValue('file:///exports/latest.zip'),
    shareBackup: jest.fn().mockResolvedValue(undefined),
    saveBackupToUserDirectory: jest.fn().mockResolvedValue({
      saved: true,
      canceled: false,
      fileName: 'latest.zip',
    }),
  },
}));

jest.mock('../../services/syncService', () => ({
  SyncService: {
    isICloudAvailable: jest.fn(() => false),
    pickAndParseBackup: jest.fn(),
    normalizeBackupEntries: jest.fn(),
    getMediaInfoArray: jest.fn((media: unknown) =>
      Array.isArray(media) ? media : media ? [media] : undefined
    ),
    extractMediaFromZip: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

describe('BackupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'android';
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockRestoreEntries.mockResolvedValue([]);
    mockUpdateEntry.mockResolvedValue(undefined);
  });

  it('renders backup history and bottom iCloud section when backups exist', async () => {
    const { getByTestId, getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(getByText('备份历史')).toBeTruthy();
      expect(getByText('iCloud 同步')).toBeTruthy();
      expect(getByText('2024-03-10 00:00:00')).toBeTruthy();
      expect(getByText(/并开启 DayCapsule/)).toBeTruthy();
    });

    expect(getByTestId('backup-page-root')).toBeTruthy();
    expect(getByTestId('backup-page-storage-card')).toBeTruthy();
    expect(getByTestId('backup-page-icloud-card')).toBeTruthy();
  });

  it('does not render the backup history section when no local backups exist', async () => {
    (BackupService.listBackups as jest.Mock).mockResolvedValueOnce([]);

    const { getByText, queryByText, queryByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    await waitFor(() => {
      expect(getByText('导入备份')).toBeTruthy();
    });

    expect(queryByText('备份历史')).toBeNull();
    expect(queryByTestId('backup-history-share-file:///a.zip')).toBeNull();
  });

  it('renders only the latest three local backup files in history', async () => {
    (BackupService.listBackups as jest.Mock).mockResolvedValueOnce([
      { name: 'backup_2026-03-16T10-00-00-000Z.zip', uri: 'file:///a.zip', sizeBytes: 1000 },
      { name: 'backup_2026-03-16T11-00-00-000Z.zip', uri: 'file:///b.zip', sizeBytes: 1000 },
      { name: 'backup_2026-03-16T12-00-00-000Z.zip', uri: 'file:///c.zip', sizeBytes: 1000 },
      { name: 'backup_2026-03-16T13-00-00-000Z.zip', uri: 'file:///d.zip', sizeBytes: 1000 },
    ]);

    const { findByText, queryByText, queryByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    expect(await findByText('2026-03-16 10:00')).toBeTruthy();
    expect(queryByText('2026-03-16 11:00')).toBeTruthy();
    expect(queryByText('2026-03-16 12:00')).toBeTruthy();
    expect(queryByText('2026-03-16 13:00')).toBeNull();
    expect(queryByTestId('backup-history-share-file:///d.zip')).toBeNull();
  });

  it('renders the available iCloud copy when iCloud Drive is accessible', async () => {
    (SyncService.isICloudAvailable as jest.Mock).mockReturnValue(true);

    const { findByText, queryByText } = render(<BackupPage visible onClose={jest.fn()} />);

    expect(await findByText('iCloud Drive 可用')).toBeTruthy();
    expect(queryByText('仅限 iOS 设备')).toBeNull();
  });

  it('creates a backup and opens the save-only export sheet', async () => {
    const { getByText, findByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));

    await findByText('保存到文件');

    expect(BackupService.createBackup).toHaveBeenCalled();
  });

  it('shows iOS export label when opened on iPhone', async () => {
    (Platform as { OS: string }).OS = 'ios';

    const { getByText, findByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));

    await findByText('导出/分享');
  });

  it('saves the export target to user files', async () => {
    const { getByText, findByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(BackupService.saveBackupToUserDirectory).toHaveBeenCalledWith(
        'file:///exports/latest.zip',
        'latest.zip'
      );
    });
  });

  it('shares the export target on iOS instead of saving to files', async () => {
    (Platform as { OS: string }).OS = 'ios';

    const { getByText, findByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(BackupService.shareBackup).toHaveBeenCalledWith('file:///exports/latest.zip');
    });
    expect(BackupService.saveBackupToUserDirectory).not.toHaveBeenCalled();
  });

  it('routes backup history actions through the same save-only export sheet', async () => {
    const { findByTestId, findByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(await findByTestId('backup-history-share-file:///a.zip'));
    await findByText('保存到文件');
  });

  it('shows a success alert after saving to files', async () => {
    const { getByText, findByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('保存成功', '备份已保存为 latest.zip');
    });
  });

  it('keeps export sheet open silently when save is canceled by user', async () => {
    let resolveSave: ((value: { saved: boolean; canceled: boolean; fileName: null }) => void) | null = null;
    let markSaveSettled: (() => void) | null = null;
    const saveSettled = new Promise<void>((resolve) => {
      markSaveSettled = resolve;
    });

    (BackupService.saveBackupToUserDirectory as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<{ saved: boolean; canceled: boolean; fileName: null }>((resolve) => {
          resolveSave = resolve;
        }).finally(() => {
          markSaveSettled?.();
        })
    );

    const { getByText, findByTestId, queryByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(BackupService.saveBackupToUserDirectory).toHaveBeenCalledWith(
        'file:///exports/latest.zip',
        'latest.zip'
      );
    });

    resolveSave?.({ saved: false, canceled: true, fileName: null });
    await saveSettled;

    await waitFor(() => {
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(showErrorFeedback).not.toHaveBeenCalled();
      expect(queryByTestId('backup-export-sheet')).toBeTruthy();
    });
  });

  it('shows branded feedback when export save fails', async () => {
    (BackupService.saveBackupToUserDirectory as jest.Mock).mockResolvedValueOnce({
      saved: false,
      canceled: false,
      fileName: 'latest.zip',
    });

    const { getByText, findByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '保存失败',
          dedupeKey: 'backup-export-save-failed',
        })
      );
    });
  });

  it('shows branded feedback when creating the backup archive fails', async () => {
    (BackupService.createBackup as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '导出失败',
          dedupeKey: 'backup-export-create-failed',
        })
      );
    });
  });

  it('shows branded feedback when save to files throws', async () => {
    (BackupService.saveBackupToUserDirectory as jest.Mock).mockRejectedValueOnce(
      new Error('disk full')
    );

    const { getByText, findByTestId } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导出'));
    fireEvent.press(await findByTestId('backup-export-save'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '保存失败',
          dedupeKey: 'backup-export-save-failed',
        })
      );
    });
  });

  it('shows branded feedback when import parsing fails', async () => {
    (SyncService.pickAndParseBackup as jest.Mock).mockRejectedValueOnce(new Error('bad zip'));

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '导入失败',
          dedupeKey: 'backup-import-failed',
        })
      );
    });
  });

  it('stops the import flow quietly when the user cancels file picking', async () => {
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce(null);

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(SyncService.pickAndParseBackup).toHaveBeenCalledTimes(1);
    });

    expect(mockRestoreEntries).not.toHaveBeenCalled();
    expect(SyncService.extractMediaFromZip).not.toHaveBeenCalled();
    expect(showErrorFeedback).not.toHaveBeenCalled();
  });

  it('shows partial restore feedback when media extraction fails after records are restored', async () => {
    mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [
          {
            id: 'entry-1',
            type: 'photo',
            media: [{ relativeUri: 'media/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
          },
        ],
      },
      zip: {},
    });
    (SyncService.extractMediaFromZip as jest.Mock).mockRejectedValueOnce(new Error('zip extract failed'));

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '部分恢复',
        expect.stringContaining('已恢复 1 条记录，但部分媒体文件未能还原'),
      );
    });

    expect(showErrorFeedback).not.toHaveBeenCalled();
  });

  it('skips media extraction when the import does not restore any new entries', async () => {
    mockRestoreEntries.mockResolvedValueOnce([]);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [
          {
            id: 'entry-1',
            type: 'photo',
            media: [{ relativeUri: 'media/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
          },
        ],
      },
      zip: {},
    });

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('导入成功', '已恢复 0 / 1 条记录');
    });

    expect(SyncService.extractMediaFromZip).not.toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
  });

  it('persists restored media arrays after import extracts files from zip', async () => {
    mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [
          {
            id: 'entry-1',
            type: 'photo',
            media: [{ relativeUri: 'media/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
          },
        ],
      },
      zip: {},
    });
    (SyncService.extractMediaFromZip as jest.Mock).mockResolvedValueOnce([
      {
        id: 'entry-1',
        media: [{ uri: 'file:///documents/media/photos/original/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
      },
    ]);

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', {
        media: [{ uri: 'file:///documents/media/photos/original/photo-1.jpg', mimeType: 'image/jpeg', size: 100 }],
      });
    });
  });

  it('normalizes a legacy single backup media object into a persisted media array after import', async () => {
    mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [
          {
            id: 'entry-1',
            type: 'photo',
            content: '',
            timestamp: 1710000000000,
            media: { relativeUri: 'media/photo-1.jpg', mimeType: 'image/jpeg', size: 100 },
          },
        ],
      },
      zip: {},
    });
    (SyncService.extractMediaFromZip as jest.Mock).mockResolvedValueOnce([
      {
        id: 'entry-1',
        media: [
          {
            uri: 'file:///documents/media/photos/original/photo-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
          },
        ],
      },
    ]);

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(SyncService.normalizeBackupEntries).not.toHaveBeenCalled();
      expect(mockRestoreEntries).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'entry-1',
          type: 'photo',
          content: '',
          timestamp: 1710000000000,
          media: [
            {
              relativeUri: 'media/photo-1.jpg',
              mimeType: 'image/jpeg',
              size: 100,
            },
          ],
        }),
      ]);
      expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', {
        media: [
          {
            uri: 'file:///documents/media/photos/original/photo-1.jpg',
            mimeType: 'image/jpeg',
            size: 100,
          },
        ],
      });
    });
  });
});
