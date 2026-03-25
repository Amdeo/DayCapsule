package config

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func EnsureSchema(db *sql.DB) error {
	migrations := []string{
		"001_initial_schema.up.sql",
		"002_entries_media.up.sql",
		"003_entry_changes.up.sql",
		"004_media_integrity.up.sql",
	}

	for _, m := range migrations {
		path := filepath.Join("migrations", m)
		schema, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", m, err)
		}
		if err := execMigrationStatements(db, string(schema)); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", m, err)
		}
	}

	return nil
}

func execMigrationStatements(db *sql.DB, schema string) error {
	for _, statement := range strings.Split(schema, ";") {
		trimmed := strings.TrimSpace(statement)
		if trimmed == "" {
			continue
		}

		if _, err := db.Exec(trimmed); err != nil {
			if strings.Contains(err.Error(), "duplicate column name") {
				continue
			}
			return err
		}
	}

	return nil
}
