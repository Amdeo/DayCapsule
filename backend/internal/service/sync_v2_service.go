package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

// SyncV2Service: 基于 changeId cursor 的增量同步服务（独立于备份 /sync/upload|download）。

type syncV2EntryStore interface {
	GetByID(userID, entryID string) (*models.Entry, error)
	InsertFromSync(userID string, entry *models.Entry) (*models.Entry, error)
	UpdateFromSyncIfVersionMatches(userID string, entry *models.Entry, baseUpdatedAt time.Time) (repository.UpdateFromSyncMatchResult, error)
	Delete(userID, entryID string) error
}

type syncV2ChangeStore interface {
	AppendChange(ctx context.Context, userID string, op string, entry *models.Entry) (int64, error)
	ListSinceCursor(ctx context.Context, userID string, cursor int64, limit int) ([]*models.EntryChange, error)
}

type SyncV2Service struct {
	entryRepo    syncV2EntryStore
	changeRepo   syncV2ChangeStore
	entryRepoDB  *repository.EntryRepository
	changeRepoDB *repository.ChangeRepository
	mediaRepo    *repository.MediaRepository
}

func NewSyncV2Service(entryRepo *repository.EntryRepository, changeRepo *repository.ChangeRepository, mediaRepo ...*repository.MediaRepository) *SyncV2Service {
	svc := newSyncV2Service(entryRepo, changeRepo)
	svc.entryRepoDB = entryRepo
	svc.changeRepoDB = changeRepo
	if len(mediaRepo) > 0 {
		svc.mediaRepo = mediaRepo[0]
	}
	return svc
}

func newSyncV2Service(entryRepo syncV2EntryStore, changeRepo syncV2ChangeStore) *SyncV2Service {
	return &SyncV2Service{entryRepo: entryRepo, changeRepo: changeRepo}
}

// Client → Server 变更

type ClientChange struct {
	ChangeID      string       `json:"changeId"`
	Op            string       `json:"op"`            // create/update/delete
	Entry         models.Entry `json:"entry"`         // 使用 Entry 作为载体
	BaseUpdatedAt *time.Time   `json:"baseUpdatedAt"` // 客户端编辑时看到的服务器 updatedAt
}

type SyncRequest struct {
	Cursor        int64          `json:"cursor"`   // 上次同步的 changeId，首次为 0
	DeviceID      string         `json:"deviceId"` // 当前设备 ID（暂未使用，预留）
	ClientChanges []ClientChange `json:"clientChanges"`
}

// Server → Client 变更

type ServerChange struct {
	ChangeID  int64        `json:"changeId"`
	Op        string       `json:"op"`
	Entry     models.Entry `json:"entry"`
	ChangedAt time.Time    `json:"changedAt"`
}

type Conflict struct {
	ChangeID    string       `json:"changeId"`
	EntryID     string       `json:"entryId"`
	Reason      string       `json:"reason"`
	ServerEntry models.Entry `json:"serverEntry"`
	ClientEntry models.Entry `json:"clientEntry"`
}

type SyncResult struct {
	ChangeID string `json:"changeId"`
	Status   string `json:"status"`
	EntryID  string `json:"entryId"`
}

type SyncResponse struct {
	NewCursor     int64          `json:"newCursor"`
	Results       []SyncResult   `json:"results"`
	ServerChanges []ServerChange `json:"serverChanges"`
	Conflicts     []Conflict     `json:"conflicts"`
}

