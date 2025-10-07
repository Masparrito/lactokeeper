import { useState } from 'react';
import { PageState as RebanoPageState } from '../RebanoShell';
import { ArrowLeft, BarChart2, GitMerge, PlusCircle, Scale } from 'lucide-react';
import AddWeightPage from './kilos/AddWeightPage';
import KilosDashboard from './kilos/KilosDashboard';

const KilosAnalysis = () => ( <div className="text-center p-8 animate-fade-in"><h1 className="text-3xl font-bold">Análisis de GDP</h1><p className="text-zinc-400 mt-2">Aquí estará la Campana de Gauss y análisis de precocidad.</p></div> );

type KilosPage = 'dashboard' | 'analysis' | 'add-data';

interface KilosShellProps {
    navigateToRebano: (page: RebanoPageState) => void;
    onExitModule: () => void;
}

export default function KilosShell({ navigateToRebano, onExitModule }: KilosShellProps) {
    const [page, setPage] = useState<KilosPage>('dashboard');

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: GitMerge },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
    ];

    const handleBackPress = () => {
        if (page === 'dashboard') {
            onExitModule();
        } else {
            setPage('dashboard');
        }
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard':
                return <KilosDashboard onSelectAnimal={(animalId) => navigateToRebano({ name: 'rebano-profile', animalId })} />;
            case 'analysis':
                return <KilosAnalysis />;
            case 'add-data':
                return <AddWeightPage onSaveSuccess={() => setPage('dashboard')} />;
            default:
                return <KilosDashboard onSelectAnimal={(animalId) => navigateToRebano({ name: 'rebano-profile', animalId })} />;
        }
    };

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col">
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                    <button onClick={handleBackPress} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Atrás">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Scale className="text-brand-green" />
                        <h1 className="text-xl font-bold">Kilos</h1>
                    </div>
                    <div className="w-8"></div> {/* Espaciador */}
                </div>
            </header>
            
            <main className="flex-grow pt-20 pb-24">
                {renderContent()}
            </main>

            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setPage(item.id as KilosPage)}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${page === item.id ? 'text-brand-green' : 'text-gray-400 hover:text-brand-green'}`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}