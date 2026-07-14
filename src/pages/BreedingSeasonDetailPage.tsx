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
    const { breedingSeasons, sireLots, animals, fathers, serviceRecords, addSireLot, deleteSireLot } = useData();
    
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

    // 3. Calcular Estadísticas (hembras asignadas y servidas en la temporada)
    const stats = useMemo(() => {
        const activeLotIds = new Set(seasonLots.map(l => l.id));
        const females = animals.filter(a =>
            a.status === 'Activo' &&
            !a.isReference &&
            a.sireLotId &&
            activeLotIds.has(a.sireLotId)
        );
        const totalFemales = females.length;
        const served = females.filter(f =>
            serviceRecords.some(sr => sr.femaleId === f.id && activeLotIds.has(sr.sireLotId))
        ).length;
        const pct = totalFemales > 0 ? Math.round((served / totalFemales) * 100) : 0;
        return { totalFemales, totalSires: seasonLots.length, served, pct };
    }, [animals, serviceRecords, seasonLots]);

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

    if (!season) return <div className="p-10 text-center text-c-text-muted">Temporada no encontrada.</div>;

    const startDate = new Date(season.startDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const endDate = new Date(season.endDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <>
            <div className="w-full max-w-2xl mx-auto pb-24 animate-fade-in">

                {/* HEADER */}
                <header className="pt-8 pb-4 px-4 sticky top-0 bg-c-bg/95 backdrop-blur-md z-30 border-b border-c-border">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                            <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors shrink-0">
                                <ArrowLeft size={24} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-c-text-strong leading-tight truncate">{season.name}</h1>
                                <div className="flex items-center gap-2 mt-1 text-c-text-muted text-xs font-medium">
                                    <Calendar size={12} />
                                    <span>{startDate} - {endDate}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${season.status === 'Activo' ? 'bg-c-accent/15 text-c-accent' : 'bg-c-surface-2 text-c-text-faint'}`}>
                                        {season.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {season.status === 'Activo' && (
                            <button
                                onClick={() => setAddLotModalOpen(true)}
                                className="bg-c-accent-sky hover:bg-c-accent-sky/90 text-white p-2.5 rounded-xl transition-colors shadow-sm shrink-0"
                                title="Agregar macho"
                            >
                                <Plus size={22} />
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-4 space-y-5">

                    {/* Resumen: machos, hembras y medidor de servidas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-c-surface rounded-2xl p-4 border border-c-border flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-c-accent-sky/10 flex items-center justify-center text-c-accent-sky shrink-0"><Dna size={18} /></div>
                            <div>
                                <p className="text-2xl font-bold text-c-text-strong leading-none">{stats.totalSires}</p>
                                <p className="text-[10px] text-c-text-faint uppercase font-bold tracking-wider mt-1">Machos</p>
                            </div>
                        </div>
                        <div className="bg-c-surface rounded-2xl p-4 border border-c-border flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-c-accent-gold/10 flex items-center justify-center text-c-accent-gold shrink-0"><Users size={18} /></div>
                            <div>
                                <p className="text-2xl font-bold text-c-text-strong leading-none">{stats.totalFemales}</p>
                                <p className="text-[10px] text-c-text-faint uppercase font-bold tracking-wider mt-1">Hembras</p>
                            </div>
                        </div>
                    </div>

                    {stats.totalFemales > 0 && (
                        <div className="bg-c-surface rounded-2xl p-4 border border-c-border">
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-c-text-faint">Servidas</span>
                                <span className="text-sm font-bold text-c-text-strong">
                                    {stats.served}<span className="text-c-text-faint font-medium">/{stats.totalFemales}</span>
                                    <span className="text-c-accent"> · {stats.pct}%</span>
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-c-surface-2 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-c-accent transition-all" style={{ width: `${stats.pct}%` }} />
                            </div>
                        </div>
                    )}

                    {/* TARJETA DE TRATAMIENTO DE LUZ */}
                    {season.requiresLightTreatment && (
                        <button
                            onClick={() => setIsLightModalOpen(true)}
                            className={`w-full text-left rounded-2xl p-4 border flex items-start gap-4 relative overflow-hidden transition-all active:scale-[0.99] ${
                                season.lightTreatmentConfirmed
                                    ? 'bg-c-accent-gold/10 border-c-accent-gold/25 hover:bg-c-accent-gold/15'
                                    : 'bg-c-surface border-c-border hover:border-c-accent-gold/40'
                            }`}
                        >
                            <div className="bg-c-accent-gold/15 p-3 rounded-full shrink-0">
                                <Sun size={22} className="text-c-accent-gold" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-c-accent-gold uppercase tracking-wide">Tratamiento de Luz</h3>
                                    <ChevronRight size={16} className="text-c-text-faint" />
                                </div>
                                <p className="text-xs text-c-text-muted mt-1">
                                    {season.lightTreatmentStartDate
                                        ? `Inicio: ${new Date(season.lightTreatmentStartDate + 'T00:00:00').toLocaleDateString()}`
                                        : 'Toca para configurar la fecha de inicio'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${season.lightTreatmentConfirmed ? 'bg-c-accent' : 'bg-brand-red animate-pulse'}`} />
                                    <span className="text-xs font-medium text-c-text">
                                        {season.lightTreatmentStatus || 'Pendiente de Inicio'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* LISTA DE MACHOS */}
                    <div>
                        <h3 className="text-xs font-bold text-c-text-faint uppercase tracking-wider mb-3 px-1">Reproductores</h3>

                        {seasonLots.length > 0 ? (
                            <div className="space-y-3">
                                {seasonLots.map((lot) => (
                                    <div
                                        key={lot.id}
                                        className="group relative w-full bg-c-surface border border-c-border hover:border-c-accent-sky/40 rounded-2xl transition-all overflow-hidden shadow-sm"
                                    >
                                        <button
                                            onClick={() => navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
                                            className="w-full p-4 flex justify-between items-center text-left active:bg-c-surface-2"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-c-bg flex items-center justify-center text-c-accent-sky border border-c-border shrink-0">
                                                    <Dna size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-c-text text-base truncate">{getSireName(lot.sireId)}</p>
                                                    <p className="text-xs text-c-text-muted">Toca para gestionar hembras</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-c-text-faint group-hover:text-c-text transition-colors shrink-0" />
                                        </button>

                                        {/* Botón Eliminar */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setLotToDelete(lot); }}
                                            className="absolute top-0 bottom-0 right-0 w-12 flex items-center justify-center bg-brand-red/10 hover:bg-brand-red/20 text-brand-red opacity-0 group-hover:opacity-100 transition-opacity border-l border-brand-red/20"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-c-surface rounded-2xl border border-c-border border-dashed">
                                <Dna size={32} className="text-c-text-faint mx-auto mb-3" />
                                <p className="text-sm text-c-text-muted">No hay machos en esta temporada.</p>
                                {season.status === 'Activo' && (
                                    <button onClick={() => setAddLotModalOpen(true)} className="mt-3 text-c-accent-sky text-sm font-bold hover:underline">
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