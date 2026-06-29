import React from 'react';
import ReactDOM from 'react-dom/client';
// Esta línea es la que necesita que App.tsx tenga un "export default"
import App from './App.tsx';
import './index.css';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModulePrefsProvider } from './context/ModulePrefsContext';
import { ShortcutsProvider } from './context/ShortcutsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ModulePrefsProvider>
        <ShortcutsProvider>
          <AuthProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </AuthProvider>
        </ShortcutsProvider>
      </ModulePrefsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
