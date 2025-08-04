const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (err) {
    // electron-reload not available in production
  }
}

let mainWindow;
let serverInstance;

const isDev = process.env.NODE_ENV === 'development';
const isPackaged = app.isPackaged;
const serverPort = 5001;
const clientPort = 3000;

function getAppPaths() {
  if (isPackaged) {
    // In packaged app, server files are unpacked from asar
    const appPath = process.resourcesPath;
    return {
      serverPath: path.join(appPath, 'app.asar.unpacked', 'server', 'index.js'),
      serverDir: path.join(appPath, 'app.asar.unpacked', 'server'),
      buildPath: path.join(appPath, 'app.asar', 'client', 'build', 'index.html')
    };
  } else {
    // In development
    return {
      serverPath: path.join(__dirname, '..', 'server', 'index.js'),
      serverDir: path.join(__dirname, '..', 'server'),
      buildPath: path.join(__dirname, '..', 'client', 'build', 'index.html')
    };
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'KubeCloud - Kubernetes Management',
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load the app
  if (isDev && !isPackaged) {
    // In development, load from localhost:3000
    mainWindow.loadURL(`http://localhost:${clientPort}`);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built React app
    const { buildPath } = getAppPaths();
    if (fs.existsSync(buildPath)) {
      mainWindow.loadFile(buildPath);
    } else {
      console.error('Build path not found:', buildPath);
      dialog.showErrorBox('App Error', 'Client build files not found. Please rebuild the application.');
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const { serverPath, serverDir } = getAppPaths();
    
    console.log('App packaged:', isPackaged);
    console.log('Server path:', serverPath);
    console.log('Server dir:', serverDir);
    
    // Check if server files exist
    if (!fs.existsSync(serverPath)) {
      const error = `Server file not found at: ${serverPath}`;
      console.error(error);
      reject(new Error(error));
      return;
    }

    try {
      console.log('Starting server in same process...');
      
      // Set environment variables
      process.env.PORT = serverPort;
      process.env.NODE_ENV = isPackaged ? 'production' : 'development';
      
      // Change to server directory
      const originalCwd = process.cwd();
      process.chdir(serverDir);
      
      // Add server node_modules to module paths for packaged apps
      if (isPackaged) {
        const serverNodeModules = path.join(serverDir, 'node_modules');
        if (fs.existsSync(serverNodeModules)) {
          // Add to Node's module resolution paths
          require('module').globalPaths.unshift(serverNodeModules);
          // Also set NODE_PATH environment variable
          process.env.NODE_PATH = serverNodeModules + (process.env.NODE_PATH ? ':' + process.env.NODE_PATH : '');
          require('module')._initPaths();
        }
      }
      
      // Clear require cache for the server file in development
      if (isDev) {
        delete require.cache[require.resolve(serverPath)];
      }
      
      // Require the server file - this will start the Express server
      console.log('Loading server module...');
      serverInstance = require(serverPath);
      
      // Restore original working directory
      process.chdir(originalCwd);
      
      console.log('Server started successfully');
      
      // Give the server a moment to fully initialize
      setTimeout(() => {
        resolve();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
}

function stopServer() {
  if (serverInstance) {
    console.log('Server cleanup...');
    // The server will stop when the process exits
    serverInstance = null;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Start the server first
    await startServer();
    
    // Then create the window
    createWindow();

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox('Startup Error', `Failed to start the application server: ${error.message}\n\nPlease try again or check the console for more details.`);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  stopServer();
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith(`http://localhost:${clientPort}`) || url.startsWith(`http://localhost:${serverPort}`)) {
    // Allow localhost connections
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
}); 