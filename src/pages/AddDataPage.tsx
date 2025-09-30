// src/pages/AddDataPage.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PlusCircle, ScanLine, CheckCircle, AlertTriangle, ArrowLeft, Zap, Feather, X, Save, ShieldAlert } from 'lucide-react';
import { Weighing } from '../db/local';
import { db } from '../db/local';

// --- Formulario de Entrada Individual ---
const ManualEntryForm = ({ onBack }: { onBack: () => void }) => {
  const { addWeighing, fetchData } = useData();
  const [goatId, setGoatId] = useState('');
  const [kg, setKg] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goatId || !kg) {
      setMessage({ type: 'error', text: 'El ID y los Kg son obligatorios.' });
      return;
    }
    const newEntry: Weighing = {
        goatId: goatId.toUpperCase().trim(),
        kg: parseFloat(kg),
        date: new Date().toISOString().split('T')[0]
    };
    try {
      // @ts-ignore
      await addWeighing(newEntry);
      setMessage({ type: 'success', text: `Pesaje para ${goatId.toUpperCase().trim()} añadido.` });
      setGoatId('');
      setKg('');
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudo guardar el pesaje.' });
      console.error(err);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
      <div className="flex items-center border-b border-brand-border pb-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mx-auto pr-8">
          Entrada Individual
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={goatId}
          onChange={(e) => setGoatId(e.target.value)}
          placeholder="ID del Animal"
          className="w-full bg-black/20 text-white text-lg placeholder-zinc-500 p-4 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none transition-colors"
        />
        <input
          type="number"
          step="0.01"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="Producción en Kg"
          className="w-full bg-black/20 text-white text-lg placeholder-zinc-500 p-4 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none transition-colors"
        />
        <button type="submit" className="w-full bg-brand-amber hover:bg-yellow-500 text-black font-bold py-4 px-4 rounded-xl transition-colors text-lg">
          Guardar Pesaje
        </button>
        {message && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
      </form>
    </div>
  );
};

// --- Fila de la lista, ahora maneja animales no reconocidos ---
const EntryRow = ({ entry, onDelete, onRegister }: { entry: any, onDelete: (tempId: number) => void, onRegister: (animalId: string) => void }) => {
    const isUnrecognized = entry.isUnrecognized;

    return (
        <div className={`p-3 rounded-lg flex justify-between items-center animate-fade-in group ${isUnrecognized ? 'bg-red-900/40 border border-red-500/50' : 'bg-black/20'}`}>
            <div className="flex items-center space-x-2">
                {isUnrecognized && <AlertTriangle className="text-amber-400 flex-shrink-0" size={18} />}
                <span className="font-semibold text-white">{entry.goatId}</span>
            </div>
            <div className="flex items-center space-x-3">
                {isUnrecognized ? (
                    <button onClick={() => onRegister(entry.goatId)} className="text-xs font-semibold bg-amber-500 text-black px-2 py-1 rounded-md hover:bg-amber-400">
                        Registrar Parto
                    </button>
                ) : (
                    <span className="text-zinc-300 font-semibold">{entry.kg.toFixed(2)} Kg</span>
                )}
                 <button onClick={() => onDelete(entry.tempId)} className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={16}/>
                </button>
            </div>
        </div>
    );
};


