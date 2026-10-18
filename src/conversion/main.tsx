import React from 'react';
import { createRoot } from 'react-dom/client';
import Converter from './Converter';
import '../style.css';
import './style.css';
createRoot(document.getElementById('converter')!).render(<React.StrictMode><Converter/></React.StrictMode>);
