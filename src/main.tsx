import React from 'react';
import ReactDOM from 'react-dom/client';
// Esta línea es la que necesita que App.tsx tenga un "export default"
import App from './App.tsx';
import './index.css';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModulePrefsProvider } from './context/ModulePrefsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ModulePrefsProvider>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </ModulePrefsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
