import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './style.css';
const root = document.getElementById('root')!;
const app = <React.StrictMode><App /></React.StrictMode>;
// Production includes build-time HTML; the development entry starts empty.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
