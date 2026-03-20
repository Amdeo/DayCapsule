package service

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/pkg/utils"
)

func setupAuthTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "auth-test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := applySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}

	return db
}

func TestAuthServiceRegisterAndLoginWithSQLite(t *testing.T) {
	db := setupAuthTestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	authService := NewAuthService(repository.NewUserRepository(db), "test-secret", 24, 48)

	user, accessToken, refreshToken, err := authService.Register("user@example.com", "SecurePass123")
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	if user == nil || user.ID == "" {
		t.Fatalf("expected registered user with id, got %#v", user)
	}

	if accessToken == "" || refreshToken == "" {
		t.Fatalf("expected non-empty tokens, got access=%q refresh=%q", accessToken, refreshToken)
	}

	loggedInUser, _, _, err := authService.Login("user@example.com", "SecurePass123")
	if err != nil {
		t.Fatalf("login user: %v", err)
	}

	if loggedInUser == nil || loggedInUser.ID != user.ID {
		t.Fatalf("expected login to return same user id %q, got %#v", user.ID, loggedInUser)
	}
}

func TestAuthServiceRefreshRejectsAccessToken(t *testing.T) {
	authService := NewAuthService(nil, "test-secret", 24, 48)

	accessToken, err := generateAccessTokenForTest("user-1", "user@example.com", "test-secret")
	if err != nil {
		t.Fatalf("generate access token: %v", err)
	}

	if _, _, err := authService.RefreshToken(accessToken); err == nil {
		t.Fatal("expected refresh with access token to fail")
	}
}

func generateTokenForTest(userID, email, secret, tokenType string) (string, error) {
	return utils.GenerateToken(userID, email, 24, secret, tokenType)
}

func applySchema(t *testing.T, db *sql.DB) error {
	t.Helper()

	schemaPath := filepath.Join("..", "..", "migrations", "001_initial_schema.up.sql")
	schema, err := os.ReadFile(schemaPath)
	if err != nil {
		return err
	}

	_, err = db.Exec(string(schema))
	return err
}