// --- Formulario de Entrada Rápida con la nueva lógica de carga por lotes ---
const RapidEntryForm = ({ onBack, onNavigate }: { onBack: () => void, onNavigate: (page: 'add-parturition', state: { motherId: string }) => void }) => {
    const { animals, fetchData } = useData();
    const [currentId, setCurrentId] = useState('');
    const [currentKg, setCurrentKg] = useState('');
    const [sessionEntries, setSessionEntries] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const idInputRef = useRef<HTMLInputElement>(null);
    const kgInputRef = useRef<HTMLInputElement>(null);
    
    const animalIdSet = useMemo(() => new Set(animals.map(a => a.id)), [animals]);

    useEffect(() => { idInputRef.current?.focus(); }, []);

    // 1. Añade el pesaje a la lista temporal en pantalla
    const handleAddToList = () => {
        if (!currentId || !currentKg) return;
        
        const id = currentId.toUpperCase().trim();
        const newEntry = {
            tempId: Date.now(),
            goatId: id,
            kg: parseFloat(currentKg),
            date: new Date().toISOString().split('T')[0],
            isUnrecognized: !animalIdSet.has(id)
        };

        setSessionEntries(prev => [newEntry, ...prev]);
        setCurrentId('');
        setCurrentKg('');
        idInputRef.current?.focus();
    };
    
    // 2. Guarda el lote completo en la base de datos
    const handleFinalSave = async () => {
        setMessage(null);
        const unrecognizedCount = sessionEntries.filter(e => e.isUnrecognized).length;

        if (unrecognizedCount > 0) {
            setMessage({ type: 'error', text: `No se puede guardar. Tienes ${unrecognizedCount} animal(es) sin registrar.` });
            return;
        }
        
        if (sessionEntries.length === 0) {
            setMessage({ type: 'error', text: 'No hay pesajes en la lista para guardar.' });
            return;
        }

        try {
            const weighingsToSave = sessionEntries.map(({ goatId, kg, date }) => ({ goatId, kg, date }));
            await db.weighings.bulkAdd(weighingsToSave);
            
            setMessage({ type: 'success', text: `${sessionEntries.length} pesajes guardados con éxito.` });
            setSessionEntries([]); 
            await fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: 'Ocurrió un error al guardar los datos.' });
            console.error(error);
        }
    };
    
    const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentId) {
            e.preventDefault();
            kgInputRef.current?.focus();
        }
    };

    const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentKg) {
            e.preventDefault();
            handleAddToList();
        }
    };

    const handleDeleteFromList = (tempId: number) => {
        setSessionEntries(prev => prev.filter(e => e.tempId !== tempId));
    };

    const handleRegister = (animalId: string) => {
        onNavigate('add-parturition', { motherId: animalId });
    };

    return (
        <>
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in space-y-4">
                <div className="flex items-center border-b border-brand-border pb-2">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mx-auto pr-8">Entrada Rápida</h2>
                </div>
                
                <div className="flex items-center gap-2">
                    <input ref={idInputRef} type="text" value={currentId} onChange={(e) => setCurrentId(e.target.value)} onKeyDown={handleIdKeyDown} placeholder="ID Animal" className="w-full bg-black/20 text-white text-lg placeholder-zinc-500 p-4 rounded-xl border-2 border-transparent focus:border-amber-500 focus:ring-0 focus:outline-none"/>
                    <input ref={kgInputRef} type="number" step="0.01" value={currentKg} onChange={(e) => setCurrentKg(e.target.value)} onKeyDown={handleKgKeyDown} placeholder="Kg" className="w-32 flex-shrink-0 bg-black/20 text-white text-lg placeholder-zinc-500 p-4 rounded-xl border-2 border-transparent focus:border-amber-500 focus:ring-0 focus:outline-none"/>
                    <button onClick={handleAddToList} disabled={!currentId || !currentKg} aria-label="Añadir a la lista" className="aspect-square h-full bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"><PlusCircle size={24} /></button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border-t border-b border-brand-border py-2">
                    {sessionEntries.length === 0 && <p className="text-center text-zinc-500 text-sm">Los pesajes añadidos aparecerán aquí.</p>}
                    {sessionEntries.map((entry) => (
                        <EntryRow 
                            key={entry.tempId} 
                            entry={entry}
                            onDelete={handleDeleteFromList}
                            onRegister={handleRegister}
                        />
                    ))}
                </div>
                
                <button onClick={handleFinalSave} className="w-full flex items-center justify-center gap-2 bg-brand-amber hover:bg-yellow-500 text-black font-bold py-4 px-4 rounded-xl transition-colors text-lg">
                    <Save size={20} />
                    Guardar {sessionEntries.length > 0 ? `(${sessionEntries.length})` : ''} Pesajes
                </button>
                
                {message && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}
            </div>
        </>
    );
};


// --- Página Principal de Captura de Datos ---
export default function AddDataPage({ onNavigate }: { onNavigate: (page: 'add-parturition', state?: any) => void; }) {
  const [entryMode, setEntryMode] = useState<'options' | 'manual' | 'ocr' | 'rapid'>('options');

  const keyForAnimation = entryMode === 'options' ? 'options' : 'form';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <header className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Añadir Datos</h1>
        <p className="text-xl text-zinc-400">Captura de Producción</p>
      </header>

      <div key={keyForAnimation}>
        {entryMode === 'options' && (
          <div className="space-y-4 animate-fade-in">
            <button 
              onClick={() => setEntryMode('rapid')} 
              className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-amber-400 text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
              <Zap className="w-12 h-12 mb-2 text-amber-400" />
              <span className="text-lg font-semibold">Entrada Rápida</span>
              <span className="text-sm font-normal text-zinc-400">Para carga masiva con teclado</span>
            </button>
            
            <button 
              onClick={() => onNavigate('add-parturition')} 
              className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-green-400 text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
              <Feather className="w-12 h-12 mb-2 text-green-400" />
              <span className="text-lg font-semibold">Registrar Parto</span>
              <span className="text-sm font-normal text-zinc-400">Inicia una nueva lactancia</span>
            </button>

            <button 
              onClick={() => setEntryMode('manual')} 
              className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-gray-500 text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
              <PlusCircle className="w-12 h-12 mb-2" />
              <span className="text-lg font-semibold">Entrada Individual</span>
              <span className="text-sm font-normal text-zinc-400">Formulario tradicional</span>
            </button>
            
            <button 
              onClick={() => setEntryMode('ocr')} 
              className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-amber text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
              <ScanLine className="w-12 h-12 mb-2 text-brand-amber" />
              <span className="text-lg font-semibold">Escanear Cuaderno</span>
              <span className="text-sm font-normal text-zinc-400">La forma más rápida (Próximamente)</span>
            </button>
          </div>
        )}

        {entryMode === 'rapid' && <RapidEntryForm onBack={() => setEntryMode('options')} onNavigate={onNavigate} />}
        {entryMode === 'manual' && <ManualEntryForm onBack={() => setEntryMode('options')} />}
        {entryMode === 'ocr' && (
           <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border text-center animate-fade-in">
              <h2 className="text-lg text-brand-amber">Función Próximamente</h2>
              <p className="text-zinc-400">La captura por OCR estará disponible pronto.</p>
               <button onClick={() => setEntryMode('options')} className="w-full text-center text-zinc-40T4 text-sm hover:text-white">
                  Volver
              </button>
           </div>
        )}
      </div>
    </div>
  );
}