import { formatDetailedTime } from '@/src/utils/timeUtils';

export function formatBackupName(name: string): string {
  const match = name.match(/backup_(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/);
  if (!match) {
    return name;
  }

  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

export function formatLastBackupTime(timestamp: number | null): string {
  if (!timestamp) {
    return '从未备份';
  }

  return formatDetailedTime(timestamp);
}

export function getFileNameFromUri(uri: string): string {
  return uri.split('/').pop() ?? 'backup.zip';
}

export function formatBackupFileSize(sizeBytes?: number): string | null {
  if (sizeBytes === undefined) {
    return null;
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}
