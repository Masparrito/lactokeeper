// src/pages/AddParturitionPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, CheckCircle, AlertTriangle, User, Users, Plus, ChevronDown } from 'lucide-react';
import { AddFatherModal } from '../components/ui/AddFatherModal';
import { Father } from '../db/local';

// --- Sub-componentes y tipos (sin cambios) ---
const parturitionTypes = [
    { count: 1, name: 'Simple' }, { count: 2, name: 'Doble' },
    { count: 3, name: 'Triple' }, { count: 4, name: 'Cuádruple' }, { count: 5, name: 'Quíntuple' },
];
interface OffspringState { sex: 'Hembra' | 'Macho'; correlative: string; birthWeight: string; }
const SexSelector = ({ value, onChange }: { value: 'Hembra' | 'Macho', onChange: (sex: 'Hembra' | 'Macho') => void }) => (
    <div className="flex bg-zinc-800/80 rounded-xl p-1 w-full">
        <button type="button" onClick={() => onChange('Hembra')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${value === 'Hembra' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>Hembra</button>
        <button type="button" onClick={() => onChange('Macho')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${value === 'Macho' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>Macho</button>
    </div>
);

// --- Componente principal de la página ---
export default function AddParturitionPage({ onBack, motherId: initialMotherId }: { onBack: () => void, motherId?: string }) {
    const { fathers, addParturition, addFather } = useData();
    const [motherId, setMotherId] = useState(initialMotherId || '');
    const [parturitionDate, setParturitionDate] = useState(new Date().toISOString().split('T')[0]);
    const [fatherId, setFatherId] = useState('');
    const [offspringCount, setOffspringCount] = useState(1);
    const [offspring, setOffspring] = useState<OffspringState[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    useEffect(() => {
        setOffspring(currentOffspring => {
            const newOffspring = [...currentOffspring];
            while (newOffspring.length < offspringCount) { newOffspring.push({ sex: 'Hembra', correlative: '', birthWeight: '' }); }
            return newOffspring.slice(0, offspringCount);
        });
    }, [offspringCount]);

    const handleOffspringChange = (index: number, field: keyof OffspringState, value: string) => {
        const updatedOffspring = [...offspring];
        updatedOffspring[index] = { ...updatedOffspring[index], [field]: value };
        setOffspring(updatedOffspring);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const isOffspringDataComplete = offspring.every(kid => kid.correlative && kid.birthWeight);
        if (!motherId || !parturitionDate || !fatherId || !isOffspringDataComplete) {
            setMessage({ type: 'error', text: 'Por favor, completa todos los campos requeridos.' });
            return;
        }
        try {
            const selectedFather = fathers.find(f => f.id === fatherId);
            const finalOffspring = offspring.map(kid => {
                const prefix = kid.sex === 'Macho' ? 'X' : selectedFather!.name.charAt(0).toUpperCase();
                return { ...kid, id: `${prefix}${kid.correlative}` };
            });
            await addParturition({
                motherId: motherId.toUpperCase(), parturitionDate, sireId: fatherId,
                parturitionType: parturitionTypes.find(p => p.count === offspringCount)?.name,
                offspring: finalOffspring,
            });
            setMessage({ type: 'success', text: 'Parto y crías registrados con éxito.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al registrar el parto.' });
            console.error(err);
        }
    };
    
    const generateId = (kid: OffspringState) => {
        const selectedFather = fathers.find(f => f.id === fatherId);
        if (!kid.correlative || !selectedFather) return 'ID se genera aquí';
        const prefix = kid.sex === 'Macho' ? 'X' : selectedFather.name.charAt(0).toUpperCase();
        return `${prefix}${kid.correlative}`;
    };

    const handleSaveFather = async (newFather: Father) => {
        await addFather(newFather);
        setFatherId(newFather.id);
        setIsFatherModalOpen(false);
    };
    
    const selectedFatherName = useMemo(() => fathers.find(f => f.id === fatherId)?.name, [fatherId, fathers]);
    const handleSelectFather = (id: string) => {
        setFatherId(id);
        setIsAccordionOpen(false);
    };

    const InputField = (props: React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement>) => ( <input {...props} className="w-full bg-zinc-800/80 text-white p-3 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none placeholder-zinc-400" /> );
    const SelectField = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => ( <select {...props} className="w-full bg-zinc-800/80 text-white p-3 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none" /> );

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow"><h1 className="text-4xl font-bold tracking-tight text-white">Registrar Parto</h1><p className="text-xl text-zinc-400">Y sus crías</p></div>
                    <div className="w-8"></div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-300 tracking-tight flex items-center gap-2"><User size={20}/> Datos del Parto</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="text" value={motherId} onChange={e => setMotherId(e.target.value)} placeholder="ID de la Madre" required />
                            <InputField type="date" value={parturitionDate} onChange={e => setParturitionDate(e.target.value)} required />
                            <div className="relative md:col-span-1">
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setIsAccordionOpen(!isAccordionOpen)} className="w-full flex justify-between items-center text-left bg-zinc-800/80 text-white p-3 rounded-xl">
                                        <span className={selectedFatherName ? 'text-white' : 'text-zinc-400'}>{selectedFatherName || 'Seleccione el Padre'}</span>
                                        <ChevronDown className={`transition-transform ${isAccordionOpen ? 'rotate-180' : ''}`} size={20} />
                                    </button>
                                    <button type="button" onClick={() => setIsFatherModalOpen(true)} className="h-full aspect-square flex-shrink-0 bg-indigo-600/80 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500" aria-label="Añadir nuevo padre"><Plus size={20} /></button>
                                </div>
                                {isAccordionOpen && (
                                    <div className="absolute z-10 top-full mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl max-h-48 overflow-y-auto">
                                        {fathers.map(father => ( <button type="button" key={father.id} onClick={() => handleSelectFather(father.id)} className="w-full text-left p-3 hover:bg-zinc-700">{father.name}</button> ))}
                                    </div>
                                )}
                            </div>
                            <SelectField value={offspringCount} onChange={e => setOffspringCount(Number(e.target.value))} required>
                                {parturitionTypes.map(pt => <option key={pt.count} value={pt.count}>Parto {pt.name} ({pt.count})</option>)}
                            </SelectField>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-300 tracking-tight flex items-center gap-2 ml-1"><Users size={20}/> Registro de Crías</h2>
                        {offspring.map((kid, index) => (
                            <div key={index} className="bg-black/20 rounded-2xl p-4 border border-zinc-800/50 space-y-4">
                                <p className="font-semibold text-brand-amber">Cría {index + 1}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <SexSelector value={kid.sex} onChange={(sex) => handleOffspringChange(index, 'sex', sex)} />
                                    <InputField type="text" value={kid.correlative} onChange={e => handleOffspringChange(index, 'correlative', e.target.value)} placeholder="Nº Correlativo" required />
                                    <div className="bg-zinc-800/80 p-3 rounded-xl h-full flex items-center"><span className="text-sm font-semibold text-zinc-400 mr-2">ID:</span><span className="font-mono text-indigo-300 font-bold">{generateId(kid)}</span></div>
                                    <InputField type="number" step="0.1" value={kid.birthWeight} onChange={e => handleOffspringChange(index, 'birthWeight', e.target.value)} placeholder="Peso al Nacer (Kg)" required />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <button type="submit" className="w-full bg-brand-amber text-black font-bold py-4 rounded-xl text-lg">Guardar Registro</button>
                        {message && (
                            <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {(() => {
                                    // --- CORRECCIÓN DE SINTAXIS ---
                                    const Icon = message.type === 'success' ? CheckCircle : AlertTriangle;
                                    return <Icon size={18} />;
                                })()}
                                <span>{message.text}</span>
                            </div>
                        )}
                    </div>
                </form>
            </div>
            <AddFatherModal 
                isOpen={isFatherModalOpen}
                onClose={() => setIsFatherModalOpen(false)}
                onSave={handleSaveFather}
            />
        </>
    );
}