import React, { useEffect, useState, useCallback } from 'react';

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

// ── estilos ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: #0f0f1a;
    color: #e2e8f0;
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    gap: 32px;
  }

  /* ── hero ── */
  .hero {
    text-align: center;
    animation: fadeDown 0.8s ease both;
  }
  .hero-badge {
    display: inline-block;
    background: linear-gradient(90deg, #7c3aed, #2563eb);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 16px;
    border-radius: 999px;
    margin-bottom: 20px;
  }
  .hero h1 {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    line-height: 1.1;
    background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 16px;
  }
  .hero p {
    font-size: 1.1rem;
    color: #94a3b8;
  }

  /* ── grid ── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    width: 100%;
    max-width: 1000px;
  }

  /* ── card ── */
  .card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px;
    backdrop-filter: blur(12px);
    transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    animation: fadeUp 0.6s ease both;
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(124,58,237,0.4);
    box-shadow: 0 16px 40px rgba(124,58,237,0.15);
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .card-icon {
    font-size: 1.5rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2));
    border-radius: 12px;
    border: 1px solid rgba(124,58,237,0.3);
  }
  .card-title {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #7c3aed;
  }

  /* ── greeting card ── */
  .greeting-text {
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 700;
    background: linear-gradient(90deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
    min-height: 2.5rem;
  }
  .greeting-meta {
    font-size: 0.85rem;
    color: #64748b;
  }
  .greeting-lang {
    display: inline-block;
    background: rgba(124,58,237,0.15);
    color: #a78bfa;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 10px;
    border: 1px solid rgba(124,58,237,0.25);
  }

  /* ── rows ── */
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .row:last-child { border-bottom: none; }
  .row-label {
    font-size: 0.82rem;
    color: #64748b;
    font-weight: 500;
  }
  .row-value {
    font-size: 0.88rem;
    color: #e2e8f0;
    font-weight: 600;
    text-align: right;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── clock card ── */
  .clock {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(90deg, #34d399, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2px;
  }
  .clock-date {
    font-size: 0.88rem;
    color: #64748b;
    margin-top: 4px;
    text-transform: capitalize;
  }
  .clock-api {
    margin-top: 16px;
    font-size: 0.8rem;
    color: #475569;
  }

  /* ── status / loading ── */
  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
    height: 1rem;
    width: 70%;
  }
  .error-msg {
    color: #f87171;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── refresh btn ── */
  .btn-refresh {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #7c3aed, #2563eb);
    color: #fff;
    border: none;
    padding: 12px 28px;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
    box-shadow: 0 4px 20px rgba(124,58,237,0.35);
  }
  .btn-refresh:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
  .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
  .spin { display: inline-block; animation: spin 0.8s linear infinite; }

  /* ── footer ── */
  .footer {
    font-size: 0.78rem;
    color: #334155;
    text-align: center;
  }

  /* ── animaciones ── */
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ── componentes auxiliares ────────────────────────────────────────────────────

const Skeleton: React.FC = () => <div className="skeleton" />;

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── App ───────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
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

    if (h.status === 'fulfilled') { setHello(h.value); setHelloStatus('ok'); }
    else setHelloStatus('error');

    if (s.status === 'fulfilled') { setSystem(s.value); setSystemStatus('ok'); }
    else setSystemStatus('error');

    if (t.status === 'fulfilled') { setApiTime(t.value); setTimeStatus('ok'); }
    else setTimeStatus('error');

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const platformIcon: Record<string, string> = {
    win32: '🪟', darwin: '🍎', linux: '🐧',
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── hero ── */}
        <section className="hero">
          <div className="hero-badge">Electron + React + Node.js</div>
          <h1>Hello, World!</h1>
          <p>Una app desktop con React, TypeScript y Express</p>
        </section>

        <div className="grid">

          {/* ── saludo de la API ── */}
          <div className="card" style={{ animationDelay: '0.1s' }}>
            <div className="card-header">
              <div className="card-icon">🌍</div>
              <span className="card-title">Saludo desde la API</span>
            </div>
            {helloStatus === 'loading' && <Skeleton />}
            {helloStatus === 'error' && (
              <p className="error-msg">⚠️ No se pudo conectar al backend</p>
            )}
            {helloStatus === 'ok' && hello && (
              <>
                <div className="greeting-text">{hello.text}</div>
                <div className="greeting-meta">— {hello.from}</div>
                <div className="greeting-lang">{hello.lang}</div>
              </>
            )}
          </div>

          {/* ── reloj local + hora API ── */}
          <div className="card" style={{ animationDelay: '0.2s' }}>
            <div className="card-header">
              <div className="card-icon">🕐</div>
              <span className="card-title">Fecha y Hora</span>
            </div>
            <div className="clock">
              {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="clock-date">
              {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {timeStatus === 'ok' && apiTime && (
              <div className="clock-api">
                🌐 Zona API: {apiTime.timezone} · Unix: {apiTime.unix}
              </div>
            )}
          </div>

          {/* ── info del sistema ── */}
          <div className="card" style={{ animationDelay: '0.3s', gridColumn: 'span 1' }}>
            <div className="card-header">
              <div className="card-icon">
                {system ? (platformIcon[system.platform] ?? '💻') : '💻'}
              </div>
              <span className="card-title">Sistema Operativo</span>
            </div>
            {systemStatus === 'loading' && (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ marginBottom: 10 }}><Skeleton /></div>
                ))}
              </>
            )}
            {systemStatus === 'error' && (
              <p className="error-msg">⚠️ Error al obtener info del sistema</p>
            )}
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

        {/* ── botón refresh ── */}
        <button className="btn-refresh" onClick={fetchAll} disabled={loading}>
          {loading ? <span className="spin">⟳</span> : '⟳'}
          {loading ? ' Actualizando...' : ' Actualizar datos'}
        </button>

        <footer className="footer">
          Electron {(window as any).electronAPI?.electronVersion ?? '—'} ·
          React 18 · TypeScript · Express
        </footer>

      </div>
    </>
  );
};

export default App;

