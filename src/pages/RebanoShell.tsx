// src/pages/RebanoShell.tsx (CORREGIDO)

import { useState, useEffect, useRef } from 'react';
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
// (CORREGIDO) 'OcrPage' eliminado. Ya no es una página de nivel superior.
// import OcrPage from './BatchImportPage'; 
import FarmCalendarPage from './FarmCalendarPage';
import BirthingSeasonDetailPage from './BirthingSeasonDetailPage';
import ConfiguracionPage from './ConfiguracionPage'; 
import { ModuleSwitcher } from '../components/ui/ModuleSwitcher';
import { PlusCircle, CalendarDays, Settings, Bell, Grid } from 'lucide-react'; 
import { GiGoat, GiBarn } from 'react-icons/gi';
import { FaCow } from "react-icons/fa6";
import { useData } from '../context/DataContext';
import { SyncStatusIcon } from '../components/ui/SyncStatusIcon';
import type { PageState, AppModule } from '../types/navigation';
import { useManagementAlerts } from '../hooks/useManagementAlerts'; 

interface InitialRebanoState {
    page: PageState | null;
    sourceModule?: AppModule;
}

interface RebanoShellProps {
    initialState: InitialRebanoState;
    onSwitchModule: (module: AppModule) => void;
}

export default function RebanoShell({ initialState, onSwitchModule }: RebanoShellProps) {
    const { syncStatus } = useData(); 
    const [page, setPage] = useState<PageState>({ name: 'lots-dashboard' });
    const [history, setHistory] = useState<PageState[]>([]);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);
    
    const allAlerts = useManagementAlerts();
    const hasAlerts = allAlerts.length > 0;

    const [viewMode, setViewMode] = useState<'Activos' | 'Referencia'>('Activos');
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
    const [productiveFilter, setProductiveFilter] = useState<string>('ALL');
    const [reproductiveFilter, setReproductiveFilter] = useState<string>('ALL');
    const [decommissionFilter, setDecommissionFilter] = useState<'all' | 'Venta' | 'Muerte' | 'Descarte'>('all');

    useEffect(() => {
        if (initialState && initialState.page) {
            setPage(initialState.page);
            setHistory([]); 
        } else {
            setPage({ name: 'lots-dashboard' });
            setHistory([]);
        }
    }, [initialState]); 

    const navItems = [
        { id: 'lots-dashboard', page: { name: 'lots-dashboard' }, label: 'Lotes', icon: GiBarn, mapsTo: ['lots-dashboard', 'lot-detail', 'breeding-season-detail', 'sire-lot-detail', 'feeding-plan', 'batch-treatment'] },
        { id: 'herd', page: { name: 'herd' }, label: 'Rebaño', icon: FaCow, mapsTo: ['herd', 'rebano-profile', 'manage-lots', 'lactation-profile', 'growth-profile', 'configuracion', 'management'] },
        // (CORREGIDO) El 'mapsTo' de 'add-animal' ya no incluye 'ocr'
        { id: 'add-animal', page: { name: 'add-animal' }, label: 'Añadir', icon: PlusCircle, mapsTo: ['add-animal'] },
        { id: 'farm-calendar', page: { name: 'farm-calendar' }, label: 'Calendario', icon: CalendarDays, mapsTo: ['farm-calendar', 'birthing-season-detail'] },
        { id: 'modules', label: 'Módulos', icon: Grid, mapsTo: [] }, 
    ] as const;

    const navigateTo = (newPage: PageState) => {
        setHistory(currentHistory => [...currentHistory, page]);
        setPage(newPage);
        mainScrollRef.current?.scrollTo(0, 0); 
    };

    const navigateBack = () => {
        const lastPage = history.pop();
        if (lastPage) {
            setHistory([...history]);
            setPage(lastPage);
        } else if (initialState && initialState.sourceModule) {
            onSwitchModule(initialState.sourceModule);
        } else {
            setPage({ name: 'lots-dashboard' });
        }
        mainScrollRef.current?.scrollTo(0, 0); 
    };
    
    const handleNavClick = (item: (typeof navItems)[number]) => {
        if (item.id === 'modules') {
            setIsModuleSwitcherOpen(true);
        } else {
            setHistory([]);
            setPage(item.page); 
        }
    };

    const renderPage = () => {
        const commonProps = {
            navigateTo: navigateTo,
            onBack: navigateBack,
        };

        switch (page.name) {
            case 'lots-dashboard': return <LotsDashboardPage navigateTo={navigateTo} />;
            
            case 'lot-detail': 
                return <LotDetailPage 
                    lotName={page.lotName} 
                    onBack={navigateBack} 
                    navigateTo={navigateTo} 
                    scrollContainerRef={mainScrollRef}
                />;
            
            case 'breeding-season-detail': 
                return <BreedingSeasonDetailPage 
                    seasonId={page.seasonId} 
                    onBack={navigateBack} 
                    navigateTo={navigateTo} 
                />;

            case 'sire-lot-detail': return <SireLotDetailPage lotId={page.lotId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'herd': 
                return <HerdPage 
                    {...commonProps}
                    locationFilter={page.locationFilter}
                    kpiFilter={page.kpiFilter}
                    scrollContainerRef={mainScrollRef} 
                    filterStates={{
                        viewMode,
                        categoryFilter,
                        productiveFilter,
                        reproductiveFilter,
                        decommissionFilter
                    }}
                    filterSetters={{
                        setViewMode,
                        setCategoryFilter,
                        setProductiveFilter,
                        setReproductiveFilter,
                        setDecommissionFilter
                    }}
                />;
            case 'manage-lots': return <ManageLotsPage onBack={() => handleNavClick(navItems.find(i => i.id === 'herd')!)} />;
            case 'management': return <ManagementPage navigateTo={navigateTo} onBack={navigateBack} />; 
            case 'add-animal': return <AddAnimalPage onBack={() => handleNavClick(navItems.find(i => i.id === 'herd')!)} />;
            case 'rebano-profile': return <RebanoProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'lactation-profile': return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'growth-profile': return <GrowthProfilePage animalId={page.animalId} onBack={navigateBack} />;
            
            // (CORREGIDO) Caso 'ocr' eliminado. TS2739 resuelto.
            // case 'ocr': return <OcrPage onBack={navigateBack} />;

            case 'feeding-plan': return <FeedingPlanPage lotName={page.lotName} onBack={navigateBack} />;
            case 'batch-treatment': return <BatchTreatmentPage lotName={page.lotName} onBack={navigateBack} />;
            case 'farm-calendar': return <FarmCalendarPage navigateTo={navigateTo} />;
            case 'birthing-season-detail': return <BirthingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'configuracion': return <ConfiguracionPage navigateTo={navigateTo} onBack={navigateBack} />;
            default: return <LotsDashboardPage navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="font-sans text-gray-200 h-screen overflow-hidden flex flex-col animate-fade-in">
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border h-16">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-full">
                    <div className="flex items-center gap-2">
                        <GiGoat className="text-brand-orange" size={28}/> 
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">Rebaño</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <SyncStatusIcon status={syncStatus} /> 
                        <button 
                            onClick={() => navigateTo({ name: 'management' })}
                            className="p-2 text-zinc-400 hover:text-white transition-colors relative"
                            title="Alertas de Manejo"
                        >
                            <Bell size={20} />
                            {hasAlerts && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
                            )}
                        </button>
                        <button 
                            onClick={() => navigateTo({ name: 'configuracion' })}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                            title="Configuración"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>
            
            <main 
                ref={mainScrollRef} 
                className="flex-1 overflow-y-auto pt-16 pb-16" 
            >
                {renderPage()}
            </main> 
            
            <ModuleSwitcher 
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule} 
            />
            
            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
                
                {navItems.map((item) => {
                    const isActive = item.id !== 'modules' && (item.mapsTo as readonly string[]).includes(page.name);
                    const isAddButton = item.label === 'Añadir';
                    let buttonClasses = `relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors `;

                    if (isAddButton) {
                        buttonClasses += `text-brand-orange hover:bg-white/5`;
                    } else if (isActive) {
                        buttonClasses += `text-amber-400`;
                    } else {
                        buttonClasses += `text-gray-500 hover:text-white`;
                    }

                    return (
                        <button key={item.label} onClick={() => handleNavClick(item)} className={buttonClasses}>
                            <item.icon className="w-6 h-6" />
                            <span className="text-xs font-semibold mt-1">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}