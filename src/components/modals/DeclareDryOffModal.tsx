import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import { X, Calendar, Droplets, Save, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';

interface DeclareDryOffModalProps {
    isOpen: boolean;
    onClose: () => void;
    animal: Animal;
}

const calendarCss = `
  .rdp { --rdp-accent-color: #06B6D4; --rdp-background-color: transparent; --rdp-accent-color-dark: #06B6D4; --rdp-background-color-dark: transparent; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 0 auto; }
  .rdp-caption_label { color: #FFF; font-weight: bold; } .rdp-nav_button { color: #06B6D4; } .rdp-head_cell { color: #8e8e93; } .rdp-day { color: #e4e4e7; } .rdp-day_today { font-weight: bold; color: #06B6D4; } .rdp-day_selected { background-color: var(--rdp-accent-color); color: #fff; font-weight: bold; }
`;

export const DeclareDryOffModal = ({ isOpen, onClose, animal }: DeclareDryOffModalProps) => {
    const { updateAnimal, addEvent } = useData();
    const [date, setDate] = useState<Date>(new Date());
    const [reason, setReason] = useState('Fin de Lactancia');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await updateAnimal(animal.id, {
                reproductiveStatus: 'Seca' as any 
            });
            if (addEvent) {
                await addEvent({
                    animalId: animal.id,
                    date: date.toISOString().split('T')[0],
                    type: 'Secado',
                    details: `Secado registrado (Acción Rápida). Motivo: ${reason}.`
                });
            }
            onClose();
        } catch (error) {
            console.error("Error al secar:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            
            <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-6 shadow-2xl transform transition-all pb-10 sm:pb-6 relative overflow-hidden">
                <style>{calendarCss}</style>
                
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Droplets className="text-cyan-400" />
                            Declarar Secado
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Finalizar lactancia de <span className="text-white font-mono font-bold">{animal.id.toUpperCase()}</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl flex gap-3 items-start">
                    <AlertCircle className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-cyan-200/80 leading-relaxed">
                        El animal dejará de estar activo en las listas de ordeño y su estatus pasará a <strong>Seca</strong>.
                    </p>
                </div>

                <div className="space-y-5">
                    {/* Fecha */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fecha de Secado</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <button 
                                type="button"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-left text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-base"
                            >
                                {date.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </button>
                        </div>
                        
                        {showCalendar && (
                            <div className="mt-2 p-2 bg-black border border-zinc-800 rounded-xl animate-fade-in flex justify-center">
                                <DayPicker
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => { if(d) setDate(d); setShowCalendar(false); }}
                                    defaultMonth={date}
                                    locale={es}
                                    disabled={{ after: new Date() }}
                                    captionLayout="dropdown-buttons"
                                    fromYear={new Date().getFullYear() - 1}
                                    toYear={new Date().getFullYear()}
                                />
                            </div>
                        )}
                    </div>

                    {/* Motivo */}
                    {!showCalendar && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Motivo</label>
                            <select 
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none text-base"
                            >
                                <option value="Fin de Lactancia">Fin de Lactancia (Natural)</option>
                                <option value="Baja Producción">Baja Producción</option>
                                <option value="Enfermedad">Enfermedad / Mastitis</option>
                                <option value="Estratégico">Decisión Estratégica</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Botón Acción */}
                {!showCalendar && (
                    <div className="pt-2">
                        <button 
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-colors shadow-[0_4px_20px_rgba(8,145,178,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20}/> Confirmar Secado</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};