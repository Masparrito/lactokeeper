import { useState, useEffect } from 'react';
import LotsDashboardPage from './LotsDashboardPage';
import LotDetailPage from './LotDetailPage';
import AddAnimalPage from './AddAnimalPage';
import HerdPage from './HerdPage';
import RebanoProfilePage from './RebanoProfilePage';
import ManagementPage from './ManagementPage';
import ManageLotsPage from './ManageLotsPage';
import BreedingSeasonDetailPage from './BreedingSeasonDetailPage';
import SireLotDetailPage from './SireLotDetailPage';
import LactationProfilePage from './LactationProfilePage';
import FeedingPlanPage from './FeedingPlanPage';
import BatchTreatmentPage from './BatchTreatmentPage';
import GrowthProfilePage from './modules/kilos/GrowthProfilePage';
import OcrPage from './OcrPage';
import FarmCalendarPage from './FarmCalendarPage';
import BirthingSeasonDetailPage from './BirthingSeasonDetailPage';
import { ModuleSwitcher } from '../components/ui/ModuleSwitcher';
import { PlusCircle, LogOut, CalendarDays } from 'lucide-react';
import { GiGoat, GiBarn } from 'react-icons/gi';
import { FaCow } from "react-icons/fa6";
import { auth } from '../firebaseConfig';
import { useData } from '../context/DataContext';
import { SyncStatusIcon } from '../components/ui/SyncStatusIcon';
import type { PageState, AppModule } from '../types/navigation';

// --- CORRECCIÓN: Se define el tipo para la nueva prop 'initialState' ---
interface InitialRebanoState {
    page: PageState | null;
    sourceModule?: AppModule;
}

interface RebanoShellProps {
    // --- CORRECCIÓN: Se cambia 'initialPage' (del App.tsx original) por 'initialState' ---
    initialState: InitialRebanoState;
    onSwitchModule: (module: AppModule) => void;
}

export default function RebanoShell({ initialState, onSwitchModule }: RebanoShellProps) {
    const { syncStatus } = useData();
    const [page, setPage] = useState<PageState>({ name: 'lots-dashboard' });
    const [history, setHistory] = useState<PageState[]>([]);

    useEffect(() => {
        // --- CORRECCIÓN: Se usa initialState.page para establecer la vista ---
        if (initialState && initialState.page) {
            setPage(initialState.page);
            // Se limpia el historial para que el botón "Atrás" salga del módulo
            setHistory([]); 
        } else {
            // Si no hay estado inicial, se va al dashboard por defecto
            setPage({ name: 'lots-dashboard' });
            setHistory([]);
        }
    }, [initialState]); // La dependencia ahora es el objeto 'initialState'

    const navItems = [
        { page: { name: 'lots-dashboard' }, label: 'Lotes', icon: GiBarn, mapsTo: ['lots-dashboard', 'lot-detail', 'breeding-season-detail', 'sire-lot-detail', 'feeding-plan', 'batch-treatment'] },
        { page: { name: 'herd' }, label: 'Rebaño', icon: FaCow, mapsTo: ['herd', 'rebano-profile', 'manage-lots', 'lactation-profile', 'growth-profile'] },
        { page: { name: 'farm-calendar' }, label: 'Calendario', icon: CalendarDays, mapsTo: ['farm-calendar', 'birthing-season-detail'] },
        { page: { name: 'add-animal' }, label: 'Añadir', icon: PlusCircle, mapsTo: ['add-animal', 'ocr'] },
    ] as const;

    const navigateTo = (newPage: PageState) => {
        setHistory(currentHistory => [...currentHistory, page]);
        setPage(newPage);
    };

    // --- CORRECCIÓN: Lógica de 'navigateBack' actualizada ---
    const navigateBack = () => {
        const lastPage = history.pop();
        if (lastPage) {
            // Si hay historial interno en Rebaño, retrocede
            setHistory([...history]);
            setPage(lastPage);
        } else if (initialState && initialState.sourceModule) {
            // Si no hay historial Y veníamos de otro módulo, regresamos a él
            onSwitchModule(initialState.sourceModule);
        } else {
            // Si no hay nada más, vamos al dashboard por defecto de este módulo
            setPage({ name: 'lots-dashboard' });
        }
    };
    
    const handleNavClick = (newPage: PageState) => {
        setHistory([]);
        setPage(newPage);
    };

    const renderPage = () => {
        switch (page.name) {
            case 'lots-dashboard': return <LotsDashboardPage navigateTo={navigateTo} />;
            case 'lot-detail': return <LotDetailPage lotName={page.lotName} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'breeding-season-detail': return <BreedingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'sire-lot-detail': return <SireLotDetailPage lotId={page.lotId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'herd': return <HerdPage navigateTo={navigateTo} locationFilter={page.locationFilter} />;
            case 'manage-lots': return <ManageLotsPage onBack={() => handleNavClick({ name: 'herd' })} />;
            case 'management': return <ManagementPage onSelectAnimal={(animalId) => navigateTo({ name: 'rebano-profile', animalId })} />;
            case 'add-animal': return <AddAnimalPage onBack={() => handleNavClick({ name: 'herd' })} />;
            case 'rebano-profile': return <RebanoProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'lactation-profile': return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'growth-profile': return <GrowthProfilePage animalId={page.animalId} onBack={navigateBack} />;
            case 'ocr': return <OcrPage onBack={navigateBack} />;
            case 'feeding-plan': return <FeedingPlanPage lotName={page.lotName} onBack={navigateBack} />;
            case 'batch-treatment': return <BatchTreatmentPage lotName={page.lotName} onBack={navigateBack} />;
            case 'farm-calendar': return <FarmCalendarPage navigateTo={navigateTo} />;
            case 'birthing-season-detail': return <BirthingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            default: return <LotsDashboardPage navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="font-sans text-gray-200 min-h-screen animate-fade-in">
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                    <div className="flex items-center gap-2">
                        <GiGoat className="text-brand-orange" size={28}/>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">Rebaño</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            <main className="pt-16 pb-16">{renderPage()}</main> {/* pt-16 (h-16 header), pb-16 (h-16 nav) */}
            <ModuleSwitcher onSwitchModule={onSwitchModule} />
            <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
                {navItems.map((item) => {
                    const isActive = (item.mapsTo as readonly string[]).includes(page.name);
                    return (<button key={item.label} onClick={() => handleNavClick(item.page)} className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${isActive ? 'text-amber-400' : 'text-gray-500 hover:text-white'}`}><item.icon className="w-6 h-6" /><span className="text-xs font-semibold mt-1">{item.label}</span></button>);
                })}
                <button onClick={() => auth.signOut()} className="relative flex flex-col items-center justify-center pt-3 pb-2 w-full text-gray-500 hover:text-red-400 transition-colors"><LogOut className="w-6 h-6" /><span className="text-xs font-semibold mt-1">Salir</span></button>
            </nav>
        </div>
    );
}
