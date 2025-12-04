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
import FarmCalendarPage from './FarmCalendarPage';
import BirthingSeasonDetailPage from './BirthingSeasonDetailPage';
import ConfiguracionPage from './ConfiguracionPage'; 
import { ModuleSwitcher } from '../components/ui/ModuleSwitcher';
import { PlusCircle, CalendarDays, Settings, Bell, Grid } from 'lucide-react'; 
import { GiGoat } from 'react-icons/gi';
import { FaCow } from "react-icons/fa6";
import { useData } from '../context/DataContext';
import { SyncStatusIcon } from '../components/ui/SyncStatusIcon';
import type { PageState, AppModule } from '../types/navigation';
import { useManagementAlerts } from '../hooks/useManagementAlerts'; 

// --- DRAWER & ACTIONS ---
import { SwipeableQuickActions } from '../components/ui/SwipeableQuickActions';
import { QuickActionType } from '../components/ui/QuickActionFab'; 
import { QuickActionAnimalSelector } from '../components/modals/QuickActionAnimalSelector';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { DeclareServiceWeightModal } from '../components/modals/DeclareServiceWeightModal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { DeclareDryOffModal } from '../components/modals/DeclareDryOffModal';

interface InitialRebanoState {
    page: PageState | null;
    sourceModule?: AppModule;
}

interface RebanoShellProps {
    initialState: InitialRebanoState;
    onSwitchModule: (module: AppModule) => void;
}

