package config

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

func EnsureSchema(db *sql.DB) error {
	migrations := []string{
		"001_initial_schema.up.sql",
		"002_entries_media.up.sql",
	}

	for _, m := range migrations {
		path := filepath.Join("migrations", m)
		schema, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", m, err)
		}
		if _, err := db.Exec(string(schema)); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", m, err)
		}
	}

	return nil
}