// Sync 应用客户端变更并返回增量变更 + 冲突信息。
// 真实 DB repository 路径会把 entry 写入与 change log 追加放进同一事务；
// 测试 doubles 仍走原有接口路径，避免扩大 mock 改动面。
func (s *SyncV2Service) Sync(ctx context.Context, userID string, req *SyncRequest) (*SyncResponse, error) {
	if s.entryRepo == nil || s.changeRepo == nil {
		return nil, errors.New("sync service not initialized")
	}

	// 1. 处理客户端变更
	var (
		results   = make([]SyncResult, 0)
		conflicts []Conflict
	)
	for _, cc := range req.ClientChanges {
		entry := cc.Entry
		if entry.ID == "" {
			results = append(results, SyncResult{
				ChangeID: cc.ChangeID,
				Status:   "ignored",
				EntryID:  entry.ID,
			})
			continue
		}

		if s.supportsTransactionalWrites() {
			switch cc.Op {
			case "create":
				result, err := s.applyCreateTx(ctx, userID, cc.ChangeID, &entry)
				if err != nil {
					return nil, err
				}
				results = append(results, result)
				continue
			case "update":
				result, conflict, err := s.applyUpdateTx(ctx, userID, cc.ChangeID, cc.BaseUpdatedAt, &entry)
				if err != nil {
					return nil, err
				}
				results = append(results, result)
				if conflict != nil {
					conflicts = append(conflicts, *conflict)
				}
				continue
			case "delete":
				result, err := s.applyDeleteTx(ctx, userID, cc.ChangeID, &entry)
				if err != nil {
					return nil, err
				}
				results = append(results, result)
				continue
			}
		}

		existing, err := s.entryRepo.GetByID(userID, entry.ID)
		if err != nil {
			return nil, err
		}

		switch cc.Op {
		case "create":
			if existing != nil {
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "ignored",
					EntryID:  entry.ID,
				})
				continue
			}

			if _, err := s.insertEntry(ctx, userID, &entry); err != nil {
				return nil, err
			}
			results = append(results, SyncResult{
				ChangeID: cc.ChangeID,
				Status:   "applied",
				EntryID:  entry.ID,
			})

		case "update":
			if existing == nil {
				// 本地认为是更新，但服务器不存在 → 视作创建
				if _, err := s.insertEntry(ctx, userID, &entry); err != nil {
					return nil, err
				}
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "applied",
					EntryID:  entry.ID,
				})
				continue
			}

			baseUpdatedAt := existing.UpdatedAt
			if cc.BaseUpdatedAt != nil {
				baseUpdatedAt = *cc.BaseUpdatedAt
			}

			entry.UpdatedAt = time.Now().UTC()
			entry.SyncStatus = "synced"

			updateResult, err := s.entryRepo.UpdateFromSyncIfVersionMatches(userID, &entry, baseUpdatedAt)
			if err != nil {
				return nil, err
			}

			switch updateResult {
			case repository.UpdateFromSyncUpdated:
				persisted, err := s.entryRepo.GetByID(userID, entry.ID)
				if err != nil {
					return nil, err
				}
				if persisted == nil {
					return nil, errors.New("updated entry missing after sync")
				}
				if err := s.linkEntryMedia(persisted); err != nil {
					return nil, err
				}
				if _, err := s.changeRepo.AppendChange(ctx, userID, "update", persisted); err != nil {
					return nil, err
				}
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "applied",
					EntryID:  entry.ID,
				})
			case repository.UpdateFromSyncVersionMismatch:
				latest, err := s.entryRepo.GetByID(userID, entry.ID)
				if err != nil {
					return nil, err
				}
				if latest == nil {
					return nil, errors.New("conflicted entry missing after sync")
				}
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "conflicted",
					EntryID:  entry.ID,
				})
				conflicts = append(conflicts, Conflict{
					ChangeID:    cc.ChangeID,
					EntryID:     entry.ID,
					Reason:      "server_newer_than_base",
					ServerEntry: *latest,
					ClientEntry: entry,
				})
			case repository.UpdateFromSyncMissing:
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "ignored",
					EntryID:  entry.ID,
				})
			default:
				return nil, errors.New("unknown conditional update result")
			}

		case "delete":
			if existing == nil {
				results = append(results, SyncResult{
					ChangeID: cc.ChangeID,
					Status:   "ignored",
					EntryID:  entry.ID,
				})
				continue
			}
			if err := s.entryRepo.Delete(userID, entry.ID); err != nil {
				return nil, err
			}
			if _, err := s.changeRepo.AppendChange(ctx, userID, "delete", existing); err != nil {
				return nil, err
			}
			results = append(results, SyncResult{
				ChangeID: cc.ChangeID,
				Status:   "applied",
				EntryID:  entry.ID,
			})
		default:
			results = append(results, SyncResult{
				ChangeID: cc.ChangeID,
				Status:   "ignored",
				EntryID:  entry.ID,
			})
		}
	}

	resp := &SyncResponse{
		Results:   results,
		Conflicts: conflicts,
	}
	maxCursor := req.Cursor

	// 2. 拉取增量：没有分页协议时分批拉到耗尽，避免静默截断。
	cursor := req.Cursor
	for {
		changes, err := s.changeRepo.ListSinceCursor(ctx, userID, cursor, 500)
		if err != nil {
			return nil, err
		}
		if len(changes) == 0 {
			break
		}

		for _, ch := range changes {
			var snap models.Entry
			if err := json.Unmarshal(ch.Snapshot, &snap); err != nil {
				continue
			}
			resp.ServerChanges = append(resp.ServerChanges, ServerChange{
				ChangeID:  ch.ChangeID,
				Op:        ch.Op,
				Entry:     snap,
				ChangedAt: ch.ChangedAt,
			})
			if ch.ChangeID > maxCursor {
				maxCursor = ch.ChangeID
			}
		}

		if len(changes) < 500 {
			break
		}
		cursor = changes[len(changes)-1].ChangeID
	}

	resp.NewCursor = maxCursor
	return resp, nil
}

