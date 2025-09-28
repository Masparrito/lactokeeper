import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DataProvider } from './context/DataContext';

// Envolvemos toda la aplicación <App /> con el <DataProvider />
// para que todos los componentes hijos tengan acceso a los datos.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>,
);

