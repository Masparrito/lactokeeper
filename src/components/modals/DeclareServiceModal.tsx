import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from '../ui/Modal';
import { HeartHandshake, Calendar, Dna, AlertTriangle } from 'lucide-react';
import { Animal } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';

interface DeclareServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    animal: Animal;
    // Ahora pasamos un onSave que recibe los datos completos
    onSave?: (date: Date, sireLotId: string) => Promise<void>; 
}

export const DeclareServiceModal: React.FC<DeclareServiceModalProps> = ({ 
    isOpen, 
    onClose, 
    animal,
    onSave 
}) => {
    const { addServiceRecord, sireLots, fathers, animals, breedingSeasons, serviceRecords, parturitions } = useData();
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSireLotId, setSelectedSireLotId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const daysBetween = (a: string, b: string) => {
        const d1 = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
        const d2 = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
        return Math.abs(Math.round((d1 - d2) / 86400000));
    };

    // 1. Detectar si la hembra ya está asignada a un lote
    useEffect(() => {
        if (isOpen && animal) {
            if (animal.sireLotId) {
                setSelectedSireLotId(animal.sireLotId);
            } else {
                setSelectedSireLotId('');
            }
            setError(null);
            setServiceDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, animal]);

    // 2. Lotes seleccionables: los de temporadas activas + el lote asignado (aunque su
    //    temporada esté cerrada), para poder declarar el servicio con OTRO macho.
    const activeLots = useMemo(() => {
        const activeSeasonIds = new Set(breedingSeasons.filter(s => s.status === 'Activo').map(s => s.id));
        return sireLots.filter(lot => activeSeasonIds.has(lot.seasonId));
    }, [breedingSeasons, sireLots]);

    const selectableLots = useMemo(() => {
        const list = [...activeLots];
        if (animal.sireLotId && !list.some(l => l.id === animal.sireLotId)) {
            const assigned = sireLots.find(l => l.id === animal.sireLotId);
            if (assigned) list.unshift(assigned);
        }
        return list;
    }, [activeLots, animal.sireLotId, sireLots]);

    // 3. Análisis de servicios previos del ciclo actual (advertencias de duplicado/proximidad).
    const priorAnalysis = useMemo(() => {
        const parts = parturitions.filter(p => p.goatId === animal.id)
            .sort((a, b) => (a.parturitionDate < b.parturitionDate ? 1 : -1));
        const cutoff = parts[0]?.parturitionDate || '2000-01-01';
        const svcs = serviceRecords.filter(s => s.femaleId === animal.id && s.serviceDate > cutoff)
            .sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1));
        const sameDay = svcs.some(s => s.serviceDate === serviceDate);
        const last = svcs[0];
        return {
            count: svcs.length,
            last,
            daysApart: last ? daysBetween(serviceDate, last.serviceDate) : null,
            sameDay,
        };
    }, [serviceRecords, parturitions, animal.id, serviceDate]);

    // Helper para nombre del semental
    const getSireName = (lotId: string) => {
        const lot = sireLots.find(l => l.id === lotId);
        if (!lot) return 'Desconocido';
        const father = fathers.find(f => f.id === lot.sireId);
        if (father) return formatAnimalDisplay(father);
        const internalSire = animals.find(a => a.id === lot.sireId);
        if (internalSire) return formatAnimalDisplay(internalSire);
        return lot.sireId;
    };

    const handleSubmit = async () => {
        if (!selectedSireLotId) {
            setError("Debes identificar el lote o semental del servicio.");
            return;
        }
        setIsLoading(true);
        try {
            // Si el padre pasó un onSave personalizado (ej: QuickAction), úsalo
            if (onSave) {
                await onSave(new Date(serviceDate), selectedSireLotId);
            } else {
                // Si no, usa la lógica por defecto
                await addServiceRecord({
                    femaleId: animal.id,
                    sireLotId: selectedSireLotId,
                    serviceDate: serviceDate
                });
            }
            onClose();
        } catch (err) {
            console.error(err);
            setError("Error al registrar el servicio.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Servicio Visto">
            <div className="space-y-5">
                
                {/* Header Visual */}
                <div className="flex items-start gap-4 p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl">
                    <div className="p-3 bg-pink-500/20 rounded-full text-pink-500">
                        <HeartHandshake size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-c-text">Servicio Confirmado</h3>
                        <p className="text-sm text-pink-200/80 leading-relaxed">
                            Registra una monta efectiva para <strong>{formatAnimalDisplay(animal)}</strong>. Esto actualizará su estado y las estadísticas del semental.
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                    
                    {/* Selector de Semental */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-c-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Dna size={14} className="text-c-accent-sky" /> Semental / Lote
                        </label>

                        {/* Selector siempre editable: permite declarar con un macho distinto al asignado. */}
                        <div className="relative">
                            <select
                                value={selectedSireLotId}
                                onChange={(e) => setSelectedSireLotId(e.target.value)}
                                className="w-full bg-c-surface-2 border border-c-border-strong rounded-xl p-3 text-c-text appearance-none focus:border-c-accent-sky outline-none"
                            >
                                <option value="">Seleccionar semental…</option>
                                {selectableLots.map(lot => (
                                    <option key={lot.id} value={lot.id}>
                                        {getSireName(lot.id)}{lot.id === animal.sireLotId ? ' (asignado)' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-c-text-faint">▼</div>
                        </div>
                        {animal.sireLotId && selectedSireLotId && selectedSireLotId !== animal.sireLotId && (
                            <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                <AlertTriangle size={11} /> Macho distinto al asignado en su temporada. Se registrará el servicio con el seleccionado.
                            </p>
                        )}
                        {selectableLots.length === 0 && (
                            <p className="text-[10px] text-red-400 mt-1">
                                * No hay temporadas de monta activas. Crea una primero.
                            </p>
                        )}
                    </div>

                    {/* Fecha */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-c-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} className="text-c-accent" /> Fecha del Servicio
                        </label>
                        <input
                            type="date"
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            className="w-full bg-c-surface-2 border border-c-border-strong rounded-xl p-3 text-c-text focus:border-c-accent outline-none"
                        />
                    </div>

                </div>

                {/* Advertencia de servicios previos en el ciclo actual */}
                {priorAnalysis.sameDay ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs font-semibold">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>Ya hay un servicio registrado para {formatAnimalDisplay(animal)} ese mismo día ({serviceDate}). Revisa antes de duplicar.</span>
                    </div>
                ) : priorAnalysis.count > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-400 text-xs font-semibold">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>
                            Este sería el <strong>servicio #{priorAnalysis.count + 1}</strong> de este ciclo. El anterior fue el {priorAnalysis.last!.serviceDate}
                            {priorAnalysis.daysApart !== null ? ` (${priorAnalysis.daysApart} día${priorAnalysis.daysApart === 1 ? '' : 's'} de diferencia)` : ''}.
                        </span>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-c-surface-2 hover:bg-c-surface-2 text-c-text-strong font-bold rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading || (!selectedSireLotId && activeLots.length === 0)}
                        className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/20 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Guardando...' : 'Registrar'}
                    </button>
                </div>

            </div>
        </Modal>
    );
};