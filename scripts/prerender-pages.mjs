// Build-time rendering only; no server is deployed or used for file processing.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { readFile, writeFile } from 'node:fs/promises';
const server = await createServer({ mode: 'production', server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' });
try {
  for (const { source, path, id } of [
    { source: '/src/App.tsx', path: 'dist/csv-repair/index.html', id: 'root' },
    { source: '/src/conversion/Converter.tsx', path: 'dist/csv-to-xlsx/index.html', id: 'converter' }
  ]) {
    const { default: Component } = await server.ssrLoadModule(source);
    const html = await readFile(path, 'utf8');
    const mount = `<div id="${id}"></div>`;
    if (!html.includes(mount)) throw new Error(`Prerender mount point missing: ${path}`);
    await writeFile(path, html.replace(mount, () => `<div id="${id}">${renderToString(createElement(Component))}</div>`));
    console.log(`Prerendered static landing content: ${path}`);
  }
} finally { await server.close(); }
