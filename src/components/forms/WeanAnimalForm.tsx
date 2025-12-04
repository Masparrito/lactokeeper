import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Calendar, Weight, Award, FileX, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

interface WeanAnimalFormProps {
  isOpen: boolean;
  animalId: string;
  birthDate: string;
  onSave: (data: { weaningDate: string, weaningWeight: number }) => Promise<void>;
  onCancel: () => void;
  defaultDate?: string;
  defaultWeight?: number;
}

const calendarCss = `
  .rdp { --rdp-accent-color: #EAB308; --rdp-background-color: transparent; --rdp-accent-color-dark: #EAB308; --rdp-background-color-dark: transparent; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 0 auto; }
  .rdp-caption_label { color: #FFF; font-weight: bold; } .rdp-nav_button { color: #EAB308; } .rdp-head_cell { color: #8e8e93; } .rdp-day { color: #e4e4e7; } .rdp-day_today { font-weight: bold; color: #EAB308; } .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
`;

export const WeanAnimalForm: React.FC<WeanAnimalFormProps> = ({ 
  isOpen,
  animalId, 
  birthDate, 
  onSave, 
  onCancel,
  defaultDate,
  defaultWeight
}) => {
  
  const [weaningDate, setWeaningDate] = useState<Date>(defaultDate ? new Date(defaultDate) : new Date());
  const [weaningWeight, setWeaningWeight] = useState(defaultWeight ? String(defaultWeight) : '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
      if (isOpen) {
          if(defaultDate) setWeaningDate(new Date(defaultDate));
          else setWeaningDate(new Date());
          
          if(defaultWeight) setWeaningWeight(String(defaultWeight));
          else setWeaningWeight('');
      }
  }, [isOpen, defaultDate, defaultWeight]);

  const handleFinalSave = async (weightValue: number) => {
    setError(null);
    setIsLoading(true);
    try {
      const wDateStr = weaningDate.toISOString().split('T')[0];
      
      // Validación básica de fecha
      if (birthDate && birthDate !== 'N/A') {
          const bDate = new Date(birthDate);
          if (weaningDate < bDate) {
            throw new Error('La fecha de destete no puede ser anterior al nacimiento.');
          }
      }

      await onSave({ weaningDate: wDateStr, weaningWeight: weightValue });
      // El cierre del modal lo maneja el padre tras el await
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el destete.');
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weaningWeight);
    if (!weaningWeight || isNaN(weight) || weight <= 0) {
      setError('Por favor, introduce un peso válido.');
      return;
    }
    handleFinalSave(weight);
  };

  const handleNoData = () => {
    // Enviamos -1 o 0 para indicar que no hay dato de peso, pero se cierra el ciclo
    if (confirm("¿Estás seguro? Esto marcará al animal como destetado sin registrar un peso en sus estadísticas.")) {
        handleFinalSave(0); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
        <style>{calendarCss}</style>
        
        <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl transform transition-all pb-10 sm:pb-6 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="text-yellow-500" />
                        Registrar Destete
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Cierra la lactancia para <span className="text-white font-mono font-bold">{animalId.toUpperCase()}</span>.
                    </p>
                </div>
                <button onClick={onCancel} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-yellow-200/70 leading-relaxed">
                    Esto cambiará la categoría del animal (ej. de Cabrito a Macho de Levante) y detendrá las alertas de destete.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Input Fecha */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fecha de Destete</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <button 
                            type="button"
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-left text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all text-base"
                        >
                            {weaningDate.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </button>
                    </div>

                    {showCalendar && (
                        <div className="mt-2 p-2 bg-black border border-zinc-800 rounded-xl animate-fade-in flex justify-center">
                            <DayPicker
                                mode="single"
                                selected={weaningDate}
                                onSelect={(d) => { if(d) setWeaningDate(d); setShowCalendar(false); }}
                                defaultMonth={weaningDate}
                                locale={es}
                                disabled={{ after: new Date() }}
                                captionLayout="dropdown-buttons"
                                fromYear={new Date().getFullYear() - 5}
                                toYear={new Date().getFullYear()}
                            />
                        </div>
                    )}
                </div>

                {/* Input Peso */}
                {!showCalendar && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Peso al Destete (Kg)</label>
                        <div className="relative">
                            <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="number" 
                                step="0.1"
                                value={weaningWeight}
                                onChange={(e) => setWeaningWeight(e.target.value)}
                                placeholder="Ej: 15.5"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}
        
                {error && (
                    <div className="flex items-center gap-3 p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400 font-medium animate-pulse">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Botones de Acción */}
                {!showCalendar && (
                    <div className="pt-4 flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(234,179,8,0.2)] text-base"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Destete'}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-zinc-800"></div>
                            <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">O SI NO TIENES EL DATO</span>
                            <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleNoData}
                            disabled={isLoading}
                            className="w-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 text-sm"
                        >
                            <FileX size={16} />
                            Declarar sin peso (Cerrar Alerta)
                        </button>
                    </div>
                )}
            </form>
        </div>
    </div>
  );
};