import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], build: { rollupOptions: { input: { repair: 'index.html', conversion: 'csv-to-xlsx/index.html' } } }, worker: { format: 'es' }, test: { environment: 'jsdom', setupFiles: './tests/setup.ts', include: ['tests/**/*.test.ts','tests/**/*.test.tsx'] } });
