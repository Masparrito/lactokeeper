// src/pages/SireLotDetailPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Search, Heart } from 'lucide-react';
import { Animal, ServiceRecord } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { formatAge } from '../utils/calculations';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';


// --- SUB-COMPONENTE: Tarjeta Interactiva de Hembra (con Swipe) ---
const SwipableFemaleRow = ({ animal, services, onSelect, onDeclareServiceClick }: { animal: Animal, services: ServiceRecord[], onSelect: (id: string) => void, onDeclareServiceClick: (animalId: string) => void }) => {
    const serviceCount = services.length;
    const lastServiceDate = serviceCount > 0 ? new Date(services[services.length - 1].serviceDate + 'T00:00:00').toLocaleDateString('es-VE') : null;
    
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 140; // Ancho del botón de "Reg. Servicio"

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        // Si el arrastre es mínimo, lo tratamos como un clic
        if (Math.abs(offset) < 5) { onSelect(animal.id); return; }
        
        // Si se desliza lo suficiente hacia la izquierda, revela el botón
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth });
        } else {
            swipeControls.start({ x: 0 }); // Vuelve a la posición original
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            {/* Botón de Acción (Oculto) */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button    
                    onClick={() => onDeclareServiceClick(animal.id)}    
                    onPointerDown={(e) => e.stopPropagation()}    
                    className="h-full w-[140px] flex flex-col items-center justify-center bg-pink-600 text-white"
                >
                    <Heart size={22} /><span className="text-xs mt-1 font-semibold">Reg. Servicio</span>
                </button>
            </div>
            
            {/* Contenido principal (Arrastrable) */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4"
            >
               <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg text-white">{animal.id}</p>
                        <p className="text-sm text-zinc-400">
                            {animal.sex} | {formatAge(animal.birthDate)} | Lote: {animal.location || 'Sin Asignar'}
                        </p>
                    </div>
                    <div className="text-right">
                        {serviceCount > 0 ? (
                            <p className="flex items-center gap-1 text-pink-400 font-semibold">
                                <Heart size={14} fill="currentColor" /> {serviceCount} Servicios
                            </p>
                        ) : (
                            <p className="text-zinc-500 text-sm">Sin servicio</p>
                        )}
                        {lastServiceDate && <p className="text-xs text-zinc-400">Últ: {lastServiceDate}</p>}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

interface SireLotDetailPageProps {
    lotId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function SireLotDetailPage({ lotId, navigateTo, onBack }: SireLotDetailPageProps) {
    const { sireLots, fathers, animals, parturitions, serviceRecords, breedingSeasons, updateAnimal, addServiceRecord } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceModal, setServiceModal] = useState<{ isOpen: boolean; animalId: string | null; }>({ isOpen: false, animalId: null });

    const lot = useMemo(() => sireLots.find(l => l.id === lotId), [sireLots, lotId]);
    const sireName = useMemo(() => fathers.find(f => f.id === lot?.sireId)?.name || 'Desconocido', [fathers, lot]);

    const assignedFemales = useMemo(() => {
        if (!lot) return [];
        return animals.filter(animal => animal.sireLotId === lot.id).sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, lot]);

    const filteredFemales = useMemo(() => {
        if (!searchTerm) return assignedFemales;
        return assignedFemales.filter(animal => animal.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [assignedFemales, searchTerm]);

    const handleAssignFemales = async (selectedIds: string[]) => {
        if (!lot) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { sireLotId: lot.id, reproductiveStatus: 'En Servicio' });
        });
        await Promise.all(updatePromises);
    };

    const handleDeclareService = async (date: Date) => {
        if (!lot || !serviceModal.animalId) return;
        
        await addServiceRecord({    
            sireLotId: lot.id,    
            femaleId: serviceModal.animalId,    
            serviceDate: date.toISOString().split('T')[0]    
        });

        setServiceModal({ isOpen: false, animalId: null });
    };
    
    if (!lot) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Lote de Reproductor no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div>; }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="flex items-center justify-between pt-8 pb-4 px-4 sticky top-0 bg-gray-900/80 backdrop-blur-lg z-10 border-b border-brand-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    
                    <div className="text-center flex-grow">
                        <h1 className="text-xl font-bold tracking-tight text-white truncate">Lote: {sireName}</h1>
                        <p className="text-xs text-zinc-400 truncate">Reproductor: {sireName} ({lot.sireId})</p>
                    </div>

                    <button onClick={() => setSelectorOpen(true)} className="p-2 -mr-2 bg-brand-orange hover:bg-orange-600 text-white rounded-full transition-colors">
                        <Plus size={24} />
                    </button>
                </header>
                
                <div className="space-y-4 pt-4 px-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-zinc-300">Hembras Asignadas ({filteredFemales.length})</h3>
                        <div className="relative w-40"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full bg-zinc-800/80 rounded-lg pl-8 pr-2 py-1 text-white border-transparent focus:border-brand-amber focus:ring-0 text-sm" /></div>
                    </div>
                    <div className="space-y-2">
                        {filteredFemales.length > 0 ? (    
                            filteredFemales.map(animal => {    
                                const animalServices = serviceRecords.filter(sr => sr.femaleId === animal.id && sr.sireLotId === lot.id).sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());    
                                return (
                                    <SwipableFemaleRow    
                                        key={animal.id}    
                                        animal={animal}    
                                        services={animalServices}    
                                        onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })}
                                        onDeclareServiceClick={(id) => setServiceModal({ isOpen: true, animalId: id })}
                                    />
                                );
                            })    
                        ) : ( <div className="text-center py-10 bg-brand-glass rounded-2xl"><p className="text-zinc-500">{searchTerm ? 'No se encontraron coincidencias.' : 'Aún no has asignado hembras a este lote.'}</p></div> )}
                    </div>
                </div>
            </div>

            <AdvancedAnimalSelector    
                isOpen={isSelectorOpen}    
                onClose={() => setSelectorOpen(false)}    
                onSelect={handleAssignFemales}    
                animals={animals}    
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                title={`Asignar Hembras al Lote de ${sireName}`}    
                sireIdForInbreedingCheck={lot.sireId}    
            />

            <DeclareServiceModal
                isOpen={serviceModal.isOpen}
                onClose={() => setServiceModal({ isOpen: false, animalId: null })}
                onSave={handleDeclareService}
                animalId={serviceModal.animalId || ''}
            />
        </>
    );
}