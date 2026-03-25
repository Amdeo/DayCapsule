ALTER TABLE media_files ADD COLUMN sha256 TEXT;
ALTER TABLE media_files ADD COLUMN width INTEGER;
ALTER TABLE media_files ADD COLUMN height INTEGER;
ALTER TABLE media_files ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'healthy';
ALTER TABLE media_files ADD COLUMN validation_error TEXT;
ALTER TABLE media_files ADD COLUMN validated_at TEXT;
ALTER TABLE media_files ADD COLUMN client_local_media_id TEXT;
ALTER TABLE media_files ADD COLUMN client_persisted_hash TEXT;
ALTER TABLE media_files ADD COLUMN upload_trace_id TEXT;
