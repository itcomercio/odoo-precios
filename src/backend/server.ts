import express, { Request, Response } from 'express';
import cors from 'cors';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`]
    .filter(Boolean)
    .join(' ');
}

// ── rutas ─────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Saludo aleatorio multiidioma
app.get('/api/hello', (_req: Request, res: Response) => {
  const greetings = [
    { text: 'Hello, World! 👋', lang: 'English' },
    { text: '¡Hola, Mundo! 🌍', lang: 'Español' },
    { text: 'Bonjour le Monde! 🥐', lang: 'Français' },
    { text: 'Ciao, Mondo! 🍕', lang: 'Italiano' },
    { text: 'こんにちは世界！ 🗾', lang: '日本語' },
    { text: 'Hallo Welt! 🍺', lang: 'Deutsch' },
  ];
  const pick = greetings[Math.floor(Math.random() * greetings.length)];
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: { ...pick, from: 'Node.js + Express' },
  });
});

// Info del sistema operativo
app.get('/api/system', (_req: Request, res: Response) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model ?? 'Desconocido',
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
      uptime: formatUptime(os.uptime()),
      nodeVersion: process.version,
    },
  });
});

// Hora del servidor
app.get('/api/time', (_req: Request, res: Response) => {
  const now = new Date();
  res.json({
    success: true,
    data: {
      iso: now.toISOString(),
      locale: now.toLocaleString('es-ES'),
      unix: Math.floor(now.getTime() / 1000),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
});

// ── arranque ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  API escuchando en http://localhost:${PORT}`);
  console.log('   Rutas disponibles:');
  console.log('     GET /api/health');
  console.log('     GET /api/hello');
  console.log('     GET /api/system');
  console.log('     GET /api/time');
});

export default app;

