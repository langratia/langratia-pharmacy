# Langratia Pharmacy POS — Windows Installation & Deployment Guide

This guide describes how to deploy and install **Langratia Pharmacy POS** on Windows desktop workstations.

---

## 1. Automated GitHub Actions Build
Every time code is pushed to `main` or a new version tag (e.g. `v1.0.0`) is created:
1. GitHub Actions spins up a clean `windows-latest` virtual runner.
2. Compiles the Go backend and Vite/React frontend into a native binary.
3. Packages a professional **NSIS Setup Installer** (`.exe`).
4. Uploads build artifacts and publishes a **GitHub Release**.

---

## 2. Installation Options

### Option A: Standard GUI Installer (Recommended for End Users)
1. Download `LangratiaPharmacyPOS-installer.exe` from the latest GitHub Release.
2. Double-click the installer executable.
3. Follow the setup wizard:
   - Registers system registry uninstaller (`Add/Remove Programs`).
   - Automatically creates **Desktop Shortcut** and **Start Menu Shortcut**.
   - Installs the WebView2 runtime if missing.

### Option B: Silent Enterprise Deployment (IT Administrators)
For IT managers deploying across multiple pharmacy computers:
Run the installer via Windows Command Prompt or PowerShell with the silent flag `/S`:

```cmd
LangratiaPharmacyPOS-installer.exe /S
```

---

## 3. Creating a Release
To release a new official version of the installer to GitHub:

```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions will automatically build the Windows installer and create a GitHub Release with the executable attached!
