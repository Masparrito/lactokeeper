// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext'; // Importamos el nuevo AuthProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Envolvemos todo con el AuthProvider por fuera, 
      para que el DataProvider (y toda la app) pueda saber quién es el usuario.
    */}
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
);