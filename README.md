# Electron + React + Node.js (Vite)

Aplicacion desktop con:
- Electron (proceso principal)
- React + TypeScript (renderer, compilado con Vite)
- Node.js + Express (backend API)

## Requisitos

- Node.js 18+
- npm

## Scripts

- `npm run dev`: inicia Vite + backend TS + Electron (modo desarrollo)
- `npm run build`: compila `main`, `backend` y `renderer`
- `npm run start`: build completo y arranque de Electron

## Ejecutar

```powershell
npm install
npm run dev
```

## Ejecutar en produccion local

```powershell
npm install
npm run start
```

## Estructura

- `src/main/main.ts`: arranque de Electron y proceso backend
- `src/main/preload.ts`: API segura para renderer
- `src/backend/server.ts`: API Express (`/api/hello`, `/api/system`, `/api/time`)
- `src/renderer/index.html`: entrada del renderer para Vite
- `src/renderer/index.tsx`: bootstrap de React
- `src/renderer/App.tsx`: UI principal
- `vite.config.mts`: configuracion de build del renderer

