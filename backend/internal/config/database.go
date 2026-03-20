package config

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

func NewDB(databasePath string) (*sql.DB, error) {
	if databasePath == "" {
		databasePath = "./data/daycapsule.db"
	}

	dir := filepath.Dir(databasePath)
	if dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}
	}

	dsn := databasePath
	if strings.Contains(dsn, "?") {
		dsn += "&_pragma=foreign_keys(1)"
	} else {
		dsn += "?_pragma=foreign_keys(1)"
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}
