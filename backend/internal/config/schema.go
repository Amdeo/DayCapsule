package config

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

func EnsureSchema(db *sql.DB) error {
	schemaPath := filepath.Join("migrations", "001_initial_schema.up.sql")
	schema, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to read schema file: %w", err)
	}

	if _, err := db.Exec(string(schema)); err != nil {
		return fmt.Errorf("failed to apply schema: %w", err)
	}

	return nil
}
