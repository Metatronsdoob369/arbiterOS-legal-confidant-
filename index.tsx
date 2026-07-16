import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/styles/globals.css';
import { commonLawEngine } from './services/commonLawEngine';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (typeof window !== 'undefined') {
  window.commonLawEngine = commonLawEngine;
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
