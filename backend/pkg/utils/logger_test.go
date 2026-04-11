package utils

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.uber.org/zap"
)

func TestInitLogger_WritesHumanReadableLogsToFileAndStdoutInDevelopment(t *testing.T) {
	resetLoggerForTest(t)

	logDir := t.TempDir()
	t.Setenv("LOG_PATH", logDir)
	t.Setenv("ENV", "development")

	stdout := captureStdoutForTest(t)

	if err := InitLogger(); err != nil {
		t.Fatalf("init logger: %v", err)
	}

	GetLogger().Info("development log message", zap.String("scope", "logger-test"))
	Sync()

	consoleOutput := stdout()
	if !strings.Contains(consoleOutput, "development log message") {
		t.Fatalf("expected stdout to contain log message, got %q", consoleOutput)
	}
	if strings.Contains(consoleOutput, "\"level\":") {
		t.Fatalf("expected stdout to be human-readable instead of JSON, got %q", consoleOutput)
	}

	logFile := filepath.Join(logDir, "app.log")
	content, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatalf("read log file: %v", err)
	}

	fileOutput := string(content)
	if !strings.Contains(fileOutput, "development log message") {
		t.Fatalf("expected file to contain log message, got %q", fileOutput)
	}
	if strings.Contains(fileOutput, "\"level\":") {
		t.Fatalf("expected file log to be human-readable instead of JSON, got %q", fileOutput)
	}
}

func TestInitLogger_UsesFileOnlyModeInProduction(t *testing.T) {
	resetLoggerForTest(t)

	logDir := t.TempDir()
	t.Setenv("LOG_PATH", logDir)
	t.Setenv("ENV", "production")

	stdout := captureStdoutForTest(t)

	if err := InitLogger(); err != nil {
		t.Fatalf("init logger: %v", err)
	}

	GetLogger().Info("production log message", zap.String("scope", "logger-test"))
	Sync()

	consoleOutput := strings.TrimSpace(stdout())
	if consoleOutput != "" {
		t.Fatalf("expected production logger not to write to stdout, got %q", consoleOutput)
	}

	logFile := filepath.Join(logDir, "app.log")
	content, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatalf("read log file: %v", err)
	}

	fileOutput := string(content)
	if !strings.Contains(fileOutput, "production log message") {
		t.Fatalf("expected file to contain production log message, got %q", fileOutput)
	}
	if strings.Contains(fileOutput, "\"level\":") {
		t.Fatalf("expected production file log to be human-readable instead of JSON, got %q", fileOutput)
	}
}

func TestGetLogger_FallsBackToHumanReadableConsoleWhenInitFails(t *testing.T) {
	resetLoggerForTest(t)

	blockerPath := filepath.Join(t.TempDir(), "blocked")
	if err := os.WriteFile(blockerPath, []byte("not-a-directory"), 0o644); err != nil {
		t.Fatalf("create blocker file: %v", err)
	}

	t.Setenv("LOG_PATH", filepath.Join(blockerPath, "logs"))
	t.Setenv("ENV", "development")

	stdout := captureStdoutForTest(t)

	GetLogger().Info("fallback log message", zap.String("scope", "logger-test"))
	Sync()

	consoleOutput := stdout()
	if !strings.Contains(consoleOutput, "fallback log message") {
		t.Fatalf("expected fallback console to contain log message, got %q", consoleOutput)
	}
	if !strings.Contains(consoleOutput, "file logger setup failed") {
		t.Fatalf("expected fallback console to report fallback cause, got %q", consoleOutput)
	}
	if strings.Contains(consoleOutput, "\"level\":") {
		t.Fatalf("expected fallback console to be human-readable instead of JSON, got %q", consoleOutput)
	}
}

func TestInitLogger_FallsBackToConsoleWhenFileSetupFails(t *testing.T) {
	resetLoggerForTest(t)

	blockerPath := filepath.Join(t.TempDir(), "blocked")
	if err := os.WriteFile(blockerPath, []byte("not-a-directory"), 0o644); err != nil {
		t.Fatalf("create blocker file: %v", err)
	}

	t.Setenv("LOG_PATH", filepath.Join(blockerPath, "logs"))
	t.Setenv("ENV", "development")

	stdout := captureStdoutForTest(t)

	if err := InitLogger(); err != nil {
		t.Fatalf("expected InitLogger to degrade gracefully, got %v", err)
	}

	GetLogger().Info("degraded init log message", zap.String("scope", "logger-test"))
	Sync()

	consoleOutput := stdout()
	if !strings.Contains(consoleOutput, "degraded init log message") {
		t.Fatalf("expected degraded init stdout to contain log message, got %q", consoleOutput)
	}
	if !strings.Contains(consoleOutput, "file logger setup failed") {
		t.Fatalf("expected degraded init stdout to report fallback cause, got %q", consoleOutput)
	}
	if strings.Contains(consoleOutput, "\"level\":") {
		t.Fatalf("expected degraded init stdout to be human-readable instead of JSON, got %q", consoleOutput)
	}
}

func resetLoggerForTest(t *testing.T) {
	t.Helper()

	if logger != nil {
		_ = logger.Sync()
	}
	if logOutputFile != nil {
		_ = logOutputFile.Close()
		logOutputFile = nil
	}
	logger = nil
}

func captureStdoutForTest(t *testing.T) func() string {
	t.Helper()

	return captureFileDescriptorForTest(t, &os.Stdout)
}

func captureStderrForTest(t *testing.T) func() string {
	t.Helper()

	return captureFileDescriptorForTest(t, &os.Stderr)
}

func captureFileDescriptorForTest(t *testing.T, target **os.File) func() string {
	t.Helper()

	original := *target
	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatalf("create pipe: %v", err)
	}

	*target = writer

	return func() string {
		_ = writer.Close()
		*target = original

		output, err := io.ReadAll(reader)
		if err != nil {
			t.Fatalf("read pipe: %v", err)
		}

		_ = reader.Close()
		return string(output)
	}
}
