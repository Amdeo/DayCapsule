package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/pkg/utils"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type stagedMediaFile struct {
	originalPath string
	stagedPath   string
}

type EntryDeleteService struct {
	entryRepo       *repository.EntryRepository
	mediaRepo       *repository.MediaRepository
	renameFile      func(oldPath, newPath string) error
	removeFile      func(path string) error
	buildStagedPath func(path string) string
}

func NewEntryDeleteService(entryRepo *repository.EntryRepository, mediaRepo *repository.MediaRepository) *EntryDeleteService {
	return &EntryDeleteService{
		entryRepo:  entryRepo,
		mediaRepo:  mediaRepo,
		renameFile: os.Rename,
		removeFile: os.Remove,
		buildStagedPath: func(path string) string {
			return fmt.Sprintf("%s.pending-delete.%s", path, uuid.NewString())
		},
	}
}

func (s *EntryDeleteService) Delete(userID, entryID string) error {
	if s == nil || s.entryRepo == nil {
		return errors.New("entry delete service not initialized")
	}

	tx, err := s.entryRepo.BeginTx(context.Background())
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	files, err := s.DeleteTx(tx, userID, entryID)
	if err != nil {
		return err
	}
	stagedFiles, err := s.stageMediaFiles(files)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		if restoreErr := s.restoreStagedMediaFiles(stagedFiles); restoreErr != nil {
			return errors.Join(err, restoreErr)
		}
		return err
	}
	committed = true
	s.cleanupStagedMediaFiles(stagedFiles)
	return nil
}

func (s *EntryDeleteService) DeleteTx(tx *sql.Tx, userID, entryID string) ([]*models.MediaFile, error) {
	if s == nil || s.entryRepo == nil {
		return nil, errors.New("entry delete service not initialized")
	}

	existing, err := s.entryRepo.GetByIDTx(tx, userID, entryID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.New("entry not found")
	}

	files, err := s.getLinkedMediaFilesTx(tx, userID, entryID)
	if err != nil {
		return nil, err
	}
	if s.mediaRepo != nil {
		if err := s.mediaRepo.DeleteByEntryIDTx(tx, userID, entryID); err != nil {
			return nil, err
		}
	}
	if err := s.entryRepo.DeleteTx(tx, userID, entryID); err != nil {
		return nil, err
	}
	return files, nil
}

func (s *EntryDeleteService) getLinkedMediaFilesTx(tx *sql.Tx, userID, entryID string) ([]*models.MediaFile, error) {
	if s.mediaRepo == nil {
		return nil, nil
	}

	files, err := s.mediaRepo.GetByEntryIDTx(tx, entryID)
	if err != nil {
		return nil, err
	}

	filtered := make([]*models.MediaFile, 0, len(files))
	for _, file := range files {
		if file != nil && file.UserID == userID {
			filtered = append(filtered, file)
		}
	}
	return filtered, nil
}

func (s *EntryDeleteService) removeMediaFiles(files []*models.MediaFile) error {
	stagedFiles, err := s.stageMediaFiles(files)
	if err != nil {
		return err
	}
	return s.removeStagedMediaFiles(stagedFiles)
}

func (s *EntryDeleteService) stageMediaFiles(files []*models.MediaFile) ([]stagedMediaFile, error) {
	if len(files) == 0 {
		return nil, nil
	}

	stagedFiles := make([]stagedMediaFile, 0, len(files))
	for _, file := range files {
		if file == nil {
			continue
		}
		if file.StoragePath == "" {
			baseErr := fmt.Errorf("media %s has empty storage path", file.ID)
			if restoreErr := s.restoreStagedMediaFiles(stagedFiles); restoreErr != nil {
				return nil, errors.Join(baseErr, restoreErr)
			}
			return nil, baseErr
		}

		stagedPath := s.buildStagedPath(file.StoragePath)
		if err := s.renameFile(file.StoragePath, stagedPath); err != nil {
			baseErr := fmt.Errorf("stage media file %s: %w", file.StoragePath, err)
			if restoreErr := s.restoreStagedMediaFiles(stagedFiles); restoreErr != nil {
				return nil, errors.Join(baseErr, restoreErr)
			}
			return nil, baseErr
		}
		stagedFiles = append(stagedFiles, stagedMediaFile{
			originalPath: file.StoragePath,
			stagedPath:   stagedPath,
		})
	}
	return stagedFiles, nil
}

func (s *EntryDeleteService) restoreStagedMediaFiles(files []stagedMediaFile) error {
	var firstErr error
	for i := len(files) - 1; i >= 0; i-- {
		file := files[i]
		if err := s.renameFile(file.stagedPath, file.originalPath); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("restore staged media file %s: %w", file.originalPath, err)
		}
	}
	return firstErr
}

func (s *EntryDeleteService) removeStagedMediaFiles(files []stagedMediaFile) error {
	var firstErr error
	for _, file := range files {
		if err := s.removeFile(file.stagedPath); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("remove staged media file %s: %w", file.originalPath, err)
		}
	}
	return firstErr
}

func (s *EntryDeleteService) cleanupStagedMediaFiles(files []stagedMediaFile) {
	if err := s.removeStagedMediaFiles(files); err != nil {
		utils.GetLogger().Warn("cleanup staged media files failed", zap.Error(err))
	}
}
