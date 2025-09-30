// src/pages/ManagementPage.tsx

import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ChevronRight } from 'lucide-react';
import { Parturition, Animal } from '../db/local';

type ManagementStatusView = 'drying' | 'dry' | 'needsDrying';

const StatusAnimalRow = ({ animal, parturition, onSelectAnimal }: { animal: Animal, parturition: Parturition, onSelectAnimal: (id: string) => void }) => (
    <div onClick={() => onSelectAnimal(animal.id)} className="w-full cursor-pointer text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-amber-400 transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{animal.id}</p>
            <p className="text-sm text-zinc-400">
                {parturition.status === 'en-secado' && `Secado desde: ${new Date(parturition.dryingStartDate!).toLocaleDateString()}`}
                {parturition.status === 'seca' && `Lactancia finalizada`}
            </p>
        </div>
        <ChevronRight className="text-zinc-600" />
    </div>
);

interface ManagementPageProps {
    onSelectAnimal: (animalId: string) => void;
    defaultView?: ManagementStatusView;
}

export default function ManagementPage({ onSelectAnimal, defaultView = 'drying' }: ManagementPageProps) {
    const { animals, parturitions, isLoading } = useData();
    const [view, setView] = useState<ManagementStatusView>(defaultView);

    useEffect(() => { setView(defaultView); }, [defaultView]);

    const lists = useMemo(() => {
        const getAnimal = (goatId: string) => animals.find(a => a.id === goatId);
        const drying = parturitions.filter(p => p.status === 'en-secado').map(p => ({ animal: getAnimal(p.goatId), parturition: p })).filter(i => i.animal);
        const dry = parturitions.filter(p => p.status === 'seca').map(p => ({ animal: getAnimal(p.goatId), parturition: p })).filter(i => i.animal);
        return { drying, dry };
    }, [animals, parturitions]);

    const currentList = lists[view as keyof typeof lists] || [];

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando datos...</h1></div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <header className="text-center pt-8 pb-4">
                <h1 className="text-4xl font-bold tracking-tight text-white">Gestión de Rebaño</h1>
                <p className="text-xl text-zinc-400">Animales por Estado de Lactancia</p>
            </header>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border flex justify-between items-center">
                <div className="flex bg-zinc-900/80 rounded-xl p-1 w-full">
                    <button onClick={() => setView('drying')} className={`w-1/2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${view === 'drying' ? 'bg-blue-500 text-white' : 'text-zinc-300 hover:bg-zinc-700/50'}`}>En Secado ({lists.drying.length})</button>
                    <button onClick={() => setView('dry')} className={`w-1/2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${view === 'dry' ? 'bg-gray-600 text-white' : 'text-zinc-300 hover:bg-zinc-700/50'}`}>Secas ({lists.dry.length})</button>
                </div>
            </div>
            
            <div className="space-y-2">
                {currentList.length > 0 ? (
                    currentList.map(({ animal, parturition }) => (
                        <StatusAnimalRow key={parturition!.id} animal={animal!} parturition={parturition!} onSelectAnimal={onSelectAnimal} />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-400">No hay animales en este estado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}