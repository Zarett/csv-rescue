import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ appType: 'mpa', plugins: [react(), tailwindcss()], build: { rollupOptions: { input: { home: 'index.html', repair: 'csv-repair/index.html', conversion: 'csv-to-xlsx/index.html', leadingZeros: 'guides/preserve-leading-zeros/index.html', excel: 'xlsx-to-csv/index.html' } } }, worker: { format: 'es' }, test: { environment: 'jsdom', setupFiles: './tests/setup.ts', include: ['tests/**/*.test.ts','tests/**/*.test.tsx'] } });
