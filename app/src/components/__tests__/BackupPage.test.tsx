import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { BackupPage } from '../BackupPage';
import { BackupService } from '@/src/services/backupService';
import { SyncService } from '../../services/syncService';
import { showAppDialog } from '@/src/services/showAppDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const mockRestoreEntries = jest.fn();
const mockUpdateEntry = jest.fn();

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
    extractMediaFromZip: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/services/showAppDialog', () => ({
  showAppDialog: jest.fn(),
}));

describe('BackupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'android';
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
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '保存成功',
          message: '备份已保存为 latest.zip',
          tone: 'success',
          blocking: true,
        })
      );
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

  it('shows a partial restore dialog when media extraction fails after entries are restored', async () => {
    mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [{ id: 'entry-1', content: 'hello' }],
      },
      zip: { name: 'backup.zip' },
    });
    (SyncService.extractMediaFromZip as jest.Mock).mockRejectedValueOnce(new Error('broken media'));

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '部分恢复',
          message: '已恢复 1 条记录，但部分媒体文件未能还原。您可以重新导入备份尝试恢复媒体。',
          tone: 'success',
          blocking: true,
        })
      );
    });
  });

  it('shows a success dialog after importing entries', async () => {
    mockRestoreEntries.mockResolvedValueOnce(['entry-1']);
    (SyncService.pickAndParseBackup as jest.Mock).mockResolvedValueOnce({
      data: {
        entries: [{ id: 'entry-1', content: 'hello' }, { id: 'entry-2', content: 'world' }],
      },
      zip: { name: 'backup.zip' },
    });
    (SyncService.extractMediaFromZip as jest.Mock).mockResolvedValueOnce([]);

    const { getByText } = render(<BackupPage visible onClose={jest.fn()} />);

    fireEvent.press(getByText('导入'));

    await waitFor(() => {
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '导入成功',
          message: '已恢复 1 / 2 条记录',
          tone: 'success',
          blocking: true,
        })
      );
    });
  });
});
