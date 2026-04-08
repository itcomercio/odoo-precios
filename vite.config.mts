import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(rootDir, 'src/renderer'),
  plugins: [react()],
  build: {
    outDir: resolve(rootDir, 'dist/renderer'),
    emptyOutDir: true,
  },
});

