import React, { useState, useEffect } from 'react';
import { BreedingSeason } from '../../db/local';
import { AlertTriangle, Sun, Calendar, Clock, Info, Type } from 'lucide-react';

interface BreedingSeasonFormProps {
  onSave: (seasonData: Omit<BreedingSeason, 'id' | 'status'>) => Promise<void>;
  onCancel: () => void;
  existingSeason?: BreedingSeason;
}

// Componente de Input Reutilizable para consistencia visual
const InputField = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-c-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Icon size={14} className="text-c-accent-gold" /> {label}
        </label>
        <input
            {...props}
            className="w-full bg-c-surface-2 border border-c-border-strong/50 focus:border-c-accent-gold/50 rounded-xl p-3 text-c-text placeholder-c-text-faint outline-none transition-all text-sm font-medium focus:bg-c-surface-3"
        />
    </div>
);

export const BreedingSeasonForm: React.FC<BreedingSeasonFormProps> = ({ onSave, onCancel, existingSeason }) => {
  // Datos Básicos
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('45');

  // Tratamiento de Luz
  const [requiresLightTreatment, setRequiresLightTreatment] = useState(false);
  const [lightStartDate, setLightStartDate] = useState('');
  const [lightDuration, setLightDuration] = useState('60');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingSeason) {
      setName(existingSeason.name);
      setStartDate(existingSeason.startDate);
      
      // Calcular duración basada en fechas guardadas
      const start = new Date(existingSeason.startDate);
      const end = new Date(existingSeason.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDuration(String(diffDays));

      setRequiresLightTreatment(existingSeason.requiresLightTreatment);
      setLightStartDate((existingSeason as any).lightTreatmentStartDate || '');
      setLightDuration(String((existingSeason as any).lightTreatmentDuration || '60'));
    } else {
        // Sugerir fecha de inicio (hoy + 7 días)
        const today = new Date();
        const defaultStart = new Date(today);
        defaultStart.setDate(today.getDate() + 7);
        setStartDate(defaultStart.toISOString().split('T')[0]);
    }
  }, [existingSeason]);

  // Sugerencia inteligente de fecha de luz
  useEffect(() => {
    if (requiresLightTreatment && startDate && !lightStartDate) {
        const montaStart = new Date(startDate);
        const suggestedLightStart = new Date(montaStart);
        // Retroceder ciclo completo (60 días luz + 45 días oscuridad aprox = 105 días)
        suggestedLightStart.setDate(montaStart.getDate() - 105);
        setLightStartDate(suggestedLightStart.toISOString().split('T')[0]);
    }
  }, [requiresLightTreatment, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !startDate || !duration) {
      setError('Los campos básicos son obligatorios.');
      return;
    }

    if (requiresLightTreatment) {
        if (!lightStartDate || !lightDuration) {
            setError('Debes definir la fecha y duración del tratamiento de luz.');
            return;
        }
        const lightStart = new Date(lightStartDate);
        const montaStart = new Date(startDate);
        if (lightStart >= montaStart) {
            setError('El tratamiento de luz debe iniciar ANTES de la temporada de monta.');
            return;
        }
    }

    setIsLoading(true);
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + parseInt(duration, 10));

    const seasonData: any = {
      name,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      requiresLightTreatment,
    };

    if (requiresLightTreatment) {
        seasonData.lightTreatmentStartDate = lightStartDate;
        seasonData.lightTreatmentDuration = parseInt(lightDuration, 10);
        
        // Si es nuevo o si se activa por primera vez, inicializamos estado
        if (!existingSeason || !existingSeason.requiresLightTreatment) {
             seasonData.lightTreatmentStatus = 'Pendiente'; 
             seasonData.lightTreatmentConfirmed = false;
        }
    }

    try {
      await onSave(seasonData);
    } catch (err) {
      setError('Error al guardar.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        
        {/* Sección General */}
        <div className="bg-c-surface-2/30 p-4 rounded-2xl border border-c-border-strong/50 space-y-4">
            <InputField 
                label="Nombre Identificador" 
                icon={Type}
                type="text" 
                value={name} 
                onChange={(e:any) => setName(e.target.value)} 
                placeholder="Ej: Otoño 2026 - Lote A" 
                required 
            />
            <div className="grid grid-cols-2 gap-4">
                <InputField 
                    label="Inicio de Monta" 
                    icon={Calendar}
                    type="date" 
                    value={startDate} 
                    onChange={(e:any) => setStartDate(e.target.value)} 
                    required 
                />
                <InputField 
                    label="Duración (Días)" 
                    icon={Clock}
                    type="number" 
                    value={duration} 
                    onChange={(e:any) => setDuration(e.target.value)} 
                    required 
                />
            </div>
        </div>

        {/* Sección Tratamiento de Luz Estilizada */}
        <div 
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                requiresLightTreatment 
                    ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                    : 'bg-c-surface-2/30 border-c-border-strong/50 hover:border-c-border-strong'
            }`}
        >
            <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-colors ${requiresLightTreatment ? 'bg-yellow-500 text-black' : 'bg-c-surface-3 text-c-text-muted'}`}>
                        <Sun size={20} fill={requiresLightTreatment ? "currentColor" : "none"} />
                    </div>
                    <div>
                        <p className={`text-sm font-bold transition-colors ${requiresLightTreatment ? 'text-yellow-400' : 'text-c-text'}`}>Tratamiento de Luz Previo</p>
                        <p className="text-[10px] text-c-text-muted">Fotoperiodo artificial para sincronizar celos.</p>
                    </div>
                </div>
                 <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={requiresLightTreatment}
                        onChange={(e) => setRequiresLightTreatment(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-c-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </div>
            </label>

            {requiresLightTreatment && (
                <div className="px-4 pb-5 space-y-4 animate-slide-down relative z-10">
                    <div className="flex gap-3 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
                        <Info className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-yellow-200/90 leading-relaxed">
                            El sistema creará alertas automáticas para el inicio y fin del protocolo de iluminación.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Calendar size={12}/> Inicio Luz
                            </label>
                            <input 
                                type="date" 
                                value={lightStartDate} 
                                onChange={e => setLightStartDate(e.target.value)} 
                                className="w-full bg-c-surface-2 border border-yellow-500/30 p-3 rounded-xl text-c-text text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Clock size={12}/> Días de Luz
                            </label>
                            <input 
                                type="number" 
                                value={lightDuration} 
                                onChange={e => setLightDuration(e.target.value)} 
                                className="w-full bg-c-surface-2 border border-yellow-500/30 p-3 rounded-xl text-c-text text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
      
      {error && (
        <div className="flex items-center space-x-2 p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20 animate-shake">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-5 py-4 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold rounded-xl transition-colors">
          Cancelar
        </button>
        <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-5 py-4 bg-c-accent hover:bg-c-accent/90 text-white font-bold rounded-xl disabled:opacity-50 shadow-lg shadow-c-accent/20 transition-all active:scale-[0.98]"
        >
          {isLoading ? 'Guardando...' : existingSeason ? 'Actualizar' : 'Crear Temporada'}
        </button>
      </div>
    </form>
  );
};