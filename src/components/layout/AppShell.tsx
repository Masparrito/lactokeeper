import React from 'react';
import { Droplets, BarChart2, GitMerge, Plus, Search } from 'lucide-react';

interface AppShellProps {
  page: string;
  setPage: (page: string) => void;
  children: React.ReactNode;
}

// Este componente ahora es completamente responsivo.
export default function AppShell({ page, setPage, children }: AppShellProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'analysis', label: 'Análisis', icon: GitMerge },
    { id: 'add-data', label: 'Añadir Datos', icon: Plus },
  ];

  return (
    // 1. Contenedor raíz con 'h-screen' y 'overflow-hidden'
    <div className="bg-gray-900 text-gray-200 font-sans h-screen overflow-hidden flex selection:bg-indigo-500 selection:text-white">

      {/* --- Barra Lateral (Solo para Escritorio) --- */}
      <aside className="w-64 bg-gray-900/70 backdrop-blur-lg border-r border-gray-800 p-4 flex-col hidden md:flex">
        <div className="flex items-center space-x-2 mb-8">
          <Droplets className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">LactoKeeper</h1>
        </div>

        <nav className="flex-grow">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg text-left transition-colors ${
                page === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-4 border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Rebaño</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Buscar cabra..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </aside>

      {/* --- (INICIO) CORRECCIÓN DE SCROLL --- */}
      {/* 2. <main> es el ÚNICO scroll y tiene el padding para el header y nav */}
      <main className="flex-1 overflow-y-auto pt-16 pb-16 md:pt-8 md:pb-8 md:p-8">
      {/* --- (FIN) CORRECCIÓN DE SCROLL --- */}
        {children}
      </main>

      {/* --- Barra de Navegación Inferior (Solo para Móvil) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-gray-700 flex justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${
              page === item.id ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-400'
            }`}
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}