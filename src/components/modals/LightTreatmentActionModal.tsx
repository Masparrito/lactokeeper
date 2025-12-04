import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from '../ui/Modal';
import { Sun, CheckCircle, Calendar, AlertTriangle, Moon } from 'lucide-react';

interface LightTreatmentActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    seasonId: string;
    actionType: 'START' | 'END';
}

export const LightTreatmentActionModal: React.FC<LightTreatmentActionModalProps> = ({ 
    isOpen, 
    onClose, 
    seasonId, 
    actionType 
}) => {
    const { breedingSeasons, updateBreedingSeason, addEvent } = useData();
    const [isLoading, setIsLoading] = useState(false);
    
    // Obtenemos la temporada
    const season = breedingSeasons.find(s => s.id === seasonId);

    // Estado para la fecha seleccionada. 
    // Por defecto será la fecha programada (si existe) o la fecha de hoy.
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        if (isOpen && season) {
            if (actionType === 'START') {
                // Si vamos a iniciar, sugerimos la fecha que estaba programada (ej: 1 nov) 
                // Si no hay fecha programada, usamos hoy.
                setSelectedDate(season.lightTreatmentStartDate || new Date().toISOString().split('T')[0]);
            } else {
                // Si vamos a finalizar, sugerimos hoy por defecto
                setSelectedDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, season, actionType]);

    if (!season) return null;

    const isStart = actionType === 'START';
    const todayStr = new Date().toISOString().split('T')[0];

    // Lógica para detectar si es una confirmación tardía (Retroactiva)
    // Es "tarde" si la fecha programada es anterior a hoy y estamos en modo START
    const isLateStart = isStart && selectedDate < todayStr;

    const handleConfirm = async () => {
        if (!selectedDate) return;
        setIsLoading(true);
        try {
            if (actionType === 'START') {
                // Actualizamos la temporada con la fecha REAL que eligió el usuario (selectedDate)
                await updateBreedingSeason(season.id, {
                    lightTreatmentConfirmed: true,
                    lightTreatmentStatus: 'En Curso',
                    lightTreatmentStartDate: selectedDate // Aquí guardamos 1 nov si el usuario no lo cambió
                });

                if (addEvent) {
                    addEvent({
                        animalId: season.id,
                        date: selectedDate, // El evento queda registrado en la fecha histórica
                        type: 'Manejo',
                        details: `Inicio de Tratamiento de Luz (Confirmado)`,
                        lotName: 'Temporada ' + season.name
                    });
                }

            } else {
                // Lógica de finalización
                await updateBreedingSeason(season.id, {
                    lightTreatmentStatus: 'Finalizado',
                    // Podrías guardar la fecha de fin real si tu modelo de datos lo soporta
                    // lightTreatmentEndDate: selectedDate 
                });

                if (addEvent) {
                    addEvent({
                        animalId: season.id,
                        date: selectedDate,
                        type: 'Manejo',
                        details: `Fin de Tratamiento de Luz`,
                        lotName: 'Temporada ' + season.name
                    });
                }
            }
            onClose();
        } catch (error) {
            console.error("Error al actualizar tratamiento de luz:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Renderizado del Header condicional
    const renderHeader = () => {
        if (isLateStart) {
            return (
                <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-start gap-4">
                    <div className="p-3 rounded-full bg-orange-500/20 text-orange-500">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-orange-400">
                            Confirmar Inicio Pasado
                        </h3>
                        <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
                            El tratamiento estaba programado para el <strong>{new Date(selectedDate).toLocaleDateString('es-VE', {day: 'numeric', month: 'long'})}</strong>. 
                            <br/>Confirma abajo si iniciaste en esa fecha.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className={`p-4 rounded-xl border flex items-start gap-4 ${isStart ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                <div className={`p-3 rounded-full ${isStart ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {isStart ? <Sun size={32} /> : <Moon size={32} />}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">
                        {isStart ? 'Encender Luces' : 'Apagar Sistema'}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                        {isStart 
                            ? `Es hora de iniciar el tratamiento para "${season.name}". El protocolo indica 4 horas extra al atardecer.`
                            : `Se han cumplido los días de tratamiento para "${season.name}". Es momento de retirar la luz artificial.`
                        }
                    </p>
                </div>
            </div>
        );
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isStart ? "Iniciar Fotoperiodo" : "Finalizar Fotoperiodo"}
        >
            <div className="space-y-6">
                
                {/* 1. Header Dinámico (Avisa si es tarde o normal) */}
                {renderHeader()}

                {/* 2. Selector de Fecha Unificado (Reemplaza las cajas estáticas) */}
                <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        {isStart ? 'Fecha de Inicio Real' : 'Fecha de Finalización'}
                    </label>
                    
                    <div className="relative flex items-center">
                        <div className="absolute left-0 pl-3 pointer-events-none text-zinc-400">
                            <Calendar size={20} />
                        </div>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-zinc-800 text-white font-medium border border-zinc-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all cursor-pointer"
                            style={{ colorScheme: 'dark' }} // Truco para que el calendario nativo sea oscuro
                        />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        {isLateStart 
                            ? 'Puedes corregir la fecha si iniciaste otro día.' 
                            : 'Verifica la fecha antes de confirmar.'}
                    </p>
                </div>

                {/* 3. Botones de Acción */}
                <div className="flex flex-col gap-3 pt-2">
                    <button 
                        onClick={handleConfirm}
                        disabled={isLoading || !selectedDate}
                        className={`w-full py-4 rounded-xl font-bold text-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            isStart 
                                ? 'bg-brand-orange hover:bg-orange-500 shadow-orange-900/20' 
                                : 'bg-brand-blue hover:bg-blue-500 text-white shadow-blue-900/20'
                        }`}
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                {/* El texto cambia dinámicamente según la fecha elegida */}
                                {isStart 
                                    ? `Confirmar Inicio (${new Date(selectedDate || new Date()).toLocaleDateString('es-VE', {day: '2-digit', month: '2-digit'})})` 
                                    : 'Confirmar Finalización'
                                }
                            </>
                        )}
                    </button>

                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-transparent hover:bg-zinc-800 text-zinc-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        Cancelar / Reprogramar después
                    </button>
                </div>

            </div>
        </Modal>
    );
};