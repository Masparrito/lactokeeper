import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import AddDataPage from './pages/AddDataPage';
import AnimalProfilePage from './pages/AnimalProfilePage';
import AddParturitionPage from './pages/AddParturitionPage';
import AnimalsPage from './pages/AnimalsPage';
import HistoryPage from './pages/HistoryPage';
import ManagementPage from './pages/ManagementPage';
import OcrPage from './pages/OcrPage'; // <-- 1. IMPORTAR LA PÁGINA
import { BarChartIcon, PlusCircleIcon, List, CalendarClock, Bell, LogOut } from 'lucide-react';
import { useManagementAlerts } from './hooks/useManagementAlerts';
import { PeriodStats } from './hooks/useHistoricalAnalysis';
import { auth } from './firebaseConfig';

export type PageState = 
  | { name: 'dashboard' } 
  | { name: 'animals' } 
  | { name: 'management' } 
  | { name: 'history' }
  | { name: 'add-data' }
  | { name: 'add-parturition', motherId?: string } 
  | { name: 'animal-profile', animalId: string }
  | { name: 'ocr' }; // <-- 2. AÑADIR 'ocr' A LOS ESTADOS POSIBLES

// --- Renombramos el componente principal a "LactoKeeperApp" ---
const LactoKeeperApp = () => {
  const [page, setPage] = useState<PageState>({ name: 'dashboard' });
  const [history, setHistory] = useState<PageState[]>([]);
  const [historySelectedPeriod, setHistorySelectedPeriod] = useState<PeriodStats | null>(null);
  
  const { alertsCount } = useManagementAlerts();

  const navItems = [
    { page: { name: 'dashboard' }, label: 'Dashboard', icon: BarChartIcon },
    { page: { name: 'animals' }, label: 'Análisis', icon: List },
    { page: { name: 'management' }, label: 'Manejo', icon: Bell },
    { page: { name: 'history' }, label: 'Historial', icon: CalendarClock },
    { page: { name: 'add-data' }, label: 'Añadir', icon: PlusCircleIcon },
  ] as const;

  const navigateTo = (newPage: PageState) => {
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
        return <ManagementPage onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} />;
      case 'history':
        return <HistoryPage onSelectAnimal={(animalId) => navigateTo({ name: 'animal-profile', animalId })} selectedPeriod={historySelectedPeriod} setSelectedPeriod={setHistorySelectedPeriod} />;
      case 'add-data':
        return <AddDataPage onNavigate={(pageName, state) => navigateTo({ name: pageName as any, ...state })} />;
      case 'add-parturition':
        return <AddParturitionPage onBack={navigateBack} motherId={page.motherId} />;
      case 'animal-profile':
        return <AnimalProfilePage animalId={page.animalId} onBack={navigateBack} />;
      case 'ocr': // <-- 3. AÑADIR EL CASO PARA RENDERIZAR LA PÁGINA
        return <OcrPage onBack={navigateBack} />;
      default:
        return <DashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'animals' })} />;
    }
  };

  return (
    <div className="font-sans bg-gray-900 text-gray-200 min-h-screen">
      <div className="p-4 pt-0 pb-24">
        {renderPage()}
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around animate-fade-in">
        {navItems.map((item) => {
            let isActive = false;
            if (page.name === item.page.name) { isActive = true; }
            if (page.name === 'management' && item.label === 'Manejo') { isActive = true; }
            if (page.name === 'animals' && item.label === 'Análisis') { isActive = true; }

            return (
              <button key={item.label} onClick={() => { setHistory([]); setPage(item.page); }}
                className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${isActive ? 'text-amber-400' : 'text-gray-500 hover:text-white'}`}>
                {alertsCount > 0 && item.label === 'Manejo' && (<div className="absolute top-2 right-[calc(50%-20px)] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black/50"></div>)}
                <item.icon />
                <span className="text-xs font-semibold mt-1">{item.label}</span>
              </button>
            )
        })}
        {/* --- Botón para Cerrar Sesión --- */}
        <button
            onClick={() => auth.signOut()}
            className="relative flex flex-col items-center justify-center pt-3 pb-2 w-full text-gray-500 hover:text-red-400 transition-colors"
        >
            <LogOut />
            <span className="text-xs font-semibold mt-1">Salir</span>
        </button>
      </nav>
    </div>
  );
};

// --- Este es el nuevo componente 'App' que actúa como el "director" ---
export default function App() {
    const { currentUser } = useAuth();

    // Si hay un usuario, muestra la app principal. Si no, muestra la página de Login.
    return currentUser ? <LactoKeeperApp /> : <LoginPage />;
}