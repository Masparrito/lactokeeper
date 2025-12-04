import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { 
    ArrowLeft, Plus, Calendar, Sun, Users, 
    ChevronRight, Trash2, Dna 
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { SireLotForm } from '../components/forms/SireLotForm';
import { LightTreatmentActionModal } from '../components/modals/LightTreatmentActionModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { SireLot } from '../db/local';
import { formatAnimalDisplay } from '../utils/formatting';

interface BreedingSeasonDetailPageProps {
    seasonId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function BreedingSeasonDetailPage({ seasonId, navigateTo, onBack }: BreedingSeasonDetailPageProps) {
    const { breedingSeasons, sireLots, animals, fathers, addSireLot, deleteSireLot } = useData();
    
    // Estados
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const [isLightModalOpen, setIsLightModalOpen] = useState(false); 
    const [lotToDelete, setLotToDelete] = useState<SireLot | null>(null);

    // 1. Obtener datos de la Temporada
    const season = useMemo(() => breedingSeasons.find(s => s.id === seasonId), [breedingSeasons, seasonId]);

    // 2. Obtener Lotes de esta Temporada
    const seasonLots = useMemo(() => {
        if (!season) return [];
        return sireLots.filter(lot => lot.seasonId === season.id);
    }, [sireLots, season]);

    // 3. Calcular Estadísticas (Hembras totales en la temporada)
    const stats = useMemo(() => {
        let totalFemales = 0;
        const activeLotIds = new Set(seasonLots.map(l => l.id));
        
        // Contamos animales activos asignados a cualquiera de estos lotes
        const females = animals.filter(a => 
            a.status === 'Activo' && 
            !a.isReference && 
            a.sireLotId && 
            activeLotIds.has(a.sireLotId)
        );
        totalFemales = females.length;

        return { totalFemales, totalSires: seasonLots.length };
    }, [animals, seasonLots]);

    // Handlers
    const handleAddLot = async (sireId: string) => {
        // Verificar si el macho ya está en esta temporada
        const exists = seasonLots.some(l => l.sireId === sireId);
        if (exists) {
            alert("Este reproductor ya tiene un lote en esta temporada.");
            return;
        }
        await addSireLot({ seasonId: seasonId, sireId });
        setAddLotModalOpen(false);
    };

    const handleDeleteLot = async () => {
        if (lotToDelete) {
            await deleteSireLot(lotToDelete.id);
            setLotToDelete(null);
        }
    };

    // Helper para nombre de Semental
    const getSireName = (sireId: string) => {
        const father = fathers.find(f => f.id === sireId);
        if (father) return formatAnimalDisplay(father);
        const animal = animals.find(a => a.id === sireId);
        if (animal) return formatAnimalDisplay(animal);
        return 'Semental Desconocido';
    };

    if (!season) return <div className="p-10 text-center text-zinc-500">Temporada no encontrada.</div>;

    const startDate = new Date(season.startDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const endDate = new Date(season.endDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <>
            <div className="w-full max-w-2xl mx-auto pb-20 animate-fade-in">
                
                {/* HEADER */}
                <header className="pt-8 pb-4 px-4 sticky top-0 bg-brand-dark z-30 border-b border-brand-border">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white leading-none">{season.name}</h1>
                                <div className="flex items-center gap-2 mt-1 text-zinc-400 text-xs font-medium">
                                    <Calendar size={12} />
                                    <span>{startDate} - {endDate}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${season.status === 'Activo' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                        {season.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {season.status === 'Activo' && (
                            <button 
                                onClick={() => setAddLotModalOpen(true)}
                                className="bg-brand-blue hover:bg-blue-600 text-white p-2 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <Plus size={24} />
                            </button>
                        )}
                    </div>

                    {/* Stats Rápidos */}
                    <div className="flex gap-4 mt-4">
                        <div className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center gap-2 border border-zinc-700/50">
                            <Dna size={16} className="text-brand-blue" />
                            <div>
                                <p className="text-lg font-bold text-white leading-none">{stats.totalSires}</p>
                                <p className="text-[10px] text-zinc-500 uppercase">Lotes / Machos</p>
                            </div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center gap-2 border border-zinc-700/50">
                            <Users size={16} className="text-pink-400" />
                            <div>
                                <p className="text-lg font-bold text-white leading-none">{stats.totalFemales}</p>
                                <p className="text-[10px] text-zinc-500 uppercase">Hembras Asig.</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 space-y-6">
                    
                    {/* TARJETA DE TRATAMIENTO DE LUZ (BOTÓN ACTIVO) */}
                    {season.requiresLightTreatment && (
                        <div 
                            onClick={() => setIsLightModalOpen(true)}
                            className={`rounded-2xl p-4 border flex items-start gap-4 relative overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] ${
                                season.lightTreatmentConfirmed 
                                    ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10' 
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                            }`}
                        >
                            <div className="bg-yellow-500/10 p-3 rounded-full">
                                <Sun size={24} className="text-yellow-500" />
                            </div>
                            <div className="flex-1 z-10">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">Tratamiento de Luz</h3>
                                    <ChevronRight size={16} className="text-zinc-600" />
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {season.lightTreatmentStartDate 
                                        ? `Inicio: ${new Date(season.lightTreatmentStartDate + 'T00:00:00').toLocaleDateString()}` 
                                        : 'Toca para configurar la fecha de inicio'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${season.lightTreatmentConfirmed ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    <span className="text-xs font-medium text-zinc-300">
                                        {season.lightTreatmentStatus || 'Pendiente de Inicio'}
                                    </span>
                                </div>
                            </div>
                            {/* Decoración de fondo */}
                            <Sun className="absolute -bottom-4 -right-4 text-yellow-500/5 w-32 h-32 pointer-events-none" />
                        </div>
                    )}

                    {/* LISTA DE LOTES */}
                    <div>
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1">Lotes de Reproducción</h3>
                        
                        {seasonLots.length > 0 ? (
                            <div className="space-y-3">
                                {seasonLots.map((lot) => (
                                    <div 
                                        key={lot.id}
                                        className="group relative w-full bg-brand-glass backdrop-blur-md border border-brand-border hover:border-zinc-600 rounded-2xl transition-all overflow-hidden"
                                    >
                                        <div 
                                            onClick={() => navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
                                            className="p-4 flex justify-between items-center cursor-pointer active:bg-zinc-800/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-brand-blue font-bold text-xs border border-zinc-700">
                                                    ID
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base">{getSireName(lot.sireId)}</p>
                                                    <p className="text-xs text-zinc-500">
                                                        Toca para gestionar hembras
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
                                        </div>

                                        {/* Botón Eliminar */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setLotToDelete(lot); }}
                                            className="absolute top-0 bottom-0 right-0 w-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border-l border-red-500/20"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">
                                <Dna size={32} className="text-zinc-700 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500">No hay lotes creados en esta temporada.</p>
                                {season.status === 'Activo' && (
                                    <button onClick={() => setAddLotModalOpen(true)} className="mt-3 text-brand-blue text-sm font-bold hover:underline">
                                        + Agregar Primer Macho
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* MODALES */}
            <Modal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} title="Nuevo Lote de Monta">
                <SireLotForm 
                    seasonId={season.id} 
                    onSave={handleAddLot}
                    onCancel={() => setAddLotModalOpen(false)}
                />
            </Modal>

            {/* --- CORRECCIÓN: Usar los tipos correctos START / END --- */}
            {isLightModalOpen && (
                <LightTreatmentActionModal
                    isOpen={true}
                    onClose={() => setIsLightModalOpen(false)}
                    seasonId={season.id}
                    actionType={season.lightTreatmentConfirmed ? 'END' : 'START'} // <-- CORREGIDO
                />
            )}

            <ConfirmationModal 
                isOpen={!!lotToDelete}
                onClose={() => setLotToDelete(null)}
                onConfirm={handleDeleteLot}
                title="Eliminar Lote"
                message="¿Estás seguro? Se desvincularán las hembras asignadas a este macho, pero no se borrarán sus registros históricos."
            />
        </>
    );
}