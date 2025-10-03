import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell';
import { ChevronRight, Users, Zap, Plus, AlertTriangle } from 'lucide-react';
import { BreedingGroup } from '../db/local';
import { AddBreedingGroupModal } from '../components/ui/AddBreedingGroupModal';
import { useBreedingAnalysis } from '../hooks/useBreedingAnalysis';

// --- Sub-componente para la Tarjeta de Lote Físico ---
const LotCard = ({ lotName, count, onClick }: { lotName: string, count: number, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-amber transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{lotName}</p>
            <p className="text-sm text-zinc-400">{count} {count === 1 ? 'animal' : 'animales'}</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="bg-blue-600/80 text-white font-bold text-lg rounded-lg px-3 py-1">{count}</span>
            <ChevronRight className="text-zinc-600" />
        </div>
    </button>
);

// --- Sub-componente para la Tarjeta de Lote de Monta ---
const BreedingGroupCard = ({ group, animalCount, hasAlert, onClick }: { group: BreedingGroup, animalCount: number, hasAlert: boolean, onClick: () => void }) => {
    const alertClasses = hasAlert 
        ? 'border-red-500/80 ring-2 ring-red-500/60 shadow-lg shadow-red-900/50' 
        : 'border-brand-border';

    return (
        <button onClick={onClick} className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border flex justify-between items-center hover:border-brand-amber transition-all ${alertClasses}`}>
            <div>
                <p className="font-bold text-lg text-white flex items-center gap-2">
                    {group.name}
                    {hasAlert && <AlertTriangle className="text-red-400" size={16} />}
                </p>
                <p className="text-sm text-zinc-400">
                    Semental: {group.sireId} | {animalCount} {animalCount === 1 ? 'hembra' : 'hembras'}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${group.status === 'Activo' ? 'bg-green-500/80 text-white' : 'bg-zinc-600 text-zinc-300'}`}>
                    {group.status}
                </span>
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};


interface LotsDashboardPageProps {
    navigateTo: (page: PageState) => void;
}

// --- Vista para la Pestaña de Lotes Físicos ---
const PhysicalLotsView = ({ navigateTo }: LotsDashboardPageProps) => {
    const { animals, lots } = useData();

    const lotsSummary = useMemo(() => {
        const countsByLocation = animals.reduce((acc, animal) => {
            const location = animal.location || 'Sin Asignar';
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const allLotNames = new Set([...lots.map(l => l.name), ...Object.keys(countsByLocation)]);

        return Array.from(allLotNames).map(lotName => ({
            name: lotName,
            count: countsByLocation[lotName] || 0,
        })).sort((a, b) => b.count - a.count);
    }, [animals, lots]);

    return (
        <div className="space-y-2 animate-fade-in">
            {lotsSummary.map(({ name, count }) => (
                <LotCard 
                    key={name}
                    lotName={name}
                    count={count}
                    onClick={() => navigateTo({ name: 'lot-detail', lotName: name })}
                />
            ))}
        </div>
    );
};

// --- Vista para la Pestaña de Lotes de Monta ---
const BreedingLotsView = ({ navigateTo }: LotsDashboardPageProps) => {
    const { breedingGroups, animals } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    
    const { concludedGroups, groupsWithAlerts } = useBreedingAnalysis();

    const lotsData = useMemo(() => {
        const concludedIds = new Set(concludedGroups.map(g => g.id));
        
        const activeLots = breedingGroups
            .filter(group => group.status === 'Activo' && !concludedIds.has(group.id))
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

        const mapGroupToData = (group: BreedingGroup) => {
            const count = animals.filter(animal => animal.breedingGroupId === group.id).length;
            return { ...group, animalCount: count };
        };

        return {
            active: activeLots.map(mapGroupToData),
            concluded: concludedGroups.map(mapGroupToData),
        };
    }, [breedingGroups, animals, concludedGroups]);

    return (
        <>
            <div className="space-y-4 animate-fade-in">
                <button onClick={() => setModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors text-lg">
                    <Plus size={20} /> Activar Temporada de Monta
                </button>

                <div className="space-y-2 pt-2">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Temporadas Activas</h3>
                    {lotsData.active.length > 0 ? (
                        lotsData.active.map(group => (
                            <BreedingGroupCard 
                                key={group.id}
                                group={group}
                                animalCount={group.animalCount}
                                hasAlert={groupsWithAlerts.has(group.id)}
                                onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })}
                            />
                        ))
                    ) : (
                        <div className="text-center py-6 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">No hay temporadas de monta activas.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-4">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Temporadas Concluidas</h3>
                     {lotsData.concluded.length > 0 ? (
                        lotsData.concluded.map(group => (
                            <BreedingGroupCard 
                                key={group.id}
                                group={group}
                                animalCount={group.animalCount}
                                hasAlert={false}
                                onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })}
                            />
                        ))
                    ) : (
                        <div className="text-center py-6 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">Aún no hay temporadas concluidas.</p>
                        </div>
                    )}
                </div>
            </div>
            <AddBreedingGroupModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
};


// --- Componente Principal de la Página ---
export default function LotsDashboardPage({ navigateTo }: LotsDashboardPageProps) {
    const [activeTab, setActiveTab] = useState<'physical' | 'breeding'>('physical');

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <header className="text-center pt-8 pb-4">
                <h1 className="text-4xl font-bold tracking-tight text-white">Lotes</h1>
                <p className="text-xl text-zinc-400">Gestión de Grupos</p>
            </header>

            <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                <button onClick={() => setActiveTab('physical')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                    <Users size={16}/> Lotes Físicos
                </button>
                <button onClick={() => setActiveTab('breeding')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'breeding' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                    <Zap size={16}/> Lotes de Monta
                </button>
            </div>

            <div className="pt-4">
                {activeTab === 'physical' ? <PhysicalLotsView navigateTo={navigateTo} /> : <BreedingLotsView navigateTo={navigateTo} />}
            </div>
        </div>
    );
}