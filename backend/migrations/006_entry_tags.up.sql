CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (entry_id, tag),
    FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_id ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag);
CREATE INDEX IF NOT EXISTS idx_entry_tags_user_id ON entry_tags(user_id);

INSERT OR IGNORE INTO entry_tags (entry_id, tag, user_id)
SELECT entries.id, json_each.value, entries.user_id
FROM entries
JOIN json_each(CASE WHEN json_valid(entries.tags) THEN entries.tags ELSE '[]' END)
WHERE typeof(json_each.value) = 'text'
  AND json_each.value <> '';
