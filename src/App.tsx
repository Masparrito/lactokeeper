// src/App.tsx

import { useState } from 'react';
import DashboardPage from './pages/Dashboard';
import AddDataPage from './pages/AddDataPage';
// CORRECCIÓN: Se ajusta la ruta de importación a la carpeta correcta.
import AnimalProfilePage from './pages/AnimalProfilePage';
import AddParturitionPage from './pages/AddParturitionPage';
import AnimalsPage from './pages/AnimalsPage';
import HistoryPage from './pages/HistoryPage';
import { BarChartIcon, PlusCircleIcon, List, CalendarClock } from 'lucide-react';

const navItems = [
    { page: { name: 'dashboard' }, label: 'Dashboard', icon: BarChartIcon },
    { page: { name: 'animals' }, label: 'Animales', icon: List },
    { page: { name: 'history' }, label: 'Historial', icon: CalendarClock },
    { page: { name: 'add-data' }, label: 'Añadir', icon: PlusCircleIcon },
] as const;

export type PageState = 
  | { name: 'dashboard' } 
  | { name: 'animals', defaultView?: 'all' | 'milking' }
  | { name: 'history' }
  | { name: 'add-data' }
  | { name: 'add-parturition' }
  | { name: 'animal-profile', animalId: string };

export default function App() {
  const [page, setPage] = useState<PageState>({ name: 'dashboard' });
  const [history, setHistory] = useState<PageState[]>([]);

  const navigateTo = (newPage: PageState) => {
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
        return <DashboardPage onNavigateToAnimals={(view) => navigateTo({ name: 'animals', defaultView: view })} />;
      
      case 'animals':
        return <AnimalsPage 
                  onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} 
                  defaultView={page.defaultView}
               />;
      
      case 'history':
        return <HistoryPage onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} />;

      case 'add-data':
        return <AddDataPage onNavigate={(p: 'add-parturition') => navigateTo({ name: p })} />;
      
      case 'add-parturition':
        return <AddParturitionPage onBack={navigateBack} />;

      case 'animal-profile':
        return <AnimalProfilePage animalId={page.animalId} onBack={navigateBack} />;
      
      default:
        return <DashboardPage onNavigateToAnimals={(view) => navigateTo({ name: 'animals', defaultView: view })} />;
    }
  };

  return (
    <div className="font-sans p-4 pt-0 pb-24">
        {renderPage()}
        
        { (page.name === 'dashboard' || page.name === 'add-data' || page.name === 'animals' || page.name === 'history') && (
            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around animate-fade-in">
                {navItems.map((item) => (
                  <button
                    key={item.page.name}
                    onClick={() => {
                      setHistory([]);
                      setPage(item.page);
                    }}
                    className={`flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${
                      page.name === item.page.name ? 'text-amber-400' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    <item.icon />
                    <span className="text-xs font-semibold mt-1">{item.label}</span>
                  </button>
                ))}
            </nav>
        )}
    </div>
  );
}