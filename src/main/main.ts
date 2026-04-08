import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const skipInternalBackend = process.env.SKIP_INTERNAL_BACKEND === '1';

function startBackend(): void {
  if (skipInternalBackend) {
    console.log('Backend externo detectado, no se inicia proceso interno.');
    return;
  }

  const backendPath = path.join(__dirname, '..', 'backend', 'server.js');
  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3001' },
  });
  backendProcess.on('error', (err) => {
    console.error('Error al iniciar el backend:', err);
  });
  console.log('Backend iniciado en http://localhost:3001');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const htmlPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  // Pequena espera para que Express arranque
  setTimeout(createWindow, 1200);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
