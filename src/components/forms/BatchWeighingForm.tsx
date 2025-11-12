// src/components/forms/BatchWeighingForm.tsx (CORREGIDO)

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Animal, Parturition } from '../../db/local';
import { AlertTriangle, CheckCircle, Save, Wind, Archive, Loader2, XCircle, Info } from 'lucide-react';
import { useData } from '../../context/DataContext';
// (CORREGIDO) Importar 'formatAnimalDisplay' desde 'formatting.ts'
import { getAnimalZootecnicCategory } from '../../utils/calculations';
import { formatAnimalDisplay } from '../../utils/formatting';
// (CORREGIDO) La ruta a OcrPage es un nivel arriba
import { OcrResult } from '../../pages/BatchImportPage'; 

// --- (NUEVO) Definiciones de Tipos de Validación ---
type RowStatus = 'valid' | 'warning' | 'error';

interface ValidatedRow {
  key: string; 
  animalId: string;
  weight: string;
  date: string; 
  status: RowStatus;
  message: string | null;
  animalRef: Animal | null; 
}
// --- Fin Tipos ---


interface BatchWeighingFormProps {
  // (CORREGIDO) Tipos cambiados a 'leche' | 'corporal'
  weightType: 'leche' | 'corporal';
  onSaveSuccess: () => void;
  onCancel: () => void;
  // --- Props Opcionales ---
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
    animals, // La lista COMPLETA de animales
    addWeighing,
    addBodyWeighing,
    parturitions,
    startDryingProcess, 
    setLactationAsDry, 
    appConfig
  } = useData();

  const [date, setDate] = useState(externalDefaultDate || new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- (NUEVO) El "Cerebro" de Validación ---
  const validateRow = useCallback((animalId: string, type: 'leche' | 'corporal'): { status: RowStatus, message: string | null, animalRef: Animal | null } => {
    if (!animalId) {
      return { status: 'error', message: 'ID no puede estar vacío.', animalRef: null };
    }

    const animal = animals.find(a => a.id.toLowerCase() === animalId.toLowerCase());

    if (!animal) {
      return { status: 'error', message: 'ID no encontrado.', animalRef: null };
    }
    
    if (animal.isReference) {
      return { status: 'warning', message: 'Animal de Referencia. Se ignorará.', animalRef: animal };
    }

    if (animal.status !== 'Activo') {
       return { status: 'warning', message: `Animal inactivo (${animal.status}). Se ignorará.`, animalRef: animal };
    }

    if (type === 'leche') {
      const category = getAnimalZootecnicCategory(animal, parturitions, appConfig);
      if (category !== 'Cabra') {
        return { status: 'error', message: `No se puede cargar leche a: ${category}.`, animalRef: animal };
      }
    }

    // Si todo está bien
    return { status: 'valid', message: formatAnimalDisplay(animal), animalRef: animal };
  }, [animals, parturitions, appConfig]);

  // --- (NUEVO) Efecto de Inicialización ---
  useEffect(() => {
    if (importedData && importedData.length > 0) {
      const newRows = importedData.map((item, index) => {
        const { status, message, animalRef } = validateRow(item.id, weightType);
        
        let rowDate = date; 
        if (item.date) {
            try {
                const parts = item.date.split('/');
                const day = parts[0];
                const month = parts[1];
                let year = parts[2];
                if (year.length === 2) {
                    year = `20${year}`; 
                }
                rowDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } catch (e) {
                console.warn(`Fecha de IA no válida (${item.date}), usando fecha por defecto.`);
            }
        }

        return {
          key: `import-${index}-${item.id}`,
          animalId: item.id,
          weight: item.weight,
          date: rowDate,
          status,
          message,
          animalRef
        };
      });
      setRows(newRows);
    } 
    else if (animalsToWeigh.length > 0) {
      const newRows = animalsToWeigh.map((animal) => {
        const { status, message, animalRef } = validateRow(animal.id, weightType);
        return {
          key: animal.id,
          animalId: animal.id,
          weight: '',
          date: date, // Todos usan la fecha global
          status,
          message,
          animalRef
        };
      });
      setRows(newRows);
    }
  }, [animalsToWeigh, importedData, date, weightType, validateRow]);

  // --- (NUEVO) Handlers para la cuadrícula ---
  const handleIdChange = (key: string, newId: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.key !== key) return row;
        const { status, message, animalRef } = validateRow(newId, weightType);
        return { ...row, animalId: newId, status, message, animalRef };
      })
    );
  };

  const handleWeightChange = (key: string, newWeight: string) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.key === key ? { ...row, weight: newWeight } : row
      )
    );
  };
  
  const handleDateChange = (key: string, newDate: string) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.key === key ? { ...row, date: newDate } : row
      )
    );
  };
  // --- Fin Handlers ---

  const weighedCount = useMemo(() => {
    return rows.filter(r => r.status === 'valid' && r.weight.trim() !== '' && !isNaN(parseFloat(r.weight))).length;
  }, [rows]);
  
  const ignoredCount = useMemo(() => {
    return rows.filter(r => r.status === 'warning' || r.status === 'error').length;
  }, [rows]);

  const activeParturitions = useMemo(() => {
    const map = new Map<string, Parturition>();
    if (weightType === 'leche') {
        const animalIds = new Set(rows.map(r => r.animalId));
        parturitions
            .filter(p => animalIds.has(p.goatId) && (p.status === 'activa' || p.status === 'en-secado'))
            .forEach(p => {
                const existing = map.get(p.goatId);
                if (!existing || new Date(p.parturitionDate) > new Date(existing.parturitionDate)) {
                    map.set(p.goatId, p);
                }
            });
    }
    return map;
  }, [parturitions, rows, weightType]);

  const handleStartDrying = async (animalId: string) => {
    const parturition = activeParturitions.get(animalId);
    if (!parturition || parturition.status !== 'activa') return;
    
    setIsActionLoading(animalId);
    setMessage(null);
    try {
      await startDryingProcess(parturition.id);
      const updatedParturition = { ...parturition, status: 'en-secado' as const };
      activeParturitions.set(animalId, updatedParturition);
      setRows(prevRows => [...prevRows]); 
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error al secar ${animalId}: ${e.message}` });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSetDry = async (animalId: string) => {
    const parturition = activeParturitions.get(animalId);
    if (!parturition || parturition.status === 'seca' || parturition.status === 'finalizada') return;

    setIsActionLoading(animalId);
    setMessage(null);
    try {
      await setLactationAsDry(parturition.id);
      const updatedParturition = { ...parturition, status: 'seca' as const };
      activeParturitions.set(animalId, updatedParturition);
      setRows(prevRows => [...prevRows]);
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error al secar ${animalId}: ${e.message}` });
    } finally {
      setIsActionLoading(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const validEntries = rows
      .map(row => ({ 
          animalId: row.animalRef?.id || null, 
          kg: parseFloat(row.weight), 
          date: row.date,
          status: row.status 
      }))
      .filter(entry => 
          entry.status === 'valid' &&
          entry.animalId &&          
          !isNaN(entry.kg) &&        
          entry.kg > 0
      );

    if (validEntries.length === 0) {
      setMessage({ type: 'error', text: 'No se han introducido pesos válidos.' });
      setIsLoading(false);
      return;
    }

    try {
      const addPromises = validEntries.map(entry => {
        if (weightType === 'leche') {
          return addWeighing({
            goatId: entry.animalId!, 
            kg: entry.kg,
            date: entry.date,
          });
        } else {
          return addBodyWeighing({
            animalId: entry.animalId!, 
            kg: entry.kg,
            date: entry.date,
          });
        }
      });
      await Promise.all(addPromises);

      setMessage({ type: 'success', text: `${validEntries.length} pesajes guardados con éxito.` });
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Ocurrió un error al guardar los datos.' });
      setIsLoading(false);
      console.error("Error en escritura por lote de pesajes:", error);
    }
  };
  
  const isImportMode = !!importedData;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 p-4 border-b border-brand-border">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
                {isImportMode ? "Verificar Datos Importados" : (weightType === 'leche' ? 'Sesión de Ordeño' : 'Sesión de Pesaje Corporal')}
            </h3>
            {!isImportMode && (
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="bg-zinc-800 text-white p-2 rounded-lg text-sm"
                />
            )}
        </div>
        <p className="text-sm text-zinc-400">
            {isImportMode 
                ? `Validando ${rows.length} registros. ${weighedCount} listos, ${ignoredCount} ignorados.`
                : `Registrando ${weighedCount} / ${animalsToWeigh.length} animales.`
            }
        </p>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {rows.map(row => (
          <ValidatedRowComponent
            key={row.key}
            row={row}
            weightType={weightType}
            isImportMode={isImportMode}
            isLoading={isLoading}
            isActionLoading={isActionLoading === row.animalId}
            activeParturition={activeParturitions.get(row.animalId)}
            onIdChange={handleIdChange}
            onWeightChange={handleWeightChange}
            onDateChange={handleDateChange}
            onStartDrying={handleStartDrying}
            onSetDry={handleSetDry}
          />
        ))}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-brand-border bg-ios-modal-bg">
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
                disabled={isLoading || weighedCount === 0 || isActionLoading !== null}
                className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar {weighedCount > 0 ? `(${weighedCount})` : ''}
            </button>
        </div>
      </div>
    </form>
  );
};


