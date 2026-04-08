import { useEffect, useState, useCallback } from 'react';
import './App.css';

// ── tipos ─────────────────────────────────────────────────────────────────────

interface HelloData {
  text: string;
  lang: string;
  from: string;
}

interface SystemData {
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string;
  totalMemory: string;
  freeMemory: string;
  uptime: string;
  nodeVersion: string;
}

interface TimeData {
  iso: string;
  locale: string;
  unix: number;
  timezone: string;
}

type Status = 'idle' | 'loading' | 'ok' | 'error';

const API = 'http://localhost:3001/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

// ── componentes auxiliares ────────────────────────────────────────────────────

const Skeleton = () => <div className="skeleton" />;

const platformIcon: Record<string, string> = {
  win32: '🪟',
  darwin: '🍎',
  linux: '🐧',
};

function useClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
  const now = useClock();

  const [hello, setHello] = useState<HelloData | null>(null);
  const [helloStatus, setHelloStatus] = useState<Status>('idle');

  const [system, setSystem] = useState<SystemData | null>(null);
  const [systemStatus, setSystemStatus] = useState<Status>('idle');

  const [apiTime, setApiTime] = useState<TimeData | null>(null);
  const [timeStatus, setTimeStatus] = useState<Status>('idle');

  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setHelloStatus('loading');
    setSystemStatus('loading');
    setTimeStatus('loading');

    const [h, s, t] = await Promise.allSettled([
      get<HelloData>('/hello'),
      get<SystemData>('/system'),
      get<TimeData>('/time'),
    ]);

    if (h.status === 'fulfilled') {
      setHello(h.value);
      setHelloStatus('ok');
    } else {
      setHelloStatus('error');
    }

    if (s.status === 'fulfilled') {
      setSystem(s.value);
      setSystemStatus('ok');
    } else {
      setSystemStatus('error');
    }

    if (t.status === 'fulfilled') {
      setApiTime(t.value);
      setTimeStatus('ok');
    } else {
      setTimeStatus('error');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="app">
      <section className="hero">
        <div className="hero-badge">Electron + React + Node.js</div>
        <h1>Hello, World!</h1>
        <p>Una app desktop con React, TypeScript y Express</p>
      </section>

      <div className="grid">
        <div className="card card-delay-1">
          <div className="card-header">
            <div className="card-icon">🌍</div>
            <span className="card-title">Saludo desde la API</span>
          </div>

          {helloStatus === 'loading' && <Skeleton />}
          {helloStatus === 'error' && <p className="error-msg">⚠️ No se pudo conectar al backend</p>}
          {helloStatus === 'ok' && hello && (
            <>
              <div className="greeting-text">{hello.text}</div>
              <div className="greeting-meta">— {hello.from}</div>
              <div className="greeting-lang">{hello.lang}</div>
            </>
          )}
        </div>

        <div className="card card-delay-2">
          <div className="card-header">
            <div className="card-icon">🕐</div>
            <span className="card-title">Fecha y Hora</span>
          </div>

          <div className="clock">
            {now.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>

          <div className="clock-date">
            {now.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          {timeStatus === 'ok' && apiTime && (
            <div className="clock-api">
              🌐 Zona API: {apiTime.timezone} · Unix: {apiTime.unix}
            </div>
          )}
        </div>

        <div className="card card-delay-3">
          <div className="card-header">
            <div className="card-icon">{system ? (platformIcon[system.platform] ?? '💻') : '💻'}</div>
            <span className="card-title">Sistema Operativo</span>
          </div>

          {systemStatus === 'loading' && (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-row">
                  <Skeleton />
                </div>
              ))}
            </>
          )}

          {systemStatus === 'error' && <p className="error-msg">⚠️ Error al obtener info del sistema</p>}

          {systemStatus === 'ok' && system && (
            <>
              <div className="row">
                <span className="row-label">Hostname</span>
                <span className="row-value">{system.hostname}</span>
              </div>
              <div className="row">
                <span className="row-label">Plataforma</span>
                <span className="row-value">{system.platform} / {system.arch}</span>
              </div>
              <div className="row">
                <span className="row-label">CPU</span>
                <span className="row-value">{system.cpus} núcleos</span>
              </div>
              <div className="row">
                <span className="row-label">RAM Total</span>
                <span className="row-value">{system.totalMemory}</span>
              </div>
              <div className="row">
                <span className="row-label">RAM Libre</span>
                <span className="row-value">{system.freeMemory}</span>
              </div>
              <div className="row">
                <span className="row-label">Uptime</span>
                <span className="row-value">{system.uptime}</span>
              </div>
              <div className="row">
                <span className="row-label">Node.js</span>
                <span className="row-value">{system.nodeVersion}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <button className="btn-refresh" onClick={fetchAll} disabled={loading}>
        {loading ? <span className="spin">⟳</span> : '⟳'}
        {loading ? ' Actualizando...' : ' Actualizar datos'}
      </button>

      <footer className="footer">
        Electron {(window as any).electronAPI?.electronVersion ?? '—'} · React 18 · TypeScript · Express
      </footer>
    </div>
  );
};

export default App;

