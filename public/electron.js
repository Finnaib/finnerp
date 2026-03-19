const { app, BrowserWindow, screen, session } = require('electron');
const path = require('path');

// Disable Site Isolation to allow Firebase Popups to communicate across origins in Electron
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests,CrossSiteDocumentBlockingIfIsolating,SitePerProcess');
const isDev = !app.isPackaged;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(800, height),
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
      webSecurity: false,
    },
    title: "Finn ERP - POS Desktop",
    frame: true,
    autoHideMenuBar: true,
    kiosk: false,
  });

  // Set User Agent to a standard browser on EVERY window to avoid Firebase/Google "embedded browser" detection
  const standardUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  const authorizedOrigin = 'https://finnerp-326a6.firebaseapp.com';
  const vercelOrigin = 'https://finnerp.vercel.app';
  
  // Apply globally to all network requests
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.firebaseapp.com/*', '*://*.googleapis.com/*', '*://*.web.app/*', '*://finnerp.vercel.app/*', '*://accounts.google.com/*', '*://*.firebase.com/*'] },
    (details, callback) => {
      // Use the project's own domain as the authoritative origin
      details.requestHeaders['Origin'] = authorizedOrigin;
      details.requestHeaders['Referer'] = authorizedOrigin + '/';
      details.requestHeaders['User-Agent'] = standardUserAgent;
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Apply User Agent and hide menu to all windows
  app.on('browser-window-created', (e, window) => {
    window.webContents.setUserAgent(standardUserAgent);
    window.setMenuBarVisibility(false);
    window.setAutoHideMenuBar(true);
  });

  // Allow all navigation (fixes blank page on CDN script load)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"
        ]
      }
    });
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
    }
  });

  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In built apps, electron.js is at build/electron.js, so __dirname is path/to/app.asar/build
    const indexPath = path.join(__dirname, 'index.html');
    mainWindow.loadFile(indexPath).catch(e => {
        console.error("Failed to load index.html:", e);
        // Fallback to absolute path from app root
        mainWindow.loadFile(path.join(app.getAppPath(), 'build/index.html'));
    });
    // Open DevTools for debugging the installed app — remove after confirming it works
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Page failed to load: ${errorDescription} (Code: ${errorCode})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  mainWindow.on('closed', () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

