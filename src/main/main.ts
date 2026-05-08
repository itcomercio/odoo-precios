import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const skipInternalBackend = process.env.SKIP_INTERNAL_BACKEND === '1';
const splashDurationMs = 2200;
const splashFadeOutMs = 280;
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

type PosIconAsset = {
  style: string;
  fileName: string;
  relativePath: string;
  previewDataUrl: string;
};

function getProjectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function getPosIconsRoot(): string {
  return path.join(getProjectRoot(), 'pos-icons');
}

function getMimeType(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function sanitizeStyleName(style: string): string {
  const normalized = style.trim();
  if (!normalized || normalized.includes('..') || path.basename(normalized) !== normalized) {
    throw new Error('Nombre de estilo no valido.');
  }
  return normalized;
}

function resolvePosIconSourcePath(sourceRelativePath: string): string {
  const normalized = sourceRelativePath.replace(/\\/g, '/').trim();
  if (!normalized) {
    throw new Error('Ruta de imagen vacia.');
  }

  const iconsRoot = getPosIconsRoot();
  const absolutePath = path.resolve(iconsRoot, normalized);
  const relativeToRoot = path.relative(iconsRoot, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Ruta de imagen fuera de pos-icons/.');
  }

  return absolutePath;
}

async function listPosIconStyles(): Promise<string[]> {
  const entries = await readdir(getPosIconsRoot(), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function listPosIconsByStyle(style: string): Promise<PosIconAsset[]> {
  const safeStyle = sanitizeStyleName(style);
  const styleDir = path.join(getPosIconsRoot(), safeStyle);
  const entries = await readdir(styleDir, { withFileTypes: true });

  const imageFiles = entries
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  return Promise.all(
    imageFiles.map(async (fileName) => {
      const filePath = path.join(styleDir, fileName);
      const fileBuffer = await readFile(filePath);
      return {
        style: safeStyle,
        fileName,
        relativePath: `${safeStyle}/${fileName}`,
        previewDataUrl: `data:${getMimeType(fileName)};base64,${fileBuffer.toString('base64')}`,
      };
    }),
  );
}

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

ipcMain.handle('list-pos-icon-styles', async () => listPosIconStyles());

ipcMain.handle('list-pos-icons-by-style', async (_event, style: string) => listPosIconsByStyle(style));

ipcMain.handle(
  'export-import-structure',
  async (
    _event,
    payload: { csvContent: string; images: Array<{ fileName: string; sourceRelativePath: string }> },
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
    const copiedImageSources = new Map<string, string>();

    await mkdir(imagesDir, { recursive: true });
    await writeFile(path.join(importDir, 'products.csv'), payload.csvContent, 'utf-8');

    for (const image of payload.images) {
      if (!image.fileName || !image.sourceRelativePath) continue;

      const previousSource = copiedImageSources.get(image.fileName);
      if (previousSource && previousSource !== image.sourceRelativePath) {
        warnings.push(
          `Conflicto de nombre para ${image.fileName}: ya existe otra imagen asignada (${previousSource}).`,
        );
        continue;
      }

      try {
        const sourcePath = resolvePosIconSourcePath(image.sourceRelativePath);
        await copyFile(sourcePath, path.join(imagesDir, image.fileName));
        copiedImageSources.set(image.fileName, image.sourceRelativePath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'error inesperado';
        warnings.push(`No se pudo copiar ${image.fileName}: ${errorMessage}.`);
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
