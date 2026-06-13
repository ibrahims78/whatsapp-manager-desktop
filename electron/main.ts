import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import path from 'path';
import { startServer } from '../server/index';
import type { Server as HttpServer } from 'http';

const PORT = 43210;
const APP_URL = `http://127.0.0.1:${PORT}`;
const IS_DEV = process.env.NODE_ENV !== 'production';
const DEV_RENDERER_URL = 'http://127.0.0.1:5173';

let mainWindow: BrowserWindow | null = null;
let httpServer: HttpServer | null = null;

function createLoadingWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0f172a;
          color: #94a3b8;
          font-family: 'Segoe UI', Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }
        .icon {
          font-size: 56px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.95); }
        }
        h1 { font-size: 20px; color: #e2e8f0; font-weight: 700; letter-spacing: -0.5px; }
        p  { font-size: 13px; color: #64748b; }
        .dots::after {
          content: '';
          animation: dots 1.5s steps(4) infinite;
        }
        @keyframes dots {
          0%   { content: ''; }
          25%  { content: '.'; }
          50%  { content: '..'; }
          75%  { content: '...'; }
        }
        .bar-track {
          width: 200px; height: 3px;
          background: #1e293b;
          border-radius: 9999px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #25d366, #128c7e);
          border-radius: 9999px;
          animation: progress 2s ease-in-out infinite;
        }
        @keyframes progress {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="icon">💬</div>
      <h1>WhatsApp Manager</h1>
      <p>Starting server<span class="dots"></span></p>
      <div class="bar-track"><div class="bar-fill"></div></div>
    </body>
    </html>
  `)}`);

  return win;
}

async function waitForServer(timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${APP_URL}/api/healthz`);
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !IS_DEV,
    },
  });

  const url = IS_DEV ? DEV_RENDERER_URL : APP_URL;
  win.loadURL(url);

  win.once('ready-to-show', () => {
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (!targetUrl.startsWith(APP_URL) && !targetUrl.startsWith('http://127.0.0.1:5173')) {
      shell.openExternal(targetUrl);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  return win;
}

app.whenReady().then(async () => {
  const loadingWin = createLoadingWindow();

  try {
    httpServer = await startServer();

    const ready = await waitForServer(30_000);
    if (!ready) {
      dialog.showErrorBox(
        'Startup Error',
        'The local server failed to start.\nRestart the application. If the problem persists, check the logs folder.'
      );
      app.quit();
      return;
    }

    mainWindow = createMainWindow();

    mainWindow.once('ready-to-show', () => {
      loadingWin.close();
    });
  } catch (err) {
    console.error('Startup error:', err);
    dialog.showErrorBox('Error', String(err));
    app.quit();
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => path.dirname(process.execPath));

ipcMain.handle('open-external', (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    shell.openExternal(url);
  }
});

app.on('before-quit', () => {
  if (httpServer) httpServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
