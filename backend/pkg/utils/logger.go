package utils

import (
	"os"
	"path/filepath"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var logger *zap.Logger
var logOutputFile *os.File

func InitLogger() error {
	if logOutputFile != nil {
		_ = logOutputFile.Close()
		logOutputFile = nil
	}

	logDir := getLogEnv("LOG_PATH", "./logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		logger = newFallbackLogger(consoleWriteSyncer())
		logger.Warn("file logger setup failed; using console fallback",
			zap.Error(err),
			zap.String("logPath", logDir),
		)
		return nil
	}

	logFilePath := filepath.Join(logDir, getLogEnv("LOG_FILE_NAME", "app.log"))
	file, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o666)
	if err != nil {
		logger = newFallbackLogger(consoleWriteSyncer())
		logger.Warn("file logger setup failed; using console fallback",
			zap.Error(err),
			zap.String("logFile", logFilePath),
		)
		return nil
	}

	logOutputFile = file

	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "time"
	encoderConfig.LevelKey = "level"
	encoderConfig.NameKey = "logger"
	encoderConfig.CallerKey = "caller"
	encoderConfig.MessageKey = "msg"
	encoderConfig.StacktraceKey = "stacktrace"
	encoderConfig.LineEnding = zapcore.DefaultLineEnding
	encoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05")
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder

	level := zap.NewAtomicLevelAt(parseLogLevel())
	cores := []zapcore.Core{
		zapcore.NewCore(zapcore.NewConsoleEncoder(encoderConfig), zapcore.AddSync(file), level),
	}

	if strings.ToLower(os.Getenv("ENV")) != "production" {
		cores = append(cores, zapcore.NewCore(zapcore.NewConsoleEncoder(encoderConfig), zapcore.AddSync(os.Stdout), level))
	}

	logger = zap.New(
		zapcore.NewTee(cores...),
		zap.AddCaller(),
		zap.ErrorOutput(zapcore.AddSync(os.Stderr)),
	)

	return nil
}

func GetLogger() *zap.Logger {
	if logger == nil {
		if err := InitLogger(); err != nil {
			logger = newFallbackLogger(zapcore.AddSync(os.Stderr))
			logger.Warn("logger initialization failed; using stderr fallback", zap.Error(err))
		}
	}
	return logger
}

func Sync() {
	if logger != nil {
		_ = logger.Sync()
	}
	if logOutputFile != nil {
		_ = logOutputFile.Sync()
	}
}

func getLogEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseLogLevel() zapcore.Level {
	level := zapcore.InfoLevel
	if err := level.Set(getLogEnv("LOG_LEVEL", "info")); err != nil {
		return zapcore.InfoLevel
	}
	return level
}

func consoleWriteSyncer() zapcore.WriteSyncer {
	if strings.ToLower(os.Getenv("ENV")) == "production" {
		return zapcore.AddSync(os.Stderr)
	}
	return zapcore.AddSync(os.Stdout)
}

func newFallbackLogger(writeSyncer zapcore.WriteSyncer) *zap.Logger {
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "time"
	encoderConfig.LevelKey = "level"
	encoderConfig.NameKey = "logger"
	encoderConfig.CallerKey = "caller"
	encoderConfig.MessageKey = "msg"
	encoderConfig.StacktraceKey = "stacktrace"
	encoderConfig.LineEnding = zapcore.DefaultLineEnding
	encoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05")
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder

	return zap.New(
		zapcore.NewCore(zapcore.NewConsoleEncoder(encoderConfig), writeSyncer, zap.NewAtomicLevelAt(parseLogLevel())),
		zap.AddCaller(),
		zap.ErrorOutput(writeSyncer),
	)
}
