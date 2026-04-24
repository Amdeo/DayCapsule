// Package testutil provides shared test helpers for the backend.
package testutil

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/daycapsule/backend/internal/config"
)

// SetupTestDB creates a new SQLite test database, applies all migrations,
// and registers t.Cleanup to close the connection.
func SetupTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := ApplySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// ApplySchema runs all migration files against the given database.
// Duplicate column errors are silently ignored so the helper is idempotent.
func ApplySchema(t *testing.T, db *sql.DB) error {
	t.Helper()

	migrations := []string{
		"001_initial_schema.up.sql",
		"002_entries_media.up.sql",
		"003_entry_changes.up.sql",
		"004_media_integrity.up.sql",
		"005_refresh_token.up.sql",
		"006_entry_tags.up.sql",
	}

	for _, m := range migrations {
		schemaPath := filepath.Join("..", "..", "migrations", m)
		schema, err := os.ReadFile(schemaPath)
		if err != nil {
			// When tests run from a sub-package, adjust the relative path.
			schemaPath = filepath.Join("..", "..", "..", "migrations", m)
			schema, err = os.ReadFile(schemaPath)
			if err != nil {
				return err
			}
		}
		if _, err := db.Exec(string(schema)); err != nil {
			if !strings.Contains(err.Error(), "duplicate column name") {
				return err
			}
		}
	}
	return nil
}
