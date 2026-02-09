const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

// Simple static file server for production
const startLocalServer = (port) => {
  const server = http.createServer((req, res) => {
    // Parse URL to handle query parameters
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Default to index.html
    if (pathname === '/') pathname = '/index.html';

    let filePath = path.join(__dirname, 'build', pathname);

    // Check if the file actually exists
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // If it's a request for a static file (has an extension) and it's missing, return 404
      if (path.extname(pathname) !== '') {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      // Otherwise, assume it's a React route and serve index.html
      filePath = path.join(__dirname, 'build', 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Port in use, server already running.');
    }
  });

  server.listen(port, '127.0.0.1');
};

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const PORT = 5000;

  if (app.isPackaged) {
    startLocalServer(PORT);
  }

  const win = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(900, height),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged,
      sandbox: false
    },
    autoHideMenuBar: true,
    title: "Finn ERP"
  });

  // Handle new windows (like Google Login popup)
  win.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 600,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false, // safer for popup
          contextIsolation: true
        }
      }
    };
  });

  const startURL = app.isPackaged
    ? `http://localhost:${PORT}`
    : 'http://localhost:3000';

  win.loadURL(startURL);

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
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
