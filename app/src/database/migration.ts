/**
 * 数据迁移门面
 * 从 AsyncStorage 迁移到 SQLite，以及历次 schema 列迁移
 */

export {
  checkMigrationStatus,
  migrateFromAsyncStorage,
  rollbackMigration,
  getMigrationInfo,
} from './migrations/legacyDataMigration';

export {
  migrateTagsToNormalized,
  migrateEntriesContentToFts,
  migrateMediaMetadataColumns,
  migrateToMediaJson,
  migrateSyncStatusColumn,
  migrateCloudSyncCoreColumns,
  migrateLocalReadyStateColumn,
} from './migrations/schemaMigrations';