export default function RebanoShell({ initialState, onSwitchModule }: RebanoShellProps) {
    const { syncStatus, updateAnimal, addEvent, addServiceRecord } = useData(); 
    const [page, setPage] = useState<PageState>({ name: 'lots-dashboard' });
    const [history, setHistory] = useState<PageState[]>([]);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);
    
    const allAlerts = useManagementAlerts();
    const hasAlerts = allAlerts.length > 0;

    // --- STATES FOR QUICK ACTIONS ---
    const [isQuickSelectorOpen, setIsQuickSelectorOpen] = useState(false);
    const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionType | null>(null);
    const [selectedQuickAnimal, setSelectedQuickAnimal] = useState<any>(null);

    const [isQuickWeanModalOpen, setIsQuickWeanModalOpen] = useState(false);
    const [isQuickServiceWeightModalOpen, setIsQuickServiceWeightModalOpen] = useState(false);
    const [isQuickParturitionModalOpen, setIsQuickParturitionModalOpen] = useState(false);
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [isQuickDryOffModalOpen, setIsQuickDryOffModalOpen] = useState(false);

    // Filters Persistence
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
        { id: 'lots-dashboard', page: { name: 'lots-dashboard' }, label: 'Lotes', icon: GiGoat, mapsTo: ['lots-dashboard', 'lot-detail', 'breeding-season-detail', 'sire-lot-detail', 'feeding-plan', 'batch-treatment'] },
        { id: 'herd', page: { name: 'herd' }, label: 'Rebaño', icon: FaCow, mapsTo: ['herd', 'rebano-profile', 'manage-lots', 'lactation-profile', 'growth-profile', 'configuracion', 'management'] },
        { id: 'add-animal', page: { name: 'add-animal' }, label: 'Añadir', icon: PlusCircle, mapsTo: ['add-animal'] },
        { id: 'farm-calendar', page: { name: 'farm-calendar' }, label: 'Calendario', icon: CalendarDays, mapsTo: ['farm-calendar', 'birthing-season-detail'] },
        { id: 'modules', label: 'Módulos', icon: Grid, mapsTo: [] }, 
    ] as const;

    const navigateTo = (newPage: PageState) => {
        setHistory(currentHistory => [...currentHistory, page]);
        setPage(newPage);
        mainScrollRef.current?.scrollTo(0, 0); 
    };

    // --- LÓGICA DE RETROCESO CORREGIDA ---
    const navigateBack = () => {
        // DETECCIÓN DE CASOS ESPECIALES (Interceptamos antes de ver el historial)
        // Esto soluciona que al volver de Temporadas te mande a la pestaña incorrecta.
        
        if (page.name === 'breeding-season-detail') {
            // <--- FIX: Si vuelvo de detalle temporada, fuerzo ir al dashboard con TAB 'seasons'
            // Usamos 'as any' para pasar propiedades extra que LotsDashboard pueda leer
            setPage({ name: 'lots-dashboard', initialTab: 'seasons' } as any);
            // Limpiamos el último historial para no duplicar si el usuario sigue dando atrás
            setHistory(h => h.slice(0, -1)); 
            return;
        }

        if (page.name === 'sire-lot-detail') {
            setPage({ name: 'lots-dashboard', initialTab: 'sires' } as any);
            setHistory(h => h.slice(0, -1));
            return;
        }

        // Lógica Estándar (Historial)
        const lastPage = history.pop();
        
        if (lastPage) {
            setHistory([...history]);
            setPage(lastPage);
        } else {
            // Lógica Jerárquica de Respaldo (Si no hay historial)
            switch (page.name) {
                case 'lot-detail':
                case 'feeding-plan':
                case 'batch-treatment':
                    setPage({ name: 'lots-dashboard' });
                    break;

                case 'rebano-profile':
                case 'lactation-profile':
                case 'growth-profile':
                case 'manage-lots':
                case 'configuracion':
                case 'management':
                case 'add-animal': 
                    setPage({ name: 'herd' });
                    break;

                case 'birthing-season-detail':
                    setPage({ name: 'farm-calendar' });
                    break;

                default:
                    if (initialState && initialState.sourceModule) {
                        onSwitchModule(initialState.sourceModule);
                    } else {
                        setPage({ name: 'lots-dashboard' });
                    }
                    break;
            }
        }
        mainScrollRef.current?.scrollTo(0, 0); 
    };
    
    const handleNavClick = (item: (typeof navItems)[number]) => {
        if (item.id === 'modules') {
            setIsModuleSwitcherOpen(true);
        } else {
            setHistory([]);
            setPage(item.page as PageState); 
        }
    };

    // --- HANDLERS ACCIONES RÁPIDAS ---
    const handleQuickActionSelect = (action: QuickActionType | 'add-animal' | 'kilos' | 'lactation-dashboard') => {
        if (action === 'add-animal') {
            handleNavClick(navItems.find(i => i.id === 'add-animal')!);
            return;
        }
        if (action === 'kilos') {
            onSwitchModule('kilos');
            return;
        }
        if (action === 'lactation-dashboard') {
            onSwitchModule('lactokeeper');
            return;
        }
        setSelectedQuickAction(action as QuickActionType);
        setIsQuickSelectorOpen(true);
    };

    const handleAnimalSelectedForAction = (animal: any) => {
        setSelectedQuickAnimal(animal);
        setIsQuickSelectorOpen(false); 
        switch (selectedQuickAction) {
            case 'destete': setIsQuickWeanModalOpen(true); break;
            case 'peso_servicio': setIsQuickServiceWeightModalOpen(true); break;
            case 'parto': setIsQuickParturitionModalOpen(true); break;
            case 'servicio_visto': setIsQuickServiceModalOpen(true); break;
            case 'secado': setIsQuickDryOffModalOpen(true); break;
        }
    };

    const handleQuickWeanSave = async (data: { weaningDate: string, weaningWeight: number }) => {
        if (!selectedQuickAnimal) return;
        await updateAnimal(selectedQuickAnimal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight });
        if (addEvent) {
            await addEvent({
                animalId: selectedQuickAnimal.id,
                date: data.weaningDate,
                type: 'Destete',
                details: `Destete (Acción Rápida): ${data.weaningWeight} Kg.`,
                metaWeight: data.weaningWeight
            });
        }
        setIsQuickWeanModalOpen(false);
        setSelectedQuickAnimal(null);
    };

    const handleQuickServiceSave = async (date: Date, sireLotId: string) => {
        if (!selectedQuickAnimal) return;
        await addServiceRecord({
            femaleId: selectedQuickAnimal.id,
            sireLotId: sireLotId,
            serviceDate: date.toISOString().split('T')[0]
        });
        setIsQuickServiceModalOpen(false);
        setSelectedQuickAnimal(null);
    };

    // --- RENDERER ---
    const renderPage = () => {
        const commonProps = { navigateTo, onBack: navigateBack };
        
        switch (page.name) {
            case 'lots-dashboard': 
                // <--- FIX: Pasamos el 'initialTab' si existe en el estado de la página
                // Asegúrate que tu componente LotsDashboardPage reciba esta prop
                return <LotsDashboardPage 
                    navigateTo={navigateTo} 
                    initialTab={(page as any).initialTab} 
                />;
            
            case 'lot-detail': return <LotDetailPage lotName={page.lotName} onBack={navigateBack} navigateTo={navigateTo} scrollContainerRef={mainScrollRef}/>;
            case 'breeding-season-detail': return <BreedingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'sire-lot-detail': return <SireLotDetailPage lotId={page.lotId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'herd': return <HerdPage {...commonProps} locationFilter={page.locationFilter} kpiFilter={page.kpiFilter} scrollContainerRef={mainScrollRef} filterStates={{ viewMode, categoryFilter, productiveFilter, reproductiveFilter, decommissionFilter }} filterSetters={{ setViewMode, setCategoryFilter, setProductiveFilter, setReproductiveFilter, setDecommissionFilter }} />;
            case 'manage-lots': return <ManageLotsPage onBack={() => handleNavClick(navItems.find(i => i.id === 'herd')!)} />;
            case 'management': return <ManagementPage navigateTo={navigateTo} onBack={navigateBack} />; 
            case 'add-animal': return <AddAnimalPage onBack={() => handleNavClick(navItems.find(i => i.id === 'herd')!)} />;
            case 'rebano-profile': return <RebanoProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} contextDate={(page as any).contextDate} />;
            case 'lactation-profile': return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'growth-profile': return <GrowthProfilePage animalId={page.animalId} onBack={navigateBack} />;
            case 'feeding-plan': return <FeedingPlanPage lotName={page.lotName} onBack={navigateBack} />;
            case 'batch-treatment': return <BatchTreatmentPage lotName={page.lotName} onBack={navigateBack} />;
            case 'farm-calendar': return <FarmCalendarPage navigateTo={navigateTo} />;
            case 'birthing-season-detail': return <BirthingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'configuracion': return <ConfiguracionPage navigateTo={navigateTo} onBack={navigateBack} />;
            default: return <LotsDashboardPage navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-[#09090b] overflow-hidden text-gray-200 font-sans">
            
            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-[#09090b] border-b border-zinc-800 transition-all duration-300"> 
                <div className="w-full h-[env(safe-area-inset-top)] bg-[#09090b]" />
                <div className="w-full h-[54px] flex items-center justify-between px-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-brand-orange/20 rounded-lg">
                             <GiGoat className="text-brand-orange" size={20}/> 
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-[10px] text-zinc-500 leading-none font-bold tracking-widest uppercase mt-0.5">Rebaño</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <SyncStatusIcon status={syncStatus} /> 
                        <button onClick={() => navigateTo({ name: 'management' })} className="p-2 text-zinc-400 hover:text-white transition-colors relative" title="Alertas">
                            <Bell size={18} />
                            {hasAlerts && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#09090b]"></span>}
                        </button>
                        <button onClick={() => navigateTo({ name: 'configuracion' })} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Configuración">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </header>
            
            {/* MAIN CONTENT */}
            <main 
                ref={mainScrollRef} 
                className="flex-1 w-full overflow-y-auto overflow-x-hidden bg-[#09090b] scroll-smooth relative"
                style={{
                    paddingTop: 'calc(54px + env(safe-area-inset-top))',
                    paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 20px)'
                }}
            >
                {renderPage()}
            </main> 
            
            {/* --- GESTOR DE ACCIONES (DRAWER) --- */}
            {page.name === 'lots-dashboard' && (
                <SwipeableQuickActions 
                    onActionSelect={(action) => handleQuickActionSelect(action as any)} 
                />
            )}

            {/* --- MODALES --- */}
            <QuickActionAnimalSelector 
                isOpen={isQuickSelectorOpen}
                onClose={() => setIsQuickSelectorOpen(false)}
                actionType={selectedQuickAction}
                onAnimalSelect={handleAnimalSelectedForAction}
            />

            {selectedQuickAnimal && (
                <>
                    <WeanAnimalForm
                        isOpen={isQuickWeanModalOpen}
                        animalId={selectedQuickAnimal.id}
                        birthDate={selectedQuickAnimal.birthDate}
                        onSave={handleQuickWeanSave}
                        onCancel={() => { setIsQuickWeanModalOpen(false); setSelectedQuickAnimal(null); }}
                    />
                    <DeclareServiceWeightModal 
                        isOpen={isQuickServiceWeightModalOpen}
                        onClose={() => { setIsQuickServiceWeightModalOpen(false); setSelectedQuickAnimal(null); }}
                        animal={selectedQuickAnimal}
                        currentWeight={0} 
                        suggestedDate={new Date().toISOString().split('T')[0]}
                    />
                    <ParturitionModal 
                        isOpen={isQuickParturitionModalOpen} 
                        onClose={() => { setIsQuickParturitionModalOpen(false); setSelectedQuickAnimal(null); }} 
                        motherId={selectedQuickAnimal.id} 
                    />
                    <DeclareServiceModal
                        isOpen={isQuickServiceModalOpen}
                        onClose={() => { setIsQuickServiceModalOpen(false); setSelectedQuickAnimal(null); }}
                        animal={selectedQuickAnimal}
                        onSave={handleQuickServiceSave}
                    />
                    <DeclareDryOffModal
                        isOpen={isQuickDryOffModalOpen}
                        onClose={() => { setIsQuickDryOffModalOpen(false); setSelectedQuickAnimal(null); }}
                        animal={selectedQuickAnimal}
                    />
                </>
            )}

            {/* NAVBAR */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center h-[60px] pt-1">
                    {navItems.map((item) => {
                        const isModuleBtn = item.id === 'modules';
                        const isActive = !isModuleBtn && (item.mapsTo as readonly string[]).includes(page.name);
                        const isAddButton = item.id === 'add-animal';
                        const activeColor = isAddButton ? 'text-brand-orange' : 'text-brand-blue';

                        return (
                            <button 
                                key={item.label} 
                                onClick={() => {
                                    if (isModuleBtn) setIsModuleSwitcherOpen(true);
                                    else handleNavClick(item);
                                }}
                                className="flex-1 flex flex-col items-center justify-center relative group active:scale-95 transition-transform h-full"
                            >
                                {isActive && (
                                    <div className={`absolute top-0 w-8 h-0.5 rounded-full shadow-[0_0_8px_currentColor] ${isAddButton ? 'bg-brand-orange' : 'bg-brand-blue'}`} />
                                )}
                                <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? `${activeColor} -translate-y-0.5` : (isModuleBtn ? 'text-zinc-400 hover:text-white' : 'text-zinc-500')}`}>
                                    <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wide transition-all duration-300 ${isActive ? activeColor : 'text-zinc-600'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* MODULE SWITCHER */}
            {isModuleSwitcherOpen && (
                <div className="fixed inset-0 z-[100]">
                    <ModuleSwitcher 
                        isOpen={isModuleSwitcherOpen}
                        onClose={() => setIsModuleSwitcherOpen(false)}
                        onSwitchModule={onSwitchModule} 
                    />
                </div>
            )}
        </div>
    );
}