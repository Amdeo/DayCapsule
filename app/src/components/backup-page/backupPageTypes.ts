export type BackupFile = {
  name: string;
  uri: string;
  sizeBytes?: number;
};

export type ExportTarget = {
  name: string;
  uri: string;
} | null;
