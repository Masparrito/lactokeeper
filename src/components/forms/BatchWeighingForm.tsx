// src/components/forms/BatchWeighingForm.tsx 
// (ACTUALIZADO: Toda la lógica de destete ha sido eliminada)

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Animal, BodyWeighing, Weighing } from '../../db/local'; 
import { AlertTriangle, CheckCircle, Save, Loader2, CircleX, Info, Trash2, Undo2 } from 'lucide-react'; 
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
  weight: string; // El input del usuario (ej. "23.90")
  calculatedWeight: number | null; // El peso total calculado (ej. 23.90)
  date: string; 
  status: RowStatus;
  message: string[];
  animalRef: Animal | null; 
  // isWeaningCandidate: boolean; // <-- ELIMINADO
  // isMarkedForWeaning: boolean; // <-- ELIMINADO
}
// --- Fin Tipos ---

// --- Helper 'calculateDaysBetween' usa Math.floor ---
const localCalculateDaysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
    const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
    const diffTime = utc1 - utc2;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
// --- FIN Helper ---


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
    // updateAnimal, // <-- ELIMINADO
    parturitions,
    appConfig
  } = useData();

  const [date, setDate] = useState(externalDefaultDate || new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [ocrTotal, setOcrTotal] = useState<number | null>(null);
  const didInit = useRef(false);

  const [lastDeletedRow, setLastDeletedRow] = useState<ValidatedRow | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const validateId = useCallback((animalId: string): { status: RowStatus, message: string | null, animalRef: Animal | null } => {
    if (!animalId) return { status: 'error', message: 'ID no puede estar vacío.', animalRef: null };
    
    const animal = animals.find(a => a.id.toLowerCase() === animalId.toLowerCase());
    if (!animal) return { status: 'unrecognized', message: 'ID no reconocido.', animalRef: null };
    
    if (animal.isReference || animal.status !== 'Activo') {
        return { status: 'warning', message: `Animal de Referencia/Inactivo.`, animalRef: animal };
    }

    if (weightType === 'leche') {
      const category = getAnimalZootecnicCategory(animal, parturitions, appConfig);
      if (category !== 'Cabra') {
        return { status: 'warning', message: `Pesaje en ${category} (sin parto activo).`, animalRef: animal };
      }
    }
    
    return { status: 'valid', message: formatAnimalDisplay(animal), animalRef: animal };
  }, [animals, parturitions, appConfig, weightType]);

  const historicalStats = useMemo(() => {
    const statsMap = new Map<string, { avg: number; count: number }>();
    const sourceData = (weightType === 'leche' ? weighings : bodyWeighings) as (Weighing[] | BodyWeighing[]);
    const animalIds = new Set(sourceData.map(w => (weightType === 'leche' ? (w as Weighing).goatId : (w as BodyWeighing).animalId)));
    for (const animalId of animalIds) {
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

  const validateWeight = useCallback((weightKg: number, animalId: string, idStatus: RowStatus): { status: RowStatus, message: string | null } => {
    if (isNaN(weightKg)) return { status: 'valid', message: null }; 
    
    if (weightType === 'leche' && (weightKg <= 0 || weightKg > 5)) {
        return { status: 'error', message: 'Valor imposible (0 - 5 kg)' };
    }
    if (weightType === 'corporal' && (weightKg < 1 || weightKg > 150)) {
        return { status: 'error', message: 'Valor imposible (1 - 150 kg)' };
    }
    
    if (idStatus !== 'error' && idStatus !== 'unrecognized' && animalId) {
      const stats = historicalStats.get(animalId);
      if (!stats) return { status: 'warning', message: 'Primer pesaje registrado' };
      if (stats.count >= 2) {
        const avg = stats.avg;
        const threshold = Math.max(avg * 0.7, 1.0);
        const diff = Math.abs(weightKg - avg);
        if (diff > threshold) return { status: 'warning', message: `Valor atípico. Promedio: ${avg.toFixed(2)} kg` };
      }
    }
    return { status: 'valid', message: null };
  }, [weightType, historicalStats]);
  
  const validateDate = useCallback((dateStr: string, animalRef: Animal | null): { status: RowStatus, message: string | null } => {
    if (!animalRef || !animalRef.birthDate || animalRef.birthDate === 'N/A') {
        return { status: 'valid', message: null };
    }
    
    const daysSinceBirth = localCalculateDaysBetween(dateStr, animalRef.birthDate);
    
    if (daysSinceBirth < 0) {
        return { status: 'error', message: `Fecha (${dateStr}) anterior al nacimiento (${animalRef.birthDate}).` };
    }
    
    if (weightType === 'corporal') {
        const category = getAnimalZootecnicCategory(animalRef, parturitions, appConfig);
        if (['Cabra', 'Reproductor'].includes(category)) {
             const daysAgo = localCalculateDaysBetween(new Date().toISOString().split('T')[0], dateStr);
             if (daysAgo <= 30) {
                 return { status: 'warning', message: `Pesaje en animal adulto (${category}).` };
             }
        }
    }
    
    return { status: 'valid', message: null };
  }, [appConfig, parturitions, weightType]);


  const runFullValidation = useCallback((animalId: string, weightStr: string, dateStr: string): Omit<ValidatedRow, 'key'> => {
      
      const idValidation = validateId(animalId);
      
      let calculatedWeight: number | null = null;
      let finalWeightStr = weightStr.trim();
      let deltaMessage: string | null = null;

      // 1. Detectar y procesar Deltas (si el usuario los escribe)
      if (finalWeightStr.startsWith('+') || finalWeightStr.startsWith('-')) {
          const delta = parseFloat(finalWeightStr);
          if (!isNaN(delta)) {
              if (idValidation.animalRef) {
                  const previousWeight = previousSessionMap.get(idValidation.animalRef.id);
                  if (previousWeight !== undefined) {
                      calculatedWeight = previousWeight + delta;
                      deltaMessage = `Peso calc. (Base ${previousWeight.toFixed(1)}kg, Delta ${finalWeightStr}kg)`;
                  } else {
                      deltaMessage = `Delta (${finalWeightStr}) sin peso anterior.`;
                      calculatedWeight = -1; // Forzar error
                  }
              } else {
                  deltaMessage = `Delta (${finalWeightStr}) en ID no reconocido.`;
                  calculatedWeight = -1; // Forzar error
              }
          }
      } else if (finalWeightStr !== '') {
          calculatedWeight = parseFloat(finalWeightStr);
      }
      
      // 2. Validar el peso
      const weightValidation = validateWeight(calculatedWeight ?? NaN, animalId, idValidation.status);
      
      // 3. Validar la fecha
      const dateValidation = validateDate(dateStr, idValidation.animalRef);

      // 4. (LÓGICA DE DESTETE ELIMINADA)
      
      // 5. Compilar mensajes y estado
      const messages: string[] = [];
      if (idValidation.message) messages.push(idValidation.message);
      if (deltaMessage) messages.push(deltaMessage);
      if (weightValidation.message) messages.push(weightValidation.message);
      if (dateValidation.message) messages.push(dateValidation.message);

      let finalStatus: RowStatus = 'valid';
      if (idValidation.status === 'warning' || weightValidation.status === 'warning' || dateValidation.status === 'warning') {
          finalStatus = 'warning';
      }
      if (idValidation.status === 'error' || weightValidation.status === 'error' || dateValidation.status === 'error' || deltaMessage?.includes('sin peso anterior') || deltaMessage?.includes('no reconocido')) {
          finalStatus = 'error';
      }
      if (idValidation.status === 'unrecognized') {
          finalStatus = 'unrecognized';
      }
      
      return { 
          animalId, 
          weight: weightStr, 
          calculatedWeight: calculatedWeight, 
          date: dateStr, 
          status: finalStatus, 
          message: messages, 
          animalRef: idValidation.animalRef,
      };
  }, [validateId, validateWeight, validateDate, previousSessionMap, weightType, appConfig]);


  // --- Efecto de Inicialización ---
  useEffect(() => {
    if (didInit.current) return;
    const dataToInitialize = importedData && importedData.length > 0 ? importedData : animalsToWeigh;
    if (dataToInitialize.length === 0) return;

    const rowItems: (OcrResult | Animal)[] = [];
    let foundTotal: number | null = null;

    if (importedData && importedData.length > 0) {
      for (const item of importedData) {
        const itemAsAny = item as any;
        const id = (itemAsAny.id || '').toLowerCase();
        const weight = itemAsAny.weight || itemAsAny.kg?.toString() || '';
        if ((id === 'total' || id === 'suma' || id === 'totales') && weight) {
          const parsedTotal = parseFloat(weight);
          if (!isNaN(parsedTotal) && parsedTotal > 0) foundTotal = parsedTotal;
        } else {
          rowItems.push(item);
        }
      }
      if (foundTotal) setOcrTotal(foundTotal);
    } else {
      rowItems.push(...animalsToWeigh);
    }
    
    didInit.current = true;
    const newRows = rowItems.map((item, index) => {
        const itemAsAny = item as any; 
        const id = itemAsAny.id; 
        const weight = itemAsAny.weight || itemAsAny.kg?.toString() || '';
        
        let rowDate = date; // Usa la fecha global por defecto
        
        if (itemAsAny.date) {
            try {
                const parts = itemAsAny.date!.split('/'); 
                const day = parts[0].padStart(2, '0'); 
                const month = parts[1].padStart(2, '0'); 
                
                let year = parts[2];
                if (year && year.length === 2) { 
                    year = `20${year}`; 
                } else {
                    year = new Date(date).getFullYear().toString();
                }
                
                rowDate = `${year}-${month}-${day}`; 
            } catch (e) { /* se queda con la 'date' por defecto */ }
        }
        
        const validation = runFullValidation(id, weight, rowDate);
        
        return { 
            key: `row-${index}-${id}-${Date.now()}`, 
            ...validation
        };
      });
      setRows(newRows);
  }, [animalsToWeigh, importedData, date, runFullValidation]);


  // --- Handlers de la Cuadrícula ---
  const handleIdChange = (key: string, newId: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.key !== key) return row;
        const validation = runFullValidation(newId, row.weight, row.date);
        return { ...row, ...validation };
      })
    );
  };
  const handleWeightChange = (key: string, newWeight: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.key !== key) return row;
        const validation = runFullValidation(row.animalId, newWeight, row.date);
        return { ...row, ...validation, weight: newWeight };
      })
    );
  };
  const handleDateChange = (key: string, newDate: string) => {
    setRows(prevRows => 
        prevRows.map(row => {
            if (row.key !== key) return row;
            const validation = runFullValidation(row.animalId, row.weight, newDate);
            return { ...row, ...validation };
        })
    );
  };
  
  const handleDeleteRow = (key: string) => {
    const rowToDelete = rows.find(row => row.key === key);
    if (rowToDelete) {
        setLastDeletedRow(rowToDelete);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
            setLastDeletedRow(null);
        }, 5000); 
    }
    setRows(prevRows => prevRows.filter(row => row.key !== key));
  };
  
  const handleUndoDelete = () => {
    if (lastDeletedRow) {
        setRows(prevRows => [lastDeletedRow, ...prevRows]); 
        setLastDeletedRow(null);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  };

  // const handleToggleWean = (key: string) => {}; // <-- ELIMINADO
  // --- Fin Handlers ---

  const validCount = useMemo(() => rows.filter(r => r.status === 'valid').length, [rows]);
  const warningCount = useMemo(() => rows.filter(r => r.status === 'warning').length, [rows]);
  const errorCount = useMemo(() => rows.filter(r => r.status === 'error').length, [rows]);
  const unrecognizedCount = useMemo(() => rows.filter(r => r.status === 'unrecognized').length, [rows]);
  const weighedCount = useMemo(() => validCount + warningCount, [validCount, warningCount]);
  // const weanCount = useMemo(() => 0, []); // <-- ELIMINADO

  // --- (CORREGIDO) handleSubmit ahora guarda SÓLO Pesajes ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    
    const weighingPromises: Promise<void>[] = [];
    // const weaningPromises: Promise<void>[] = []; // <-- ELIMINADO

    // 1. Identificar filas válidas para *PESAJE*
    const validRowsToSave = rows.filter(row =>
      (row.status === 'valid' || row.status === 'warning') &&
      row.animalRef?.id &&
      row.calculatedWeight !== null &&
      !isNaN(row.calculatedWeight) &&
      row.calculatedWeight > 0
    );

    // 2. (LÓGICA DE DESTETE ELIMINADA)

    if (validRowsToSave.length === 0) {
      setMessage({ type: 'error', text: 'No se han introducido pesos válidos.' });
      setIsLoading(false);
      return;
    }

    try {
      // 3. Crear promesas de Pesaje
      for (const row of validRowsToSave) {
        const entry = {
          animalId: row.animalRef!.id,
          kg: row.calculatedWeight!,
          date: row.date,
        };
        if (weightType === 'leche') {
          weighingPromises.push(addWeighing({ goatId: entry.animalId, kg: entry.kg, date: entry.date }));
        } else {
          weighingPromises.push(addBodyWeighing({ animalId: entry.animalId, kg: entry.kg, date: entry.date }));
        }
      }
      
      // 4. (LÓGICA DE DESTETE ELIMINADA)
      
      // 5. Ejecutar todo en paralelo
      await Promise.all(weighingPromises);
      
      // 6. Mensaje de éxito
      const successMsg = `${weighingPromises.length} pesajes guardados con éxito.`;

      setMessage({ type: 'success', text: successMsg });
      setTimeout(() => { setIsLoading(false); onSaveSuccess(); }, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Ocurrió un error al guardar los datos.' });
      setIsLoading(false);
    }
  };
  
  const isImportMode = !!importedData;

  const calculatedTotal = useMemo(() => {
    return rows.filter(row => row.status !== 'error' && row.status !== 'unrecognized').reduce((sum, row) => {
        const weight = row.calculatedWeight;
        return sum + (weight === null || isNaN(weight) ? 0 : weight);
      }, 0);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(row => row.status === filter);
  }, [rows, filter]);


  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* --- Cabecera --- */}
      <div className="flex-shrink-0 space-y-3 p-4 border-b border-brand-border">
        <p className="text-sm text-zinc-400">
            {isImportMode 
                ? `Validando ${rows.length} registros. ${weighedCount} listos, ${errorCount + unrecognizedCount} ignorados.`
                : `Registrando ${weighedCount} / ${animalsToWeigh.length} animales.`
            }
        </p>

        {!isImportMode && (
            <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full bg-zinc-800 text-white p-2 rounded-lg text-sm"
            />
        )}

        {isImportMode && ocrTotal !== null && (
          <div className="p-3 bg-zinc-800/50 rounded-lg border border-brand-border">
            <h4 className="text-sm font-semibold text-white mb-2">Verificación de Total</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Total (Papel):</span>
              <span className="font-mono text-white text-base">{ocrTotal.toFixed(2)} Kg</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-zinc-400">Total (Sistema):</span>
              <span className="font-mono text-white text-base">{calculatedTotal.toFixed(2)} Kg</span>
            </div>
            {Math.abs(ocrTotal - calculatedTotal) < 0.01 ? (
              <div className="text-xs text-brand-green flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-700">
                <CheckCircle size={14} /> Totales Coinciden
              </div>
            ) : (
              <div className="text-xs text-yellow-400 flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-700">
                <AlertTriangle size={14} /> Los totales no coinciden.
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterButton label="Todos" count={rows.length} isActive={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterButton label="Válidos" count={validCount} isActive={filter === 'valid'} onClick={() => setFilter('valid')} color="green" />
          <FilterButton label="Advertencias" count={warningCount} isActive={filter === 'warning'} onClick={() => setFilter('warning')} color="yellow" />
          <FilterButton label="Errores" count={errorCount} isActive={filter === 'error'} onClick={() => setFilter('error')} color="red" />
          <FilterButton label="No Reconocidos" count={unrecognizedCount} isActive={filter === 'unrecognized'} onClick={() => setFilter('unrecognized')} color="purple" />
        </div>
      </div>
      
      {/* --- Cuadrícula de Validación --- */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {rows.length === 0 && (<div className="text-center py-10 text-zinc-500 text-sm">{isImportMode ? "La IA no detectó registros." : "No hay animales seleccionados."}</div>)}
        {rows.length > 0 && filteredRows.length === 0 && (<div className="text-center py-10 text-zinc-500 text-sm">No hay registros que coincidan con este filtro.</div>)}
        
        {filteredRows.map(row => (
          <ValidatedRowComponent
            key={row.key}
            row={row}
            isImportMode={isImportMode}
            isLoading={isLoading}
            onIdChange={handleIdChange}
            onWeightChange={handleWeightChange}
            onDateChange={handleDateChange}
            onDeleteRow={handleDeleteRow} 
            // onToggleWean={handleToggleWean} // <-- ELIMINADO
          />
        ))}
      </div>

      {/* --- Pie de Página --- */}
      <div className="flex-shrink-0 p-4 border-t border-brand-border bg-ios-modal-bg">
        {lastDeletedRow && (
            <div className="mb-3 flex items-center justify-between space-x-2 p-3 rounded-lg text-sm bg-zinc-700 text-white">
                <p>Se eliminó <span className="font-mono font-bold">{lastDeletedRow.animalId}</span>.</p>
                <button 
                    type="button" 
                    onClick={handleUndoDelete}
                    className="flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300"
                >
                    <Undo2 size={16} />
                    Deshacer
                </button>
            </div>
        )}
        
        {message && (
          <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
        <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">
            Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isLoading || (weighedCount === 0)} 
                className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Guardar {weighedCount > 0 ? `(${weighedCount})` : ''}
            </button>
        </div>
      </div>
    </form>
  );
};


// --- Componente de Fila Validada ---
interface ValidatedRowProps {
  row: ValidatedRow;
  isImportMode: boolean;
  isLoading: boolean;
  onIdChange: (key: string, value: string) => void;
  onWeightChange: (key: string, value: string) => void;
  onDateChange: (key: string, value: string) => void;
  onDeleteRow: (key: string) => void; 
  // onToggleWean: (key: string) => void; // <-- ELIMINADO
}

const ValidatedRowComponent: React.FC<ValidatedRowProps> = ({
  row, isImportMode, isLoading,
  onIdChange, onWeightChange, onDateChange, onDeleteRow,
  // onToggleWean // <-- ELIMINADO
}) => {
  
  const getStatusColorClasses = () => {
    switch (row.status) {
      case 'valid': return 'border-green-500/30 bg-green-900/10';
      case 'warning': return 'border-yellow-500/30 bg-yellow-900/10';
      case 'error': return 'border-red-500/30 bg-red-900/10';
      case 'unrecognized': return 'border-purple-500/30 bg-purple-900/10';
      default: return 'border-brand-border bg-black/20';
    }
  };

  const statusIcon = useMemo(() => {
    switch (row.status) {
      case 'valid': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error': return <CircleX size={16} className="text-red-500" />; 
      case 'unrecognized': return <Info size={16} className="text-purple-400" />;
      default: return <Info size={16} className="text-zinc-600" />;
    }
  }, [row.status]);

  // const weanButtonClasses = ''; // <-- ELIMINADO

  return (
    <div className={`p-3 rounded-lg flex flex-col border ${getStatusColorClasses()}`}>
        <div className="flex items-center gap-3">
            {/* (BOTÓN DE DESTETE ELIMINADO) */}
            
            <input 
                id={`id-${row.key}`}
                type="text"
                value={row.animalId}
                onChange={(e) => onIdChange(row.key, e.target.value.toUpperCase())}
                placeholder="ID"
                disabled={isLoading} 
                className="w-3/5 bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono text-white disabled:opacity-50"
            />
            
            <input 
              id={`weight-${row.key}`}
              type="text"
              value={row.weight || ''}
              onChange={(e) => onWeightChange(row.key, e.target.value)}
              placeholder="Kg"
              disabled={isLoading}
              className="w-2/5 bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono disabled:opacity-50"
            />

            <button
                type="button"
                onClick={() => onDeleteRow(row.key)}
                title="Eliminar fila"
                disabled={isLoading}
                className="p-3 ml-1 flex-shrink-0 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/40 disabled:opacity-50"
            >
                <Trash2 size={18} />
            </button>
        </div>
        
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-zinc-700/50">
            {row.message.length > 0 && (
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    {statusIcon}
                    <p className="text-xs text-zinc-400 truncate">{row.message.join(', ')}</p>
                </div>
            )}
            
            {isImportMode && (
                <input 
                  type="date" 
                  value={row.date} 
                  onChange={(e) => onDateChange(row.key, e.target.value)}
                  disabled={isLoading}
                  className="bg-zinc-800 text-white p-2 rounded-lg text-xs w-full max-w-[140px] disabled:opacity-50 ml-auto flex-shrink-0"
                />
            )}
        </div>
    </div>
  );
};


// --- Componente de Botón de Filtro ---
interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  color?: 'green' | 'yellow' | 'red' | 'purple';
}
const FilterButton: React.FC<FilterButtonProps> = ({ label, count, isActive, onClick, color }) => {
  const baseClasses = 'px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all duration-150';
  const activeClasses = { 
      all: 'bg-blue-500 text-white', 
      green: 'bg-brand-green text-white', 
      yellow: 'bg-yellow-400 text-black', 
      red: 'bg-red-500 text-white',
      purple: 'bg-purple-500 text-white'
  };
  const inactiveClasses = 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600';
  
  let activeClass = activeClasses.all;
  if (color === 'green') activeClass = activeClasses.green;
  if (color === 'yellow') activeClass = activeClasses.yellow;
  if (color === 'red') activeClass = activeClasses.red;
  if (color === 'purple') activeClass = activeClasses.purple;
  
  return (
    <button type="button" onClick={onClick} className={`${baseClasses} ${isActive ? activeClass : inactiveClasses}`}>
      {label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-black/20' : 'bg-zinc-800'}`}>{count}</span>
    </button>
  );
};