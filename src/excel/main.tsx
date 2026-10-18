import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import ExcelConverter from './ExcelConverter';
import '../style.css';
import '../conversion/style.css';
import './style.css';
const root=document.getElementById('excel-converter')!;
const app=<React.StrictMode><ExcelConverter/></React.StrictMode>;
if(root.hasChildNodes())hydrateRoot(root,app);else createRoot(root).render(app);
