import React, { useState, useEffect } from 'react';
import LotsDashboardPage from './LotsDashboardPage';
import LotDetailPage from './LotDetailPage';
import AddAnimalPage from './AddAnimalPage';
import HerdPage from './HerdPage';
import RebanoProfilePage from './RebanoProfilePage';
import ManagementPage from './ManagementPage';
import ManageLotsPage from './ManageLotsPage';
import BreedingGroupDetailPage from './BreedingGroupDetailPage';
import LactationProfilePage from './LactationProfilePage';
import FeedingPlanPage from './FeedingPlanPage'; // 1. Importar la nueva página de Alimentación
import BatchTreatmentPage from './BatchTreatmentPage'; // 2. Importar la nueva página de Tratamientos
import { ModuleSwitcher } from '../components/ui/ModuleSwitcher';
import { Users, PlusCircle, Settings, LogOut, LayoutGrid } from 'lucide-react';
import { auth } from '../firebaseConfig';

// 3. Añadir los nuevos estados de página al tipo PageState
export type PageState = 
  | { name: 'lots-dashboard' } 
  | { name: 'lot-detail', lotName: string }
  | { name: 'breeding-group-detail', groupId: string }
  | { name: 'herd', locationFilter?: string }
  | { name: 'manage-lots' }
  | { name: 'management' } 
  | { name: 'rebano-profile', animalId: string }
  | { name: 'lactation-profile', animalId: string }
  | { name: 'add-animal' }
  | { name: 'feeding-plan', lotName: string }
  | { name: 'batch-treatment', lotName: string };

interface RebanoShellProps {
    initialPage: PageState | null;
    onSwitchModule: (module: 'lactokeeper' | 'kilos') => void;
}

const RebanoShell: React.FC<RebanoShellProps> = ({ initialPage, onSwitchModule }) => {
    const [page, setPage] = useState<PageState>({ name: 'lots-dashboard' });
    const [history, setHistory] = useState<PageState[]>([]);

    useEffect(() => {
        if (initialPage) {
            setPage(initialPage);
        }
    }, [initialPage]);

    const navItems = [
        { page: { name: 'lots-dashboard' }, label: 'Lotes', icon: LayoutGrid },
        { page: { name: 'herd' }, label: 'Rebaño', icon: Users },
        { page: { name: 'add-animal' }, label: 'Añadir', icon: PlusCircle },
        { page: { name: 'management' }, label: 'Manejo', icon: Settings },
    ] as const;

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
            setPage({ name: 'lots-dashboard' });
        }
    };

    const renderPage = () => {
        // 4. Añadir los nuevos 'case' al router
        switch (page.name) {
            case 'lots-dashboard':
                return <LotsDashboardPage navigateTo={navigateTo} />;
            case 'lot-detail':
                return <LotDetailPage lotName={page.lotName} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'breeding-group-detail':
                return <BreedingGroupDetailPage groupId={page.groupId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'herd':
                return <HerdPage navigateTo={navigateTo} locationFilter={page.locationFilter} />;
            case 'manage-lots':
                return <ManageLotsPage onBack={() => setPage({ name: 'herd' })} />;
            case 'management':
                return <ManagementPage onSelectAnimal={(animalId) => navigateTo({ name: 'rebano-profile', animalId })} />;
            case 'add-animal':
                return <AddAnimalPage onBack={() => setPage({ name: 'herd' })} />;
            case 'rebano-profile':
                return <RebanoProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'lactation-profile':
                 return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} />;
            case 'feeding-plan':
                return <FeedingPlanPage lotName={page.lotName} onBack={navigateBack} />;
            case 'batch-treatment':
                return <BatchTreatmentPage lotName={page.lotName} onBack={navigateBack} />;
            default:
                return <LotsDashboardPage navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="font-sans bg-gray-900 text-gray-200 min-h-screen animate-fade-in">
            <div className="p-4 pt-0 pb-24">
                {renderPage()}
            </div>
            
            <ModuleSwitcher onSwitchModule={onSwitchModule} />
      
            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => {
                    let isActive = false;
                    if (item.label === 'Lotes') {
                        isActive = ['lots-dashboard', 'lot-detail', 'breeding-group-detail', 'feeding-plan', 'batch-treatment'].includes(page.name);
                    } else if (item.label === 'Rebaño') {
                        isActive = ['herd', 'rebano-profile', 'manage-lots', 'add-animal'].includes(page.name);
                    } else {
                        isActive = page.name === item.page.name;
                    }

                    return (
                        <button key={item.label} onClick={() => { setHistory([]); setPage(item.page as any); }}
                            className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${isActive ? 'text-amber-400' : 'text-gray-500 hover:text-white'}`}>
                            <item.icon />
                            <span className="text-xs font-semibold mt-1">{item.label}</span>
                        </button>
                    );
                })}
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

export default RebanoShell;