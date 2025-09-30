// src/App.tsx

import { useState } from 'react';
import DashboardPage from './pages/Dashboard';
import AddDataPage from './pages/AddDataPage';
import AnimalProfilePage from './pages/AnimalProfilePage';
import AddParturitionPage from './pages/AddParturitionPage';
import AnimalsPage from './pages/AnimalsPage';
import HistoryPage from './pages/HistoryPage';
import ManagementPage from './pages/ManagementPage';
import { BarChartIcon, PlusCircleIcon, List, CalendarClock, Bell } from 'lucide-react';
import { useManagementAlerts } from './hooks/useManagementAlerts';
import { PeriodStats } from './hooks/useHistoricalAnalysis'; // Importamos el tipo

export type PageState = 
  | { name: 'dashboard' } 
  | { name: 'animals' } 
  | { name: 'management', defaultView?: 'drying' | 'dry' } 
  | { name: 'history' } // Simplificamos el tipo aquí
  | { name: 'add-data' }
  | { name: 'add-parturition', motherId?: string } 
  | { name: 'animal-profile', animalId: string };

export default function App() {
  const [page, setPage] = useState<PageState>({ name: 'dashboard' });
  const [history, setHistory] = useState<PageState[]>([]);
  // --- NUEVO ESTADO PARA RECORDAR LA VISTA DEL HISTORIAL ---
  const [historySelectedPeriod, setHistorySelectedPeriod] = useState<PeriodStats | null>(null);
  
  const { alertsCount } = useManagementAlerts();

  const navItems = [
    { page: { name: 'dashboard' }, label: 'Dashboard', icon: BarChartIcon },
    { page: { name: 'animals' }, label: 'Análisis', icon: List },
    { page: { name: 'management', defaultView: 'drying' }, label: 'Manejo', icon: Bell },
    { page: { name: 'history' }, label: 'Historial', icon: CalendarClock },
    { page: { name: 'add-data' }, label: 'Añadir', icon: PlusCircleIcon },
  ] as const;

  const navigateTo = (newPage: PageState) => {
    // Si salimos de la página de historial, reseteamos su estado
    if (page.name === 'history' && newPage.name !== 'history') {
      setHistorySelectedPeriod(null);
    }
    setHistory(currentHistory => [...currentHistory, page]);
    setPage(newPage);
  };

  const navigateBack = () => {
    const lastPage = history[history.length - 1];
    if (lastPage) {
      setHistory(currentHistory => currentHistory.slice(0, -1));
      setPage(lastPage);
    } else {
      setPage({ name: 'dashboard' });
    }
  };

  const renderPage = () => {
    switch (page.name) {
      case 'dashboard':
        return <DashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'animals' })} />;
      case 'animals':
        return <AnimalsPage onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} />;
      case 'management':
        return <ManagementPage onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} defaultView={page.defaultView} />;
      case 'history':
        // Pasamos el estado y la función para actualizarlo
        return <HistoryPage 
                 onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })}
                 selectedPeriod={historySelectedPeriod}
                 setSelectedPeriod={setHistorySelectedPeriod} 
               />;
      case 'add-data':
        return <AddDataPage onNavigate={(pageName, state) => navigateTo({ name: pageName, ...state })} />;
      case 'add-parturition':
        return <AddParturitionPage onBack={navigateBack} motherId={page.motherId} />;
      case 'animal-profile':
        return <AnimalProfilePage animalId={page.animalId} onBack={navigateBack} />;
      default:
        return <DashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'animals' })} />;
    }
  };

  return (
    <div className="font-sans p-4 pt-0 pb-24">
        {renderPage()}
        
        <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around animate-fade-in">
            {navItems.map((item) => {
                let isActive = false;
                const currentPage = page;
                const itemPage = item.page;
                if (currentPage.name === itemPage.name) {
                    if (currentPage.name === 'management' && itemPage.name === 'management') { isActive = true; } 
                    else if (currentPage.name === 'animals' && itemPage.name === 'animals') { isActive = true; }
                    else if (currentPage.name !== 'animals' && currentPage.name !== 'management') { isActive = true; }
                }
                return (
                  <button key={item.label} onClick={() => { setHistory([]); setPage(item.page); }}
                    className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${isActive ? 'text-amber-400' : 'text-gray-500 hover:text-white'}`}>
                    {alertsCount > 0 && item.label === 'Manejo' && (<div className="absolute top-2 right-[calc(50%-20px)] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black/50"></div>)}
                    <item.icon />
                    <span className="text-xs font-semibold mt-1">{item.label}</span>
                  </button>
                )
            })}
        </nav>
    </div>
  );
}