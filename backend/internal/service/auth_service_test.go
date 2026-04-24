package service

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/internal/testutil"
	"github.com/daycapsule/backend/pkg/utils"
)

func setupAuthTestDB(t *testing.T) *sql.DB {
	return testutil.SetupTestDB(t)
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

func TestAuthServiceLogoutKeepsUserReadableWhenRefreshTokenCleared(t *testing.T) {
	db := setupAuthTestDB(t)

	authService := NewAuthService(repository.NewUserRepository(db), "test-secret", 24, 48)

	user, _, _, err := authService.Register("logout-user@example.com", "SecurePass123")
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	if err := authService.Logout(user.ID); err != nil {
		t.Fatalf("logout user: %v", err)
	}

	reloadedUser, err := authService.GetUser(user.ID)
	if err != nil {
		t.Fatalf("get user after logout: %v", err)
	}
	if reloadedUser == nil {
		t.Fatal("expected user to remain readable after logout")
	}
	if reloadedUser.ID != user.ID {
		t.Fatalf("expected user id %q, got %#v", user.ID, reloadedUser)
	}
	if reloadedUser.RefreshTokenJTI != nil {
		t.Fatalf("expected refresh token jti to be cleared, got %q", *reloadedUser.RefreshTokenJTI)
	}
	if reloadedUser.RefreshTokenExpiresAt != nil {
		t.Fatalf("expected refresh token expiry to be cleared, got %v", *reloadedUser.RefreshTokenExpiresAt)
	}
}

func generateTokenForTest(userID, email, secret, tokenType string) (string, error) {
	return utils.GenerateToken(userID, email, 24, secret, tokenType)
}

func applySchema(t *testing.T, db *sql.DB) error {
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
			return err
		}
		if _, err := db.Exec(string(schema)); err != nil {
			if !strings.Contains(err.Error(), "duplicate column name") {
				return err
			}
		}
	}
	return nil
}
