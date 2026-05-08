import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const skipInternalBackend = process.env.SKIP_INTERNAL_BACKEND === '1';
const splashDurationMs = 2200;
const splashFadeOutMs = 280;

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

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 320,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#edf2f7',
    center: true,
    show: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.setMenuBarVisibility(false);

  if (devServerUrl) {
    void splashWindow.loadURL(`${devServerUrl}/splash.html`);
  } else {
    const splashPath = path.join(__dirname, '..', 'renderer', 'splash.html');
    void splashWindow.loadFile(splashPath);
  }

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
    void mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setMenuBarVisibility(false);
}

function waitForMainWindowReady(): Promise<void> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    mainWindow.once('ready-to-show', finish);
    mainWindow.webContents.once('did-fail-load', finish);
    setTimeout(finish, splashDurationMs + 1200);
  });
}

async function bootWithSplash(): Promise<void> {
  createSplashWindow();
  createMainWindow();

  await Promise.all([
    waitForMainWindowReady(),
    new Promise<void>((resolve) => setTimeout(resolve, splashDurationMs)),
  ]);

  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      await splashWindow.webContents.executeJavaScript('window.startSplashClose?.();', true);
    } catch {
      // Si falla la ejecucion del script, cerramos splash sin animacion.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, splashFadeOutMs));
  }

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

ipcMain.handle('save-csv-file', async (_event, csvContent: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar CSV de productos POS',
    defaultPath: 'products.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (canceled || !filePath) {
    return { saved: false, reason: 'Guardado cancelado por el usuario.' };
  }

  await writeFile(filePath, csvContent, 'utf-8');
  return { saved: true, path: filePath };
});

ipcMain.handle(
  'export-import-structure',
  async (
    _event,
    payload: { csvContent: string; images: Array<{ fileName: string; imageUrl: string }> },
  ) => {
    const selected = await dialog.showOpenDialog({
      title: 'Selecciona una carpeta destino',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (selected.canceled || selected.filePaths.length === 0) {
      return { saved: false, reason: 'Exportacion cancelada por el usuario.' };
    }

    const rootDir = selected.filePaths[0];
    const importDir = path.join(rootDir, 'import');
    const imagesDir = path.join(importDir, 'images');
    const warnings: string[] = [];

    await mkdir(imagesDir, { recursive: true });
    await writeFile(path.join(importDir, 'products.csv'), payload.csvContent, 'utf-8');

    for (const image of payload.images) {
      if (!image.fileName || !image.imageUrl) continue;

      if (!/^https?:\/\//i.test(image.imageUrl)) {
        warnings.push(`No se pudo descargar ${image.fileName}: URL no valida (${image.imageUrl}).`);
        continue;
      }

      try {
        const response = await fetch(image.imageUrl);
        if (!response.ok) {
          warnings.push(`No se pudo descargar ${image.fileName}: HTTP ${response.status}.`);
          continue;
        }
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        await writeFile(path.join(imagesDir, image.fileName), fileBuffer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'error inesperado';
        warnings.push(`No se pudo descargar ${image.fileName}: ${errorMessage}.`);
      }
    }

    return { saved: true, path: importDir, warnings };
  },
);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startBackend();
  void bootWithSplash();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
