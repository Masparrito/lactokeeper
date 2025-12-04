import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Calendar, Weight, FileX, AlertCircle, Loader2 } from 'lucide-react';
import { Animal } from '../../db/local';
import { useData } from '../../context/DataContext';
import { Modal } from '../ui/Modal'; 
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

interface DeclareServiceWeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    animal: Animal;
    currentWeight: number;
    suggestedDate?: string;
}

const calendarCss = `
  .rdp { --rdp-accent-color: #DB2777; --rdp-background-color: transparent; --rdp-accent-color-dark: #DB2777; --rdp-background-color-dark: transparent; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 0 auto; }
  .rdp-caption_label { color: #FFF; font-weight: bold; } .rdp-nav_button { color: #DB2777; } .rdp-head_cell { color: #8e8e93; } .rdp-day { color: #e4e4e7; } .rdp-day_today { font-weight: bold; color: #DB2777; } .rdp-day_selected { background-color: var(--rdp-accent-color); color: #fff; font-weight: bold; }
`;

export const DeclareServiceWeightModal = ({ isOpen, onClose, animal, currentWeight, suggestedDate }: DeclareServiceWeightModalProps) => {
    const { updateAnimal, addEvent } = useData();
    
    const [date, setDate] = useState(suggestedDate || new Date().toISOString().split('T')[0]);
    const [weight, setWeight] = useState(currentWeight > 0 ? currentWeight.toString() : '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setWeight(currentWeight > 0 ? currentWeight.toString() : '');
            setDate(suggestedDate || new Date().toISOString().split('T')[0]);
            setError(null);
        }
    }, [isOpen, currentWeight, suggestedDate]);

    const handleSave = async (finalWeight: number) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const isNoData = finalWeight === -1;
            
            // Lógica para avanzar de etapa (si aplica)
            // Si es Cabritona, quizás pasa a Cabritona lista para servicio (no cambia label pero cambia status interno)
            // Si ya era Cabra no debería estar aquí, pero por seguridad se mantiene.
            
            await updateAnimal(animal.id, {
                ...animal,
                reproductiveStatus: 'Vacía', // Se habilita como Vacía lista para montar
                // No forzamos cambio de 'lifecycleStage' aquí a menos que sea estricto, 
                // generalmente se mantiene como Cabritona hasta el parto.
            });

            if (addEvent) {
                await addEvent({
                    animalId: animal.id,
                    date: date,
                    type: 'Peso de Monta', // Este evento es el que "cierra" la alerta en useManagementAlerts
                    details: isNoData 
                        ? 'Habilitada para servicio (Peso declarado sin dato histórico).' 
                        : `Alcanzó ${finalWeight} Kg. Habilitada para servicio.`,
                    metaWeight: isNoData ? -1 : finalWeight 
                });
            }
            onClose();
        } catch (err: any) {
            console.error("Error al declarar servicio:", err);
            setError("Error al guardar el registro.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(weight);
        if (!weight || isNaN(val) || val <= 0) {
            setError("Por favor ingrese un peso válido");
            return;
        }
        handleSave(val);
    };

    const handleNoData = () => {
        if (confirm("¿Confirmar habilitación para servicio sin registrar peso?")) {
            handleSave(-1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            
            <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl transform transition-all pb-10 sm:pb-6 relative">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="text-pink-500" />
                            Habilitar para Servicio
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Confirma que <span className="text-white font-mono font-bold">{animal.id}</span> está lista para reproducción.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Info */}
                <div className="bg-pink-500/10 border border-pink-500/20 p-3 rounded-xl flex gap-3 items-start">
                    <AlertCircle className="text-pink-400 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-pink-200 leading-relaxed">
                        Esto registrará el evento "Peso de Monta" y habilitará al animal para recibir servicios, eliminando las alertas de crecimiento.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Input Fecha (Botón) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fecha del Evento</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <button 
                                type="button"
                                onClick={() => setIsDatePickerOpen(true)}
                                className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-left text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all text-base"
                            >
                                {new Date(date + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </button>
                        </div>
                        {suggestedDate && suggestedDate === date && (
                            <p className="text-[10px] text-pink-400/80 ml-1">
                                * Fecha sugerida según historial de peso.
                            </p>
                        )}
                    </div>

                    {/* Input Peso */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Peso Alcanzado (Kg)</label>
                        <div className="relative">
                            <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="number" 
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                step="0.1"
                                placeholder="Ej: 30.5"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 p-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="pt-4 flex flex-col gap-3">
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-pink-600 hover:bg-pink-500 active:bg-pink-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(219,39,119,0.3)] text-base"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : 'Confirmar y Habilitar'}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-zinc-800"></div>
                            <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">O SI NO TIENES EL DATO</span>
                            <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <button 
                            type="button"
                            onClick={handleNoData}
                            disabled={isSubmitting}
                            className="w-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 text-sm"
                        >
                            <FileX size={16} />
                            Habilitar sin peso (Cerrar Alerta)
                        </button>
                    </div>
                </form>
            </div>

            {/* --- SUB-MODAL CALENDARIO --- */}
            <Modal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} title="Seleccionar Fecha">
                <style>{calendarCss}</style>
                <div className="flex justify-center p-4 bg-black rounded-xl">
                    <DayPicker
                        mode="single"
                        selected={new Date(date + 'T00:00:00')}
                        onSelect={(d) => { if (d) { setDate(d.toISOString().split('T')[0]); } setIsDatePickerOpen(false); }}
                        locale={es}
                        disabled={{ after: new Date() }}
                        captionLayout="dropdown-buttons"
                        fromYear={new Date().getFullYear() - 5}
                        toYear={new Date().getFullYear()}
                    />
                </div>
            </Modal>
        </div>
    );
};