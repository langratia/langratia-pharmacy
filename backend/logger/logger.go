package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	mu       sync.Mutex
	logFile  io.Writer
	logger   *log.Logger
	logDir   string
	enabled  = true
)

// Init sets up the logging system. LogDir is optional; if empty, logs go to os.Stderr.
func Init(logDirPath string) error {
	mu.Lock()
	defer mu.Unlock()

	if logDirPath == "" {
		logger = log.New(os.Stderr, "", log.Ldate|log.Ltime|log.Lshortfile)
		return nil
	}

	logDir = logDirPath
	if err := os.MkdirAll(logDirPath, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	return openLogFile()
}

func openLogFile() error {
	logPath := filepath.Join(logDir, fmt.Sprintf("langratia-%s.log", time.Now().Format("2006-01-02")))
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}
	logFile = f
	logger = log.New(io.MultiWriter(os.Stderr, f), "", log.Ldate|log.Ltime|log.Lshortfile)
	return nil
}

// SetEnabled controls whether logging is active.
func SetEnabled(e bool) {
	mu.Lock()
	defer mu.Unlock()
	enabled = e
}

func Info(format string, v ...interface{}) {
	mu.Lock()
	defer mu.Unlock()
	if logger != nil && enabled {
		logger.Output(2, fmt.Sprintf("[INFO] "+format, v...))
	}
}

func Warn(format string, v ...interface{}) {
	mu.Lock()
	defer mu.Unlock()
	if logger != nil && enabled {
		logger.Output(2, fmt.Sprintf("[WARN] "+format, v...))
	}
}

func Error(format string, v ...interface{}) {
	mu.Lock()
	defer mu.Unlock()
	if logger != nil && enabled {
		logger.Output(2, fmt.Sprintf("[ERROR] "+format, v...))
	}
}
