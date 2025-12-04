import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from '../ui/Modal';
import { HeartHandshake, Calendar, Dna, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
    const { addServiceRecord, sireLots, fathers, animals, breedingSeasons } = useData();
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSireLotId, setSelectedSireLotId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // 2. Obtener lista de Lotes Activos (para el select si no tiene asignación)
    const activeLots = useMemo(() => {
        const activeSeasonIds = new Set(breedingSeasons.filter(s => s.status === 'Activo').map(s => s.id));
        return sireLots.filter(lot => activeSeasonIds.has(lot.seasonId));
    }, [breedingSeasons, sireLots]);

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
                        <h3 className="text-lg font-bold text-white">Servicio Confirmado</h3>
                        <p className="text-sm text-pink-200/80 leading-relaxed">
                            Registra una monta efectiva para <strong>{formatAnimalDisplay(animal)}</strong>. Esto actualizará su estado y las estadísticas del semental.
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                    
                    {/* Selector de Semental */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Dna size={14} className="text-brand-blue" /> Semental / Lote
                        </label>
                        
                        {animal.sireLotId ? (
                            // CASO A: Ya tiene lote asignado (Solo lectura visual)
                            <div className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-brand-blue font-bold text-xs">
                                        P
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{getSireName(animal.sireLotId)}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase">Lote Asignado</p>
                                    </div>
                                </div>
                                <CheckCircle2 size={18} className="text-green-500" />
                            </div>
                        ) : (
                            // CASO B: No tiene lote, debe seleccionar
                            <div className="relative">
                                <select
                                    value={selectedSireLotId}
                                    onChange={(e) => setSelectedSireLotId(e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl p-3 text-white appearance-none focus:border-brand-blue outline-none"
                                >
                                    <option value="">Seleccionar Semental Activo...</option>
                                    {activeLots.map(lot => (
                                        <option key={lot.id} value={lot.id}>
                                            {getSireName(lot.id)}
                                        </option>
                                    ))}
                                </select>
                                {/* Flecha custom */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    ▼
                                </div>
                            </div>
                        )}
                         {!animal.sireLotId && activeLots.length === 0 && (
                            <p className="text-[10px] text-red-400 mt-1">
                                * No hay temporadas de monta activas. Crea una primero.
                            </p>
                        )}
                    </div>

                    {/* Fecha */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} className="text-brand-orange" /> Fecha del Servicio
                        </label>
                        <input 
                            type="date"
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl p-3 text-white focus:border-brand-orange outline-none"
                        />
                    </div>

                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors">
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