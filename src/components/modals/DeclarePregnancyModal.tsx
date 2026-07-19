import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import { X, Save, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { GiEmbryo } from 'react-icons/gi';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { dayPickerCss } from '../input/dayPickerTheme';

interface DeclarePregnancyModalProps {
    isOpen: boolean;
    onClose: () => void;
    animal: Animal;
}

/**
 * Acción rápida para declarar preñez SIN necesidad de una temporada de monta.
 * Registra la FECHA de confirmación (palpación/eco), que es la que se usa para
 * calcular los "días abiertos" (Vacía -> Preñada). Sirve también para cargar
 * diagnósticos históricos con su fecha real.
 */
export const DeclarePregnancyModal = ({ isOpen, onClose, animal }: DeclarePregnancyModalProps) => {
    const { updateAnimal } = useData();
    const [date, setDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            // La fecha del diagnóstico se guarda como fecha del evento (no "hoy").
            await updateAnimal(animal.id, { reproductiveStatus: 'Preñada' }, dateStr);
            onClose();
        } catch (error) {
            console.error('Error al declarar preñez:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            <div className="bg-c-surface border-t sm:border border-c-border w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-6 shadow-2xl transform transition-all pb-10 sm:pb-6 relative overflow-hidden">
                <style>{dayPickerCss}</style>

                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-c-text flex items-center gap-2">
                            <GiEmbryo className="text-brand-green" size={22} />
                            Declarar Preñada
                        </h2>
                        <p className="text-sm text-c-text-muted mt-1">
                            Confirmar preñez de <span className="text-c-text font-mono font-bold">{animal.id.toUpperCase()}</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-c-surface-2 rounded-full text-c-text-muted hover:text-c-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-brand-green/10 border border-brand-green/20 p-3 rounded-xl flex gap-3 items-start">
                    <AlertCircle className="text-brand-green shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-c-text-muted leading-relaxed">
                        El animal pasará a <strong className="text-brand-green">Preñada</strong>. La fecha que elijas es la
                        del diagnóstico y se usa para calcular los <strong>días abiertos</strong>.
                    </p>
                </div>

                {/* Fecha de diagnóstico */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-c-text-faint uppercase tracking-widest ml-1">Fecha de diagnóstico</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-c-text-faint" size={18} />
                        <button
                            type="button"
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="w-full bg-c-surface-2 border border-c-border rounded-xl py-4 pl-12 pr-4 text-left text-c-text focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-all text-base"
                        >
                            {date.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </button>
                    </div>

                    {showCalendar && (
                        <div className="mt-2 p-2 bg-c-surface-2 border border-c-border rounded-xl animate-fade-in flex justify-center">
                            <DayPicker
                                mode="single"
                                selected={date}
                                onSelect={(d) => { if (d) setDate(d); setShowCalendar(false); }}
                                defaultMonth={date}
                                locale={es}
                                disabled={{ after: new Date() }}
                                captionLayout="dropdown-buttons"
                                fromYear={new Date().getFullYear() - 8}
                                toYear={new Date().getFullYear()}
                            />
                        </div>
                    )}
                </div>

                {!showCalendar && (
                    <div className="pt-1">
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="w-full bg-brand-green hover:brightness-110 text-white font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(34,139,78,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Confirmar Preñez</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
