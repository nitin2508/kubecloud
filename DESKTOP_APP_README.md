# 🖥️ KubeCloud Desktop App

KubeCloud is now available as a native macOS desktop application! This provides a better user experience with native menus, keyboard shortcuts, and system integration.

## 🚀 Quick Start

### Development Mode
```bash
cd client
./start-electron-dev.sh
```

### Production Build
```bash
cd client
npm run dist-mac
```

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **kubectl** (Kubernetes command-line tool)
- **macOS** (for Mac builds)

## 🛠️ Development

### Start Development Environment
The easiest way to start development is using the provided script:

```bash
cd client
./start-electron-dev.sh
```

This script will:
1. Start the backend server (port 5001)
2. Start the React development server (port 3000)
3. Launch Electron with hot reloading

### Manual Development
If you prefer to start components manually:

```bash
# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start React
cd client
npm start

# Terminal 3: Start Electron (after React is running)
cd client
npm run electron-dev
```

## 📦 Building for Distribution

### macOS App (.dmg)
```bash
cd client
npm run dist-mac
```

### All Platforms
```bash
cd client
npm run dist
```

### Build Outputs
Built applications will be in `client/dist/`:
- **macOS**: `KubeCloud-0.1.0.dmg`
- **Windows**: `KubeCloud Setup 0.1.0.exe`
- **Linux**: `KubeCloud-0.1.0.AppImage`

## 🎯 Desktop App Features

### Native macOS Integration
- **Native menu bar** with keyboard shortcuts
- **File dialogs** for kubeconfig selection
- **Dock integration** with badge notifications
- **System notifications** for important events
- **Dark mode support** follows system preference

### Keyboard Shortcuts
- `Cmd+O` - Upload kubeconfig file
- `Cmd+R` - Refresh pods
- `Cmd+Shift+R` - Refresh namespaces
- `Cmd+P` - Switch to Port Forwards tab
- `Cmd+,` - Preferences (future feature)

### Native Menus
- **KubeCloud Menu**: About, Preferences, Services
- **File Menu**: Upload kubeconfig, Close
- **Edit Menu**: Standard editing commands
- **View Menu**: Zoom, reload, developer tools
- **Kubernetes Menu**: Refresh actions, port forwards
- **Window Menu**: Minimize, close
- **Help Menu**: Documentation, issue reporting

## 🔧 Configuration

### App Settings
The app configuration is in `client/package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.kubecloud.app",
    "productName": "KubeCloud",
    "mac": {
      "category": "public.app-category.developer-tools"
    }
  }
}
```

### Backend Integration
The desktop app automatically starts the Node.js backend server when launched. The server runs on port 5001 and is automatically terminated when the app closes.

## 🎨 Customization

### App Icon
Replace `client/public/kubecloud-icon.png` with your custom icon:
- **PNG**: 512x512 pixels for optimal quality
- **ICNS**: For macOS (convert PNG using online tools)
- **ICO**: For Windows

### Window Settings
Modify window properties in `client/public/electron.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 1400,        // Window width
  height: 900,        // Window height
  minWidth: 1200,     // Minimum width
  minHeight: 700,     // Minimum height
  titleBarStyle: 'hiddenInset', // macOS style
  // ... other options
});
```

## 🐛 Troubleshooting

### Common Issues

**1. "Backend server not starting"**
- Ensure Node.js is installed
- Check if port 5001 is available
- Verify server dependencies are installed

**2. "Electron app won't start"**
- Run `npm install` in client directory
- Check if React development server is running
- Try `npm run electron-dev` directly

**3. "Build fails"**
- Ensure all dependencies are installed
- Run `npm run build` first to test React build
- Check build logs for specific errors

**4. "App icon not showing"**
- Ensure icon files exist in `public/` directory
- Rebuild the app after adding icons
- Clear Electron cache: `rm -rf node_modules/.cache`

### Debug Mode
Start with debug logging:
```bash
DEBUG=* npm run electron-dev
```

### Development Tools
- Press `Cmd+Option+I` to open developer tools
- Use `View > Toggle Developer Tools` from menu
- Enable in development mode automatically

## 📱 Future Enhancements

### Planned Features
- **System tray integration** for background operation
- **Auto-updater** for seamless updates
- **Native notifications** for pod status changes
- **Touch Bar support** for MacBook Pro
- **Preferences window** for app settings
- **Multiple window support** for different clusters

### Plugin System
Future versions may support:
- Custom themes
- Additional Kubernetes tools integration
- Third-party plugins
- Custom dashboard layouts

## 🤝 Contributing

### Desktop App Development
1. Fork the repository
2. Create a feature branch
3. Make changes to Electron configuration
4. Test on multiple platforms
5. Submit a pull request

### Testing Builds
Before submitting PRs:
```bash
# Test development mode
npm run electron-dev

# Test production build
npm run dist-mac

# Verify app functionality
```

## 📄 License

Same as the main KubeCloud project - MIT License.

## 🆘 Support

For desktop app specific issues:
- Check this README first
- Review Electron documentation
- Open an issue with "Desktop App" label
- Include system information and logs

---

**Enjoy your native KubeCloud desktop experience! 🚀** 