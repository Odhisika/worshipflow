# 🚀 WorshipFlow Pro - Installation Guide

## Quick Start (3 Steps)

### 1. Install Prerequisites

**Windows:**
```powershell
# Install Node.js from https://nodejs.org/ (v18+)
# Install Rust from https://rustup.rs/
```

**macOS:**
```bash
# Install Homebrew first: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
brew install rust
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install Dependencies

```bash
cd worshipflow-pro
npm install
```

This will install all required packages (may take 2-3 minutes).

### 3. Run the Application

```bash
npm run tauri dev
```

The application will start automatically!

## Building for Production

To create an installer for your platform:

```bash
npm run tauri build
```

**Find your installer:**
- Windows: `src-tauri/target/release/bundle/msi/WorshipFlow-Pro.msi`
- macOS: `src-tauri/target/release/bundle/dmg/WorshipFlow-Pro.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/WorshipFlow-Pro.AppImage`

## System Requirements

**Minimum:**
- OS: Windows 10, macOS 10.15, Ubuntu 20.04
- RAM: 4GB
- Disk: 500MB free space
- Display: 1024x768

**Recommended:**
- OS: Windows 11, macOS 12+, Ubuntu 22.04
- RAM: 8GB
- Disk: 1GB free space
- Display: 1920x1080 (dual monitor for presentations)

## First-Time Setup

1. **Launch WorshipFlow Pro**
2. **Add Songs:** Go to Song Library → Click "Add Song"
3. **Create Service:** Go to Services → Click "Create Service"
4. **Test Presentation:** Go to Presentation → Load a song → Start

## Troubleshooting

### Issue: "npm not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "cargo not found"
**Solution:** Install Rust from https://rustup.rs/

### Issue: Build fails on Linux
**Solution:** Install additional dependencies:
```bash
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Issue: Output window won't open
**Solution:** Check if it's already open (look in taskbar), or restart the app.

## Getting Help

- Read USER_GUIDE.md for complete instructions
- Check QUICK_REFERENCE.md for command cheatsheet
- See DEVELOPMENT.md for developer information

## Next Steps

1. ✅ Install and run the application
2. ✅ Read USER_GUIDE.md
3. ✅ Add your church's songs
4. ✅ Test on your projector
5. ✅ Use this Sunday!

---

**Status: Ready to Install** ✅
**Time Required: ~10 minutes**
**Difficulty: Easy**
