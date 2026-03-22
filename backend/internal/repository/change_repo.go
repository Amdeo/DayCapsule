package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/daycapsule/backend/internal/models"
)

type ChangeRepository struct {
	db *sql.DB
}

type changeExecer interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
}

func NewChangeRepository(db *sql.DB) *ChangeRepository {
	return &ChangeRepository{db: db}
}

// AppendChange 追加一条变更流水，Snapshot 一般为 EntryResponse 视图
func (r *ChangeRepository) AppendChange(ctx context.Context, userID string, op string, entry *models.Entry) (int64, error) {
	return r.appendChange(ctx, r.db, userID, op, entry)
}

func (r *ChangeRepository) AppendChangeTx(ctx context.Context, tx *sql.Tx, userID string, op string, entry *models.Entry) (int64, error) {
	return r.appendChange(ctx, tx, userID, op, entry)
}

func (r *ChangeRepository) appendChange(ctx context.Context, execer changeExecer, userID string, op string, entry *models.Entry) (int64, error) {
	// 这里用 Entry 模型做快照；如果以后需要更多字段，可以换成 EntryResponse
	snapshotBytes, err := json.Marshal(entry)
	if err != nil {
		return 0, err
	}

	res, err := execer.ExecContext(ctx,
		`INSERT INTO entry_changes (user_id, entry_id, op, snapshot, changed_at)
		 VALUES (?, ?, ?, ?, ?)`,
		userID, entry.ID, op, snapshotBytes, time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		return 0, err
	}

	return res.LastInsertId()
}

// ListSinceCursor 按 userId + changeId 拉取增量
func (r *ChangeRepository) ListSinceCursor(ctx context.Context, userID string, cursor int64, limit int) ([]*models.EntryChange, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT change_id, user_id, entry_id, op, snapshot, changed_at
		 FROM entry_changes
		 WHERE user_id = ? AND change_id > ?
		 ORDER BY change_id ASC
		 LIMIT ?`,
		userID, cursor, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var changes []*models.EntryChange
	for rows.Next() {
		var c models.EntryChange
		var changedAtStr string
		if err := rows.Scan(&c.ChangeID, &c.UserID, &c.EntryID, &c.Op, &c.Snapshot, &changedAtStr); err != nil {
			return nil, err
		}
		if t, err := time.Parse(time.RFC3339, changedAtStr); err == nil {
			c.ChangedAt = t
		}
		changes = append(changes, &c)
	}

	return changes, rows.Err()
}
