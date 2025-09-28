// src/App.tsx

import { useState } from 'react';
import DashboardPage from './pages/Dashboard';
// CORRECCIÓN: Se ajusta la ruta de importación a la carpeta correcta.
import AddDataPage from './pages/AddDataPage'; 
import AnimalProfilePage from './pages/AnimalProfilePage';
import { BarChartIcon, PlusCircleIcon } from './components/ui/Icons';

const navItems = [
    { page: { name: 'dashboard' }, label: 'Dashboard', icon: BarChartIcon },
    { page: { name: 'add-data' }, label: 'Añadir', icon: PlusCircleIcon },
] as const;

type PageState = 
  | { name: 'dashboard' } 
  | { name: 'add-data' } 
  | { name: 'animal-profile', animalId: string };

export default function App() {
  const [page, setPage] = useState<PageState>({ name: 'dashboard' });

  const renderPage = () => {
    switch (page.name) {
      case 'dashboard':
        return <DashboardPage onSelectAnimal={(animalId: string) => setPage({ name: 'animal-profile', animalId })} />;
      case 'add-data':
        return <AddDataPage />;
      case 'animal-profile':
        return <AnimalProfilePage animalId={page.animalId} onBack={() => setPage({ name: 'dashboard' })} />;
      default:
        return <DashboardPage onSelectAnimal={(animalId: string) => setPage({ name: 'animal-profile', animalId })} />;
    }
  };

  return (
    <div className="font-sans p-4 pt-0 pb-24">
        {renderPage()}
        
        { (page.name === 'dashboard' || page.name === 'add-data') && (
            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around animate-fade-in">
                {navItems.map((item) => (
                  <button
                    key={item.page.name}
                    onClick={() => setPage(item.page)}
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