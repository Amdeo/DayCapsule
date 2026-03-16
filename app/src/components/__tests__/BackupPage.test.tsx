import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { BackupPage } from '../BackupPage';

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
    restoreEntries: jest.fn(),
    updateEntry: jest.fn(),
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
    getLastBackupTime: jest.fn().mockResolvedValue(1_710_000_000_000),
    createBackup: jest.fn(),
  },
}));

jest.mock('@/src/services/syncService', () => ({
  SyncService: {
    isICloudAvailable: jest.fn(() => false),
    pickAndParseBackup: jest.fn(),
    extractMediaFromZip: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('BackupPage', () => {
  it('renders backup history and bottom iCloud section when backups exist', async () => {
    const { getByText } = render(
      <BackupPage visible onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByText('备份历史')).toBeTruthy();
      expect(getByText('iCloud 同步')).toBeTruthy();
    });
  });
});