// --- (NUEVO) Componente de Fila Validada ---
interface ValidatedRowProps {
  row: ValidatedRow;
  // (CORREGIDO) Tipos cambiados a 'leche' | 'corporal'
  weightType: 'leche' | 'corporal';
  isImportMode: boolean;
  isLoading: boolean;
  isActionLoading: boolean;
  activeParturition?: Parturition;
  onIdChange: (key: string, value: string) => void;
  onWeightChange: (key: string, value: string) => void;
  onDateChange: (key: string, value: string) => void;
  onStartDrying: (animalId: string) => void;
  onSetDry: (animalId: string) => void;
}

const ValidatedRowComponent: React.FC<ValidatedRowProps> = ({
  row, weightType, isImportMode, isLoading, isActionLoading, activeParturition,
  onIdChange, onWeightChange, onDateChange, onStartDrying, onSetDry
}) => {
  
  const getStatusColorClasses = () => {
    switch (row.status) {
      case 'valid': return 'border-green-500/30 bg-green-900/10';
      case 'warning': return 'border-yellow-500/30 bg-yellow-900/10';
      case 'error': return 'border-red-500/30 bg-red-900/10';
      default: return 'border-brand-border bg-black/20';
    }
  };

  const statusIcon = useMemo(() => {
    switch (row.status) {
      case 'valid': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-zinc-600" />;
    }
  }, [row.status]);
  
  return (
    <div className={`p-2 rounded-lg border ${getStatusColorClasses()}`}>
        <div className="grid grid-cols-3 items-center gap-2">
            {/* Columna 1: ID (Editable solo en modo importación) */}
            <div className="col-span-1">
                {isImportMode ? (
                    <input 
                      id={`id-${row.key}`}
                      type="text"
                      value={row.animalId}
                      onChange={(e) => onIdChange(row.key, e.target.value.toUpperCase())}
                      placeholder="ID"
                      className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono"
                    />
                ) : (
                    <div className="min-w-0">
                        <label htmlFor={`weight-${row.key}`} className="font-mono font-semibold text-base text-white truncate block cursor-pointer">{row.animalId.toUpperCase()}</label>
                        {row.animalRef?.name && (
                            <p className="text-sm font-normal text-zinc-400 truncate">{row.animalRef.name.toUpperCase()}</p>
                        )}
                    </div>
                )}
            </div>
            
            {/* Columna 2: Peso (Siempre editable) */}
            <input 
              id={`weight-${row.key}`}
              type="number"
              step="0.1"
              value={row.weight || ''}
              onChange={(e) => onWeightChange(row.key, e.target.value)}
              placeholder="Kg"
              disabled={isLoading || (weightType === 'leche' && (!activeParturition || activeParturition.status === 'seca'))}
              className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-mono col-span-1 disabled:opacity-50"
            />
            
            {/* Columna 3: Acciones o Fecha */}
            <div className="col-span-1 flex items-center justify-end gap-1">
                {/* (CORREGIDO) Error de tipo: 'corporal' es correcto aquí */}
                {weightType === 'corporal' && isImportMode && (
                    <input 
                      type="date" 
                      value={row.date} 
                      onChange={(e) => onDateChange(row.key, e.target.value)} 
                      className="bg-zinc-800 text-white p-2 rounded-lg text-xs w-full"
                    />
                )}
                
                {weightType === 'leche' && (
                  isActionLoading ? (
                      <Loader2 className="animate-spin text-zinc-400" size={20} />
                  ) : (
                      <>
                          <button
                              type="button"
                              onClick={() => onStartDrying(row.animalId)}
                              disabled={!activeParturition || activeParturition.status !== 'activa' || isLoading}
                              title="Iniciar Secado"
                              className="p-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <Wind size={16} />
                          </button>
                          <button
                              type="button"
                              onClick={() => onSetDry(row.animalId)}
                              disabled={!activeParturition || activeParturition.status === 'seca' || activeParturition.status === 'finalizada' || isLoading}
                              title="Declarar Seca"
                              className="p-2 bg-gray-600/20 text-gray-300 rounded-lg hover:bg-gray-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <Archive size={16} />
                          </button>
                      </>
                  )
                )}
            </div>
        </div>
        {/* Mensaje de Validación */}
        {row.message && (
            <div className="flex items-center gap-2 mt-1 px-2">
                {statusIcon}
                <p className="text-xs text-zinc-400 truncate">{row.message}</p>
            </div>
        )}
    </div>
  );
};