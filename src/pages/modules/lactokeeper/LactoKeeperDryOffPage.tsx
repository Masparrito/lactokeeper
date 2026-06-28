// src/pages/modules/lactokeeper/LactoKeeperDryOffPage.tsx

import { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { ChevronRight } from 'lucide-react';
import { Parturition, Animal } from '../../../db/local';
import type { PageState as RebanoPageState } from '../../../types/navigation';
// --- CAMBIO: formatAnimalDisplay no es necesario aquí ---
// import { formatAnimalDisplay } from '../../../utils/formatting';

type ManagementStatusView = 'drying' | 'dry';

// --- StatusAnimalRow ACTUALIZADO ---
const StatusAnimalRow = ({ animal, parturition, onSelectAnimal }: { animal: Animal, parturition: Parturition, onSelectAnimal: (id: string) => void }) => {
    // --- CAMBIO: Variable 'animalDisplay' eliminada ---
    
    return (
        <div onClick={() => onSelectAnimal(animal.id)} className="w-full cursor-pointer text-left bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border flex justify-between items-center hover:border-amber-400 transition-colors min-h-[80px]">
            <div className="min-w-0 pr-3">
                <p className="font-mono font-semibold text-base text-c-text-strong truncate">
                    {animal.id.toUpperCase()}
                </p>
                {animal.name && (
                  <p className="text-sm font-normal text-c-text-strong truncate">{animal.name.toUpperCase().trim()}</p>
                )}
                <div className="text-xs text-c-text-faint mt-1 min-h-[1rem] truncate">
                    {parturition.status === 'en-secado' && `Secado desde: ${new Date(parturition.dryingStartDate! + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'})}`}
                    {parturition.status === 'seca' && `Lactancia finalizada`}
                </div>
            </div>
            <ChevronRight className="text-c-text-faint w-5 h-5 flex-shrink-0" />
        </div>
    );
};
// --- FIN StatusAnimalRow ---


interface LactoKeeperDryOffPageProps {
    navigateToRebano: (page: RebanoPageState) => void;
}

export default function LactoKeeperDryOffPage({ navigateToRebano }: LactoKeeperDryOffPageProps) {
    const { animals, parturitions, isLoading } = useData();
    const [view, setView] = useState<ManagementStatusView>('drying');

    const lists = useMemo(() => {
        const getAnimal = (goatId: string) => animals.find(a => a.id === goatId);
        
        const drying = parturitions
            .filter(p => p.status === 'en-secado')
            .sort((a, b) => new Date(b.dryingStartDate!).getTime() - new Date(a.dryingStartDate!).getTime())
            .map(p => ({ animal: getAnimal(p.goatId), parturition: p }))
            .filter(item => item.animal && !item.animal.isReference);

        const dry = parturitions
            .filter(p => p.status === 'seca')
            // --- CAMBIO: Ordenar por dryingStartDate en lugar de endDate ---
            .sort((a, b) => new Date(b.dryingStartDate!).getTime() - new Date(a.dryingStartDate!).getTime())
            .map(p => ({ animal: getAnimal(p.goatId), parturition: p }))
            .filter(item => item.animal && !item.animal.isReference);

        return { drying, dry };
    }, [animals, parturitions]);

    const currentList = lists[view] || [];

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-c-text-muted">Cargando datos...</h1></div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 px-4">
            <header className="text-center pt-4 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-c-text-strong">Gestión de Secado</h1>
                <p className="text-md text-c-text-muted">Animales por Estado de Lactancia</p>
            </header>

            <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-2 border border-c-border">
                <div className="flex bg-c-surface-2 rounded-xl p-1 w-full">
                    <button onClick={() => setView('drying')} className={`w-1/2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${view === 'drying' ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:bg-c-surface-2'}`}>En Secado ({lists.drying.length})</button>
                    <button onClick={() => setView('dry')} className={`w-1/2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${view === 'dry' ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:bg-c-surface-2'}`}>Secas ({lists.dry.length})</button>
                </div>
            </div>
            
            <div className="space-y-4">
                {currentList.length > 0 ? (
                    currentList.map(({ animal, parturition }) => (
                        <StatusAnimalRow 
                            key={parturition!.id} 
                            animal={animal!} 
                            parturition={parturition!} 
                            onSelectAnimal={(id) => navigateToRebano({ name: 'lactation-profile', animalId: id })} 
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-c-surface rounded-2xl">
                        <p className="text-c-text-muted">No hay animales en este estado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}