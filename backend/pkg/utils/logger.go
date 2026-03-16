package utils

import "go.uber.org/zap"

var logger *zap.Logger

func InitLogger() error {
	var err error
	logger, err = zap.NewProduction()
	return err
}

func GetLogger() *zap.Logger {
	if logger == nil {
		logger, _ = zap.NewProduction()
	}
	return logger
}

func Sync() {
	if logger != nil {
		_ = logger.Sync()
	}
}