func (s *SyncV2Service) supportsTransactionalWrites() bool {
	return s.entryRepoDB != nil && s.changeRepoDB != nil
}

func (s *SyncV2Service) applyCreateTx(ctx context.Context, userID, changeID string, entry *models.Entry) (SyncResult, error) {
	tx, err := s.entryRepoDB.BeginTx(ctx)
	if err != nil {
		return SyncResult{}, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	existing, err := s.entryRepoDB.GetByIDTx(tx, userID, entry.ID)
	if err != nil {
		return SyncResult{}, err
	}
	if existing != nil {
		return SyncResult{
			ChangeID: changeID,
			Status:   "ignored",
			EntryID:  entry.ID,
		}, nil
	}

	saved, err := s.insertEntryTx(ctx, tx, userID, entry)
	if err != nil {
		return SyncResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return SyncResult{}, err
	}
	committed = true
	return SyncResult{
		ChangeID: changeID,
		Status:   "applied",
		EntryID:  saved.ID,
	}, nil
}

func (s *SyncV2Service) applyUpdateTx(
	ctx context.Context,
	userID, changeID string,
	baseUpdatedAt *time.Time,
	entry *models.Entry,
) (SyncResult, *Conflict, error) {
	tx, err := s.entryRepoDB.BeginTx(ctx)
	if err != nil {
		return SyncResult{}, nil, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	existing, err := s.entryRepoDB.GetByIDTx(tx, userID, entry.ID)
	if err != nil {
		return SyncResult{}, nil, err
	}
	if existing == nil {
		saved, err := s.insertEntryTx(ctx, tx, userID, entry)
		if err != nil {
			return SyncResult{}, nil, err
		}
		if err := tx.Commit(); err != nil {
			return SyncResult{}, nil, err
		}
		committed = true
		return SyncResult{
			ChangeID: changeID,
			Status:   "applied",
			EntryID:  saved.ID,
		}, nil, nil
	}

	base := existing.UpdatedAt
	if baseUpdatedAt != nil {
		base = *baseUpdatedAt
	}

	entry.UpdatedAt = time.Now().UTC()
	entry.SyncStatus = "synced"

	updateResult, err := s.entryRepoDB.UpdateFromSyncIfVersionMatchesTx(tx, userID, entry, base)
	if err != nil {
		return SyncResult{}, nil, err
	}

	switch updateResult {
	case repository.UpdateFromSyncUpdated:
		persisted, err := s.entryRepoDB.GetByIDTx(tx, userID, entry.ID)
		if err != nil {
			return SyncResult{}, nil, err
		}
		if persisted == nil {
			return SyncResult{}, nil, errors.New("updated entry missing after sync")
		}
		if err := s.linkEntryMediaTx(tx, persisted); err != nil {
			return SyncResult{}, nil, err
		}
		if _, err := s.changeRepoDB.AppendChangeTx(ctx, tx, userID, "update", persisted); err != nil {
			return SyncResult{}, nil, err
		}
		if err := tx.Commit(); err != nil {
			return SyncResult{}, nil, err
		}
		committed = true
		return SyncResult{
			ChangeID: changeID,
			Status:   "applied",
			EntryID:  entry.ID,
		}, nil, nil
	case repository.UpdateFromSyncVersionMismatch:
		latest, err := s.entryRepoDB.GetByIDTx(tx, userID, entry.ID)
		if err != nil {
			return SyncResult{}, nil, err
		}
		if latest == nil {
			return SyncResult{}, nil, errors.New("conflicted entry missing after sync")
		}
		return SyncResult{
				ChangeID: changeID,
				Status:   "conflicted",
				EntryID:  entry.ID,
			}, &Conflict{
				ChangeID:    changeID,
				EntryID:     entry.ID,
				Reason:      "server_newer_than_base",
				ServerEntry: *latest,
				ClientEntry: *entry,
			}, nil
	case repository.UpdateFromSyncMissing:
		return SyncResult{
			ChangeID: changeID,
			Status:   "ignored",
			EntryID:  entry.ID,
		}, nil, nil
	default:
		return SyncResult{}, nil, errors.New("unknown conditional update result")
	}
}

func (s *SyncV2Service) applyDeleteTx(ctx context.Context, userID, changeID string, entry *models.Entry) (SyncResult, error) {
	tx, err := s.entryRepoDB.BeginTx(ctx)
	if err != nil {
		return SyncResult{}, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	existing, err := s.entryRepoDB.GetByIDTx(tx, userID, entry.ID)
	if err != nil {
		return SyncResult{}, err
	}
	if existing == nil {
		return SyncResult{
			ChangeID: changeID,
			Status:   "ignored",
			EntryID:  entry.ID,
		}, nil
	}
	if err := s.entryRepoDB.DeleteTx(tx, userID, entry.ID); err != nil {
		return SyncResult{}, err
	}
	if _, err := s.changeRepoDB.AppendChangeTx(ctx, tx, userID, "delete", existing); err != nil {
		return SyncResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return SyncResult{}, err
	}
	committed = true
	return SyncResult{
		ChangeID: changeID,
		Status:   "applied",
		EntryID:  entry.ID,
	}, nil
}

// insertEntry 封装从同步请求创建 entry 的逻辑，并记录变更。
func (s *SyncV2Service) insertEntry(ctx context.Context, userID string, entry *models.Entry) (*models.Entry, error) {
	s.prepareEntryForInsert(userID, entry)

	saved, err := s.entryRepo.InsertFromSync(userID, entry)
	if err != nil {
		return nil, err
	}
	if err := s.linkEntryMedia(saved); err != nil {
		return nil, err
	}
	if _, err := s.changeRepo.AppendChange(ctx, userID, "create", saved); err != nil {
		return nil, err
	}
	return saved, nil
}

func (s *SyncV2Service) insertEntryTx(ctx context.Context, tx *sql.Tx, userID string, entry *models.Entry) (*models.Entry, error) {
	s.prepareEntryForInsert(userID, entry)

	saved, err := s.entryRepoDB.InsertFromSyncTx(tx, userID, entry)
	if err != nil {
		return nil, err
	}
	if err := s.linkEntryMediaTx(tx, saved); err != nil {
		return nil, err
	}
	if _, err := s.changeRepoDB.AppendChangeTx(ctx, tx, userID, "create", saved); err != nil {
		return nil, err
	}
	return saved, nil
}

func (s *SyncV2Service) prepareEntryForInsert(userID string, entry *models.Entry) {
	// 对于从客户端来的数据，CreatedAt/UpdatedAt 为空时使用当前时间
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = entry.CreatedAt
	}
	entry.UserID = userID
	entry.SyncStatus = "synced"
}

func (s *SyncV2Service) linkEntryMedia(entry *models.Entry) error {
	if s.mediaRepo == nil || entry == nil {
		return nil
	}

	for _, mediaID := range mediaIDsFromJSON(entry.Media) {
		if err := s.mediaRepo.LinkToEntry(mediaID, entry.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s *SyncV2Service) linkEntryMediaTx(tx *sql.Tx, entry *models.Entry) error {
	if s.mediaRepo == nil || entry == nil {
		return nil
	}

	for _, mediaID := range mediaIDsFromJSON(entry.Media) {
		if err := s.mediaRepo.LinkToEntryTx(tx, mediaID, entry.ID); err != nil {
			return err
		}
	}
	return nil
}
