//go:build !windows
// +build !windows

package services

import "os/exec"

func hideWindow(cmd *exec.Cmd) {
	// Do nothing on non-Windows platforms
}
