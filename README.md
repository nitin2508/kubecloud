# KubeCloud - Kubernetes Management Desktop Application

KubeCloud is a powerful desktop application for managing Kubernetes clusters with an intuitive web-based interface. Built with Electron, React, and Node.js, it provides seamless Kubernetes cluster management directly from your desktop.

## Features

- 🖥️ **Desktop Application**: Native macOS desktop app with system integration
- ☁️ **Kubernetes Management**: Full cluster management capabilities
- 📊 **Real-time Monitoring**: Live pod status, logs, and metrics
- 🔧 **Port Forwarding**: Easy port forwarding management
- 📁 **File Management**: Upload and manage Kubernetes configurations
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## Desktop App Installation

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- macOS (for .icns icon support)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd kubecloud
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Start the desktop app (Development mode):**
   ```bash
   npm run electron-dev
   ```

   Or use the helper script:
   ```bash
   node desktop/start-app.js
   ```

### Desktop App Scripts

- **Development mode**: `npm run electron-dev` - Runs both server and client, then launches Electron
- **Production mode**: `npm run electron` - Launches Electron with built React app
- **Build for distribution**: `npm run dist` - Creates distributable desktop app
- **Build and package**: `npm run build-electron` - Builds and packages the app

## Web App Mode (Alternative)

If you prefer to run as a web application:

1. **Start the server and client:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   - Open your browser and navigate to `http://localhost:3000`
   - The backend API runs on `http://localhost:5001`

## Project Structure

```
kubecloud/
├── desktop/                 # Electron desktop app files
│   ├── main.js             # Electron main process
│   ├── start-app.js        # Helper startup script
│   └── assets/             # Desktop app assets
│       ├── icon.icns       # macOS app icon
│       ├── icon.png        # Standard icon
│       └── icon.svg        # Source icon
├── client/                 # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Express.js backend API
│   ├── index.js
│   ├── uploads/
│   └── package.json
└── package.json           # Root package with desktop scripts
```

## Desktop App Features

### Native Integration
- **System Tray**: Minimize to system tray (planned)
- **Native Notifications**: Desktop notifications for cluster events
- **File Associations**: Associate with Kubernetes config files
- **Auto-updates**: Built-in update mechanism (planned)

### Security
- **Context Isolation**: Secure Electron configuration
- **No Node Integration**: Web content runs in isolated context
- **Local Server**: Backend runs locally for security

## Building for Distribution

### Create macOS App Bundle

```bash
# Build the React app and create distributable
npm run dist
```

This creates:
- `dist/KubeCloud-{version}.dmg` - macOS installer
- `dist/mac/KubeCloud.app` - macOS application bundle

### Development vs Production

- **Development**: Hot reload enabled, DevTools open
- **Production**: Optimized bundle, no DevTools, better performance

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'development' for dev mode
- `PORT`: Server port (default: 5001)

### Customization

The desktop app can be customized by modifying:
- `desktop/main.js` - Electron configuration
- `package.json` build section - App metadata and build options

## Troubleshooting

### Common Issues

1. **Dependencies missing**: Run `npm run install-all`
2. **Port conflicts**: Ensure ports 3000 and 5001 are available
3. **Icon not showing**: Verify icon files exist in `desktop/assets/`

### Logs

Desktop app logs are displayed in the terminal when running in development mode.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 