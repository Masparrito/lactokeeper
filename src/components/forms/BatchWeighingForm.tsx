// src/components/forms/BatchWeighingForm.tsx

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Animal, BodyWeighing, Weighing } from '../../db/local'; 
import { AlertTriangle, CheckCircle, Save, Loader2, Info, Trash2, Undo2, Lightbulb } from 'lucide-react'; 
import { useData } from '../../context/DataContext';
import { getAnimalZootecnicCategory } from '../../utils/calculations';
import { formatAnimalDisplay } from '../../utils/formatting';
import { OcrResult } from '../../pages/BatchImportPage'; 

// --- Tipos de Validación ---
type RowStatus = 'valid' | 'warning' | 'error' | 'unrecognized';
type FilterStatus = 'all' | 'valid' | 'warning' | 'error' | 'unrecognized';

interface ValidatedRow {
  key: string; 
  animalId: string;
  weight: string; 
  calculatedWeight: number | null; 
  date: string; 
  status: RowStatus;
  message: string[];
  animalRef: Animal | null; 
  suggestedId?: string; // ID sugerido por la lógica inteligente
}
// --- Fin Tipos ---

// --- Helper de Fechas ---
const localCalculateDaysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
    const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
    const diffTime = utc1 - utc2;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

interface BatchWeighingFormProps {
  weightType: 'leche' | 'corporal';
  onSaveSuccess: () => void;
  onCancel: () => void;
  animalsToWeigh?: Animal[];
  importedData?: OcrResult[];
  defaultDate?: string; 
}

export const BatchWeighingForm: React.FC<BatchWeighingFormProps> = ({
  weightType,
  animalsToWeigh = [],
  importedData,
  defaultDate: externalDefaultDate,
  onSaveSuccess,
  onCancel,
}) => {
  const {
    animals, 
    weighings,
    bodyWeighings,
    addWeighing,
    addBodyWeighing,
    parturitions,
    appConfig
  } = useData();

  // Estados
  const [date, setDate] = useState(externalDefaultDate || new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  
  // Aquí definimos ocrTotal correctamente para evitar el error
  const [ocrTotal, setOcrTotal] = useState<number | null>(null);
  
  const didInit = useRef(false);
  const [lastDeletedRow, setLastDeletedRow] = useState<ValidatedRow | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. MAPA DE SESIÓN ANTERIOR (Para Deltas y Contexto)
  const previousSessionMap = useMemo(() => {
      const allSessionData = (weightType === 'leche' ? weighings : bodyWeighings) as (Weighing[] | BodyWeighing[]);
      if (!allSessionData || allSessionData.length === 0) return new Map<string, number>();

      const allDates = [...new Set(allSessionData.map(w => w.date))];
      const sortedDates = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const referenceDate = externalDefaultDate || date;
      const selectedTime = new Date(referenceDate + 'T00:00:00Z').getTime();
      const previousDate = sortedDates.find(d => new Date(d + 'T00:00:00Z').getTime() < selectedTime);
      
      if (!previousDate) return new Map<string, number>(); 

      const weightMap = new Map<string, number>();
      allSessionData
          .filter(w => w.date === previousDate)
          .forEach(w => {
              const id = (w as any).goatId || (w as any).animalId;
              weightMap.set(id, w.kg);
          });
      return weightMap;
  }, [date, externalDefaultDate, bodyWeighings, weighings, weightType]);

  // 2. CONJUNTO DE IDs RECIENTES (Para Ranking de Probabilidad)
  const previousSessionSet = useMemo(() => {
      const set = new Set<string>();
      previousSessionMap.forEach((_, key) => set.add(key));
      return set;
  }, [previousSessionMap]);

  // 3. ESTADÍSTICAS HISTÓRICAS (Para detectar Primer Pesaje y Desviaciones)
  const historicalStats = useMemo(() => {
    const statsMap = new Map<string, { avg: number; count: number }>();
    const sourceData = (weightType === 'leche' ? weighings : bodyWeighings) as (Weighing[] | BodyWeighing[]);
    
    // Obtenemos lista única de animales en la data histórica
    const animalIds = new Set(sourceData.map(w => (weightType === 'leche' ? (w as Weighing).goatId : (w as BodyWeighing).animalId)));
    
    for (const animalId of animalIds) {
      // Tomamos los últimos 5 pesajes
      const animalWeighings = sourceData
        .filter(w => (weightType === 'leche' ? (w as Weighing).goatId : (w as BodyWeighing).animalId) === animalId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); 
      
      if (animalWeighings.length > 0) {
        const totalKg = animalWeighings.reduce((sum, w) => sum + w.kg, 0);
        statsMap.set(animalId, {
          avg: totalKg / animalWeighings.length,
          count: animalWeighings.length,
        });
      }
    }
    return statsMap;
  }, [weighings, bodyWeighings, weightType]);


  // --- VALIDACIÓN DE ID INTELIGENTE (RANKING) ---
  const validateId = useCallback((scannedId: string): { status: RowStatus, message: string | null, animalRef: Animal | null, suggestedId?: string } => {
    if (!scannedId) return { status: 'error', message: 'ID vacío.', animalRef: null };
    
    const normalizedId = scannedId.toUpperCase().trim();
    
    // A. Búsqueda Exacta
    const exactMatch = animals.find(a => a.id === normalizedId);
    if (exactMatch) {
        if (exactMatch.isReference || exactMatch.status !== 'Activo') {
            return { status: 'warning', message: `Animal Inactivo/Ref.`, animalRef: exactMatch };
        }
        if (weightType === 'leche') {
            const category = getAnimalZootecnicCategory(exactMatch, parturitions, appConfig);
            if (category !== 'Cabra') {
                return { status: 'warning', message: `No es Cabra (${category}).`, animalRef: exactMatch };
            }
        }
        return { status: 'valid', message: formatAnimalDisplay(exactMatch), animalRef: exactMatch };
    }

    // B. Búsqueda Inteligente por Correlativo + Ranking
    const numbersOnly = normalizedId.replace(/[^0-9]/g, '');
    
    if (numbersOnly.length > 0) {
        const candidates = animals.filter(a => 
            a.status === 'Activo' && 
            a.id.endsWith(numbersOnly) &&
            a.id.length >= numbersOnly.length
        );

        if (candidates.length > 0) {
            // RANKING: 
            // 1. Estuvo en sesión anterior (Alta probabilidad)
            // 2. Similitud de longitud (0016 se parece más a Q016 que a A1016)
            
            const rankedCandidates = candidates.sort((a, b) => {
                const aRecent = previousSessionSet.has(a.id);
                const bRecent = previousSessionSet.has(b.id);
                
                if (aRecent && !bRecent) return -1; // a gana
                if (!aRecent && bRecent) return 1;  // b gana
                
                const diffA = Math.abs(a.id.length - normalizedId.length);
                const diffB = Math.abs(b.id.length - normalizedId.length);
                return diffA - diffB;
            });

            const bestMatch = rankedCandidates[0];
            const isRecent = previousSessionSet.has(bestMatch.id);

            let msg = `No existe ${normalizedId}. ¿Es ${bestMatch.id}?`;
            if (isRecent) msg = `¿Quisiste decir ${bestMatch.id}? (Reciente)`;

            return { 
                status: 'warning', 
                message: msg, 
                animalRef: null,
                suggestedId: bestMatch.id 
            };
        }
    }
    
    return { status: 'unrecognized', message: 'ID no encontrado.', animalRef: null };
  }, [animals, parturitions, appConfig, weightType, previousSessionSet]);


  // --- VALIDACIÓN DE PESO (CON ALERTA DE NUEVO INGRESO) ---
  const validateWeight = useCallback((weightKg: number, animalId: string, idStatus: RowStatus): { status: RowStatus, message: string | null } => {
    if (isNaN(weightKg)) return { status: 'valid', message: null }; 
    
    // Validaciones de Rango Físico
    if (weightType === 'leche' && (weightKg <= 0 || weightKg > 8)) { 
        return { status: 'error', message: 'Rango imposible (0 - 8 kg)' };
    }
    if (weightType === 'corporal' && (weightKg < 1 || weightKg > 150)) {
        return { status: 'error', message: 'Rango imposible (1 - 150 kg)' };
    }
    
    // Validación Histórica
    if (idStatus !== 'error' && idStatus !== 'unrecognized' && animalId) {
      const stats = historicalStats.get(animalId);
      
      // >>> LÓGICA DE PRIMER PESAJE <<<
      if (!stats) {
          // No hay historial previo -> Es Nuevo Ingreso
          return { status: 'warning', message: '⚠️ Primer pesaje registrado' };
      }

      // Si tiene historial, validamos consistencia
      if (stats.count >= 2) {
        const avg = stats.avg;
        const threshold = Math.max(avg * 0.6, 1.0); // Tolerancia del 60%
        const diff = Math.abs(weightKg - avg);
        if (diff > threshold) {
            return { status: 'warning', message: `Atípico. Prom: ${avg.toFixed(2)} kg` };
        }
      }
    }
    return { status: 'valid', message: null };
  }, [weightType, historicalStats]);
  
  // --- Validación de Fecha ---
  const validateDate = useCallback((dateStr: string, animalRef: Animal | null): { status: RowStatus, message: string | null } => {
    if (!animalRef || !animalRef.birthDate || animalRef.birthDate === 'N/A') return { status: 'valid', message: null };
    const daysSinceBirth = localCalculateDaysBetween(dateStr, animalRef.birthDate);
    if (daysSinceBirth < 0) return { status: 'error', message: `Anterior al nacimiento.` };
    return { status: 'valid', message: null };
  }, []);


  // --- ORQUESTADOR DE VALIDACIÓN ---
  const runFullValidation = useCallback((animalId: string, weightStr: string, dateStr: string): Omit<ValidatedRow, 'key'> => {
      
      // 1. Validar ID
      const idValidation = validateId(animalId);
      
      let calculatedWeight: number | null = null;
      let finalWeightStr = weightStr.trim();
      let deltaMessage: string | null = null;

      // 2. Calcular Peso (Deltas)
      if (finalWeightStr.startsWith('+') || finalWeightStr.startsWith('-')) {
          const delta = parseFloat(finalWeightStr);
          if (!isNaN(delta)) {
              const targetId = idValidation.animalRef?.id || idValidation.suggestedId;
              
              if (targetId) {
                  const previousWeight = previousSessionMap.get(targetId);
                  if (previousWeight !== undefined) {
                      calculatedWeight = previousWeight + delta;
                      deltaMessage = `(Base ${previousWeight.toFixed(1)} ${finalWeightStr})`;
                  } else {
                      deltaMessage = `Delta sin peso previo.`;
                  }
              }
          }
      } else if (finalWeightStr !== '') {
          calculatedWeight = parseFloat(finalWeightStr);
      }
      
      // 3. Validar Peso (Usando el ID sugerido si no hay animalRef)
      const targetIdForStats = idValidation.animalRef?.id || idValidation.suggestedId || animalId;
      const weightValidation = validateWeight(calculatedWeight ?? NaN, targetIdForStats, idValidation.status);
      
      // 4. Validar Fecha
      const dateValidation = validateDate(dateStr, idValidation.animalRef);

      // 5. Compilar Estado Final
      const messages: string[] = [];
      if (idValidation.message) messages.push(idValidation.message);
      if (deltaMessage) messages.push(deltaMessage);
      if (weightValidation.message) messages.push(weightValidation.message);
      if (dateValidation.message) messages.push(dateValidation.message);

      let finalStatus: RowStatus = idValidation.status;
      
      if (finalStatus !== 'unrecognized') {
         if (weightValidation.status === 'error' || dateValidation.status === 'error' || (deltaMessage && !calculatedWeight)) {
             finalStatus = 'error';
         } 
         else if (weightValidation.status === 'warning' || dateValidation.status === 'warning') {
             if (finalStatus !== 'error') finalStatus = 'warning';
         }
      }

      return { 
          animalId, 
          weight: weightStr, 
          calculatedWeight: calculatedWeight, 
          date: dateStr, 
          status: finalStatus, 
          message: messages, 
          animalRef: idValidation.animalRef,
          suggestedId: idValidation.suggestedId
      };
  }, [validateId, validateWeight, validateDate, previousSessionMap]);


  // --- Inicialización y Handlers ---
  useEffect(() => {
    if (didInit.current) return;
    const dataToInitialize = importedData && importedData.length > 0 ? importedData : animalsToWeigh;
    if (dataToInitialize.length === 0) return;

    if (importedData && importedData.length > 0) {
      // Buscar la fila de totales en la data importada
      const totalRow = importedData.find((item: any) => ['total','suma'].includes((item.id||'').toLowerCase()));
      if (totalRow) setOcrTotal(parseFloat((totalRow as any).weight));
    }
    
    didInit.current = true;
    const newRows = dataToInitialize.map((item, index) => {
        const itemAsAny = item as any; 
        const id = (itemAsAny.id || '').replace(/\s/g, ''); 
        const weight = itemAsAny.weight || itemAsAny.kg?.toString() || '';
        const rowDate = itemAsAny.date ? date : date; 
        
        return { 
            key: `row-${index}-${id}-${Date.now()}`, 
            ...runFullValidation(id, weight, rowDate)
        };
      });
      setRows(newRows);
  }, [animalsToWeigh, importedData, date, runFullValidation]);

  const handleIdChange = (key: string, newId: string) => {
    setRows(prevRows => prevRows.map(row => 
        row.key === key ? { ...row, ...runFullValidation(newId, row.weight, row.date) } : row
    ));
  };
  const handleWeightChange = (key: string, newWeight: string) => {
    setRows(prevRows => prevRows.map(row => 
        row.key === key ? { ...row, ...runFullValidation(row.animalId, newWeight, row.date), weight: newWeight } : row
    ));
  };
  const handleDateChange = (key: string, newDate: string) => {
    setRows(prevRows => prevRows.map(row => 
        row.key === key ? { ...row, ...runFullValidation(row.animalId, row.weight, newDate) } : row
    ));
  };
  const handleDeleteRow = (key: string) => {
    const rowToDelete = rows.find(row => row.key === key);
    if (rowToDelete) {
        setLastDeletedRow(rowToDelete);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setLastDeletedRow(null), 5000); 
    }
    setRows(prev => prev.filter(r => r.key !== key));
  };
  const handleUndoDelete = () => {
    if (lastDeletedRow) {
        setRows(prev => [lastDeletedRow, ...prev]); 
        setLastDeletedRow(null);
    }
  };

  const validCount = rows.filter(r => r.status === 'valid').length;
  const warningCount = rows.filter(r => r.status === 'warning').length;
  const errorCount = rows.filter(r => r.status === 'error').length;
  const unrecognizedCount = rows.filter(r => r.status === 'unrecognized').length;

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const validRowsToSave = rows.filter(row =>
      (row.status === 'valid' || (row.status === 'warning' && row.animalRef)) && 
      row.calculatedWeight !== null && !isNaN(row.calculatedWeight) && row.calculatedWeight > 0
    );

    if (validRowsToSave.length === 0) {
      setMessage({ type: 'error', text: 'No hay registros válidos para guardar.' });
      setIsLoading(false);
      return;
    }

    try {
      const promises = validRowsToSave.map(row => {
        const payload = { kg: row.calculatedWeight!, date: row.date };
        return weightType === 'leche' 
            ? addWeighing({ goatId: row.animalRef!.id, ...payload })
            : addBodyWeighing({ animalId: row.animalRef!.id, ...payload });
      });
      
      await Promise.all(promises);
      setMessage({ type: 'success', text: `${promises.length} pesajes guardados.` });
      setTimeout(() => { setIsLoading(false); onSaveSuccess(); }, 1500);

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar.' });
      setIsLoading(false);
    }
  };
  
  const isImportMode = !!importedData;
  const filteredRows = filter === 'all' ? rows : rows.filter(r => r.status === filter);
  const calculatedTotal = rows.reduce((acc, r) => acc + (r.calculatedWeight || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 space-y-3 p-4 border-b border-brand-border">
        <div className="flex justify-between items-start">
             <div className="space-y-1">
                <p className="text-sm text-zinc-400">
                    {isImportMode ? `Procesando ${rows.length} registros.` : `Registro manual.`}
                </p>
                {/* Indicador de Filtros */}
                <p className="text-xs text-zinc-500">
                    {filter !== 'all' ? `Filtrando por: ${filter}` : 'Mostrando todos'}
                </p>
             </div>

             {/* Total Calculado y Validación vs Papel (OCR) */}
             <div className="flex flex-col items-end">
                 <div className="text-sm font-mono text-white font-bold">
                    Suma: {calculatedTotal.toFixed(2)} kg
                 </div>
                 
                 {/* Aquí usamos ocrTotal, resolviendo el warning de variable no usada */}
                 {ocrTotal !== null && (
                    <div className={`text-xs font-mono flex items-center gap-1 mt-1 px-2 py-0.5 rounded ${
                        Math.abs(calculatedTotal - ocrTotal) < 0.1 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                        {Math.abs(calculatedTotal - ocrTotal) < 0.1 ? <CheckCircle size={10}/> : <AlertTriangle size={10}/>}
                        Papel: {ocrTotal.toFixed(2)}
                    </div>
                 )}
             </div>
        </div>

        {!isImportMode && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800 text-white p-2 rounded-lg text-sm" />
        )}
        
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
             <FilterButton label="Todos" count={rows.length} isActive={filter === 'all'} onClick={() => setFilter('all')} />
             <FilterButton label="Válidos" count={validCount} isActive={filter === 'valid'} onClick={() => setFilter('valid')} color="green" />
             <FilterButton label="Alertas" count={warningCount} isActive={filter === 'warning'} onClick={() => setFilter('warning')} color="yellow" />
             <FilterButton label="Errores" count={errorCount} isActive={filter === 'error'} onClick={() => setFilter('error')} color="red" />
             <FilterButton label="?" count={unrecognizedCount} isActive={filter === 'unrecognized'} onClick={() => setFilter('unrecognized')} color="blue" />
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {filteredRows.map(row => (
          <ValidatedRowComponent
            key={row.key}
            row={row}
            isImportMode={isImportMode}
            onIdChange={handleIdChange}
            onWeightChange={handleWeightChange}
            onDateChange={handleDateChange}
            onDeleteRow={handleDeleteRow} 
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-brand-border bg-ios-modal-bg">
        {lastDeletedRow && (
            <div className="mb-3 flex justify-between p-3 rounded-lg text-sm bg-zinc-700 text-white">
                <span>Eliminado: {lastDeletedRow.animalId}</span>
                <button type="button" onClick={handleUndoDelete} className="text-blue-300 flex items-center gap-1"><Undo2 size={14}/> Deshacer</button>
            </div>
        )}
        {message && (
          <div className={`mb-3 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
            {message.text}
          </div>
        )}
        <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 rounded-lg font-semibold">Cancelar</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green text-white font-bold rounded-lg flex items-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar
            </button>
        </div>
      </div>
    </form>
  );
};

// --- Componente de Fila ---
const ValidatedRowComponent: React.FC<{ row: ValidatedRow, onIdChange: any, onWeightChange: any, onDeleteRow: any, isImportMode: boolean, onDateChange: any }> = ({
  row, onIdChange, onWeightChange, onDeleteRow, isImportMode, onDateChange
}) => {
  
  const applySuggestion = () => {
      if (row.suggestedId) onIdChange(row.key, row.suggestedId);
  };

  const getBorderColor = () => {
      if (row.status === 'valid') return 'border-green-500/30 bg-green-900/10';
      if (row.status === 'warning') return 'border-yellow-500/30 bg-yellow-900/10';
      if (row.status === 'error') return 'border-red-500/30 bg-red-900/10';
      return 'border-purple-500/30 bg-purple-900/10';
  };

  return (
    <div className={`p-3 rounded-lg flex flex-col border transition-all ${getBorderColor()}`}>
        <div className="flex items-center gap-3">
            <div className="relative w-3/5">
                <input 
                    value={row.animalId}
                    onChange={(e) => onIdChange(row.key, e.target.value.toUpperCase())}
                    className={`w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono text-white 
                        ${row.suggestedId ? 'border border-yellow-500/50' : ''}`}
                    placeholder="ID"
                />
                {row.suggestedId && (
                    <button type="button" onClick={applySuggestion} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/40 animate-pulse" title="Corregir ID">
                        <Lightbulb size={16} />
                    </button>
                )}
            </div>
            <input 
              value={row.weight}
              onChange={(e) => onWeightChange(row.key, e.target.value)}
              className="w-2/5 bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono text-white"
              placeholder="0.00"
            />
            <button type="button" onClick={() => onDeleteRow(row.key)} className="p-3 bg-red-600/20 text-red-400 rounded-lg">
                <Trash2 size={18} />
            </button>
        </div>
        
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-zinc-700/50 min-h-[24px]">
            {row.message.length > 0 && (
                <div className="flex-grow flex flex-wrap gap-2 text-xs">
                     {row.message.map((msg, idx) => (
                         <span key={idx} className={`flex items-center gap-1 ${msg.includes('Primer') ? 'text-yellow-400 font-bold' : 'text-zinc-400'}`}>
                            {msg.includes('Primer') ? <AlertTriangle size={12}/> : <Info size={12}/>}
                            {msg}
                         </span>
                     ))}
                     {row.suggestedId && <span onClick={applySuggestion} className="text-yellow-400 underline cursor-pointer font-bold ml-1">Usar {row.suggestedId}</span>}
                </div>
            )}
            {isImportMode && (
                <input type="date" value={row.date} onChange={(e) => onDateChange(row.key, e.target.value)} className="bg-zinc-800 text-white p-1 rounded text-xs w-[110px]" />
            )}
        </div>
    </div>
  );
};

// Componente FilterButton
interface FilterButtonProps {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    color?: 'green' | 'yellow' | 'red' | 'blue';
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, count, isActive, onClick, color = 'blue' }) => {
    const activeClasses = {
        green: 'bg-green-600 text-white',
        yellow: 'bg-yellow-500 text-black',
        red: 'bg-red-600 text-white',
        blue: 'bg-blue-600 text-white'
    };

    const activeClass = activeClasses[color];

    return (
        <button 
            type="button" 
            onClick={onClick} 
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-shrink-0 ${isActive ? activeClass : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
            {label} ({count})
        </button>
    );
};