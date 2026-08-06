# 18. Deployment & Packaging

## 1. Overview
The Langratia Pharmacy POS is distributed as a standalone desktop application using **Wails v2**. Wails bundles the Go backend and a React/Vite frontend into a single native binary (e.g., an `.exe` file on Windows).

## 2. Build Pipeline (wails.json)
The root `wails.json` file controls the build process:
- **Frontend Commands:** 
  - Install: `npm install`
  - Build: `npm run build` (which maps to `tsc && vite build`)
  - Dev: `npm run dev`
- **Output:** The compiled application is output as `LangratiaPharmacyPOS`.

## 3. Asset Embedding
- In `main.go`, the `//go:embed all:frontend/dist` directive bundles the statically compiled React assets into the Go binary.
- This creates a zero-dependency local web server powered by Go's `assetserver`, mounted directly inside the application window.

## 4. Target Platforms
- **Windows Packaging:** The `wails.json` dictates an NSIS installer strategy (`"nsis"` block).
  - Installer is generated with desktop and start menu shortcuts.
  - Requires `WebView2` to be downloaded if it's missing on the target machine.
  - The icon is sourced from `build/windows/icon.ico`.

## 5. Potential Problems & Unknowns
- **Automated Updates:** There is no explicit built-in auto-updater (like Squirrel for Electron) visible in the `main.go` or `wails.json` setup. Updates likely require manual uninstallation/re-installation or downloading a new installer.
- **Environment Targeting:** Unknown if CI/CD pipelines (like GitHub Actions) are set up to handle code signing for Windows (which prevents SmartScreen warnings). The `build/` directory contains `windows` and `darwin` (macOS) targets, but Windows appears to be the primary focus based on the installer config.
