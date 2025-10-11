// src/pages/RebanoShell.tsx

import React, { useState, useEffect } from 'react';
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
import type { PageState } from '../types/navigation';

interface RebanoShellProps {
    initialPage: PageState | null;
    // --- LÍNEA CORREGIDA: Se añade 'economia' a los tipos permitidos ---
    onSwitchModule: (module: 'lactokeeper' | 'kilos' | 'salud' | 'economia') => void;
}

const RebanoShell: React.FC<RebanoShellProps> = ({ initialPage, onSwitchModule }) => {
    const { syncStatus } = useData();
    const [page, setPage] = useState<PageState>({ name: 'lots-dashboard' });
    const [history, setHistory] = useState<PageState[]>([]);

    useEffect(() => {
        if (initialPage) {
            setPage(initialPage);
        }
    }, [initialPage]);

    const navItems = [
        { page: { name: 'lots-dashboard' }, label: 'Lotes', icon: GiBarn },
        { page: { name: 'herd' }, label: 'Rebaño', icon: FaCow },
        { page: { name: 'farm-calendar' }, label: 'Calendario', icon: CalendarDays },
        { page: { name: 'add-animal' }, label: 'Añadir', icon: PlusCircle },
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
        switch (page.name) {
            case 'lots-dashboard': return <LotsDashboardPage navigateTo={navigateTo} />;
            case 'lot-detail': return <LotDetailPage lotName={page.lotName} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'breeding-season-detail': return <BreedingSeasonDetailPage seasonId={page.seasonId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'sire-lot-detail': return <SireLotDetailPage lotId={page.lotId} onBack={navigateBack} navigateTo={navigateTo} />;
            case 'herd': return <HerdPage navigateTo={navigateTo} locationFilter={page.locationFilter} />;
            case 'manage-lots': return <ManageLotsPage onBack={() => setPage({ name: 'herd' })} />;
            case 'management': return <ManagementPage onSelectAnimal={(animalId) => navigateTo({ name: 'rebano-profile', animalId })} />;
            case 'add-animal': return <AddAnimalPage onBack={() => setPage({ name: 'herd' })} />;
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
                        <h1 className="text-xl font-bold text-white">Rebaño</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            <main className="pt-16 pb-24">{renderPage()}</main>
            <ModuleSwitcher onSwitchModule={onSwitchModule} />
            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => {
                    let isActive = false;
                    if (item.label === 'Lotes') isActive = ['lots-dashboard', 'lot-detail', 'breeding-season-detail', 'sire-lot-detail'].includes(page.name);
                    else if (item.label === 'Rebaño') isActive = ['herd', 'rebano-profile', 'manage-lots', 'lactation-profile', 'growth-profile'].includes(page.name);
                    else if (item.label === 'Calendario') isActive = ['farm-calendar', 'birthing-season-detail'].includes(page.name);
                    else if (item.label === 'Añadir') isActive = ['add-animal', 'ocr'].includes(page.name);
                    return (<button key={item.label} onClick={() => { setHistory([]); setPage(item.page as any); }} className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${isActive ? 'text-amber-400' : 'text-gray-500 hover:text-white'}`}><item.icon className="w-6 h-6" /><span className="text-xs font-semibold mt-1">{item.label}</span></button>);
                })}
                <button onClick={() => auth.signOut()} className="relative flex flex-col items-center justify-center pt-3 pb-2 w-full text-gray-500 hover:text-red-400 transition-colors"><LogOut className="w-6 h-6" /><span className="text-xs font-semibold mt-1">Salir</span></button>
            </nav>
        </div>
    );
};

export default RebanoShell;