import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell'; // RUTA CORREGIDA
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { AddBreedingGroupModal } from '../components/ui/AddBreedingGroupModal';
import { BreedingGroup } from '../db/local';

// Componente para una tarjeta de Lote de Monta
const BreedingGroupCard = ({ group, onClick }: { group: BreedingGroup, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-amber transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{group.name}</p>
            <p className="text-sm text-zinc-400">
                Semental: {group.sireId} | {new Date(group.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(group.endDate + 'T00:00:00').toLocaleDateString()}
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


interface BreedingGroupsPageProps {
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function BreedingGroupsPage({ navigateTo, onBack }: BreedingGroupsPageProps) {
    const { breedingGroups, isLoading } = useData();
    const [isModalOpen, setModalOpen] = useState(false);

    const sortedGroups = useMemo(() => {
        return [...breedingGroups].sort((a, b) => {
            // Activos primero, luego por fecha de inicio más reciente
            if (a.status === 'Activo' && b.status !== 'Activo') return -1;
            if (a.status !== 'Activo' && b.status === 'Activo') return 1;
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
    }, [breedingGroups]);

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando...</h1></div>;
    }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Lotes de Monta</h1>
                        <p className="text-md text-zinc-400">Gestión Reproductiva</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <button 
                    onClick={() => setModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"
                >
                    <Plus size={20} /> Activar Nuevo Lote de Monta
                </button>

                <div className="space-y-2 pt-4">
                    {sortedGroups.length > 0 ? (
                        sortedGroups.map(group => (
                            <BreedingGroupCard 
                                key={group.id}
                                group={group}
                                onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">No has activado ningún lote de monta.</p>
                        </div>
                    )}
                </div>
            </div>

            <AddBreedingGroupModal 
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    );
}
