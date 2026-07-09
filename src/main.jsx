// src/main.jsx
import '@material/web/all.js'; // Carrega todos os web components MD3 de uma vez
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.scss';
import '@material/web/ripple/ripple.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);