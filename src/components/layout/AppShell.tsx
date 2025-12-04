import React from 'react';
import { BarChart2, GitMerge, Plus, LayoutGrid, Droplets } from 'lucide-react';

interface AppShellProps {
  page: string;
  setPage: (page: string) => void;
  children: React.ReactNode;
}

export default function AppShell({ page, setPage, children }: AppShellProps) {
  const navItems = [
    { id: 'dashboard', label: 'Monitor', icon: BarChart2 },
    { id: 'analysis', label: 'Análisis', icon: GitMerge },
    { id: 'add-data', label: 'Añadir', icon: Plus },
    { id: 'modules', label: 'Módulos', icon: LayoutGrid },
  ];

  return (
    <div className="bg-black text-gray-200 font-sans h-[100dvh] w-screen overflow-hidden flex selection:bg-indigo-500 selection:text-white">

      {/* --- Barra Lateral (Solo Escritorio) --- */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex-col hidden md:flex flex-shrink-0 z-30">
        <div className="flex items-center space-x-2 mb-8 px-2">
          <Droplets className="text-brand-blue" />
          <h1 className="text-xl font-bold text-white tracking-tight">GanaderoOS</h1>
        </div>
        <nav className="flex-grow space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                page === item.id 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* --- Contenido Principal --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        
        {/* Área de Scroll: pb-28 asegura espacio suficiente sobre la barra flotante */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth pt-[env(safe-area-inset-top)] pb-28">
            {children}
        </div>

        {/* --- Barra de Navegación Inferior (Móvil) --- */}
        {/* SIN HEIGHT FIJO. Padding controla el tamaño y cubre la zona segura */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around items-start z-50 pt-2 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              // pb-2 para separar un poco si el dispositivo no tiene safe area
              className="flex-1 flex flex-col items-center justify-center relative group active:scale-95 transition-transform pb-2"
            >
              {page === item.id && (
                  <div className="absolute -top-2 w-8 h-1 bg-brand-blue rounded-b-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
              <div className={`p-1 rounded-xl transition-all duration-300 ${
                  page === item.id ? 'text-brand-blue' : 'text-zinc-500'
              }`}>
                  <item.icon className="w-6 h-6" strokeWidth={page === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                  page === item.id ? 'text-brand-blue' : 'text-zinc-600'
              }`}>
                  {item.label}
              </span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}