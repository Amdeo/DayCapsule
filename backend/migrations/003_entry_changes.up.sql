CREATE TABLE IF NOT EXISTS entry_changes (
    change_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    entry_id    TEXT    NOT NULL,
    op          TEXT    NOT NULL,
    snapshot    BLOB    NOT NULL,
    changed_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entry_changes_user_change
  ON entry_changes(user_id, change_id);
