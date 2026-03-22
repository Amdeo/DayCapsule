package models

import "time"

type EntryChange struct {
	ChangeID  int64     `json:"changeId" db:"change_id"`
	UserID    string    `json:"userId" db:"user_id"`
	EntryID   string    `json:"entryId" db:"entry_id"`
	Op        string    `json:"op" db:"op"` // create/update/delete
	Snapshot  []byte    `json:"snapshot" db:"snapshot"` // JSON blob of entry (EntryResponse-like)
	ChangedAt time.Time `json:"changedAt" db:"changed_at"`
}
