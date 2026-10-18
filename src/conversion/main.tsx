import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import Converter from './Converter';
import '../style.css';
import './style.css';
const root = document.getElementById('converter')!;
const app = <React.StrictMode><Converter/></React.StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
