// src/pages/AddParturitionPage.tsx

import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
// CORRECCIÓN: Se añaden de nuevo los íconos para los mensajes
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

const parturitionTypes = [
    { count: 1, name: 'Simple' },
    { count: 2, name: 'Doble' },
    { count: 3, name: 'Triple' },
    { count: 4, name: 'Cuádruple' },
    { count: 5, name: 'Quíntuple' },
];

interface OffspringState {
    sex: 'Hembra' | 'Macho';
    correlative: string;
    birthWeight: string;
}

export default function AddParturitionPage({ onBack }: { onBack: () => void }) {
    const { fathers, addParturition } = useData();
    const [motherId, setMotherId] = useState('');
    const [parturitionDate, setParturitionDate] = useState(new Date().toISOString().split('T')[0]);
    const [fatherId, setFatherId] = useState('');
    const [offspringCount, setOffspringCount] = useState(1);
    const [offspring, setOffspring] = useState<OffspringState[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setOffspring(currentOffspring => {
            const newOffspring = [...currentOffspring];
            while (newOffspring.length < offspringCount) {
                newOffspring.push({ sex: 'Hembra', correlative: '', birthWeight: '' });
            }
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
        const selectedFather = fathers.find(f => f.id === fatherId);
        if (!selectedFather) {
            setMessage({ type: 'error', text: 'Debe seleccionar un padre.' });
            return;
        }

        try {
            const finalOffspring = offspring.map(kid => {
                const prefix = kid.sex === 'Macho' ? 'X' : selectedFather.name.charAt(0).toUpperCase();
                return { ...kid, id: `${prefix}${kid.correlative}` };
            });

            await addParturition({
                motherId,
                parturitionDate,
                sireId: fatherId,
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
        if (!kid.correlative || !selectedFather) return '';
        const prefix = kid.sex === 'Macho' ? 'X' : selectedFather.name.charAt(0).toUpperCase();
        return `${prefix}${kid.correlative}`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
            <header className="flex items-center pt-8 pb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                <div className="text-center flex-grow">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Registrar Parto</h1>
                    <p className="text-xl text-zinc-400">Y sus crías</p>
                </div>
                <div className="w-8"></div>
            </header>

            <form onSubmit={handleSubmit} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-6 border border-brand-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={motherId} onChange={e => setMotherId(e.target.value)} placeholder="ID de la Madre" className="w-full bg-black/20 p-3 rounded-lg border border-transparent focus:border-brand-amber focus:ring-0" required />
                    <input type="date" value={parturitionDate} onChange={e => setParturitionDate(e.target.value)} className="w-full bg-black/20 p-3 rounded-lg border border-transparent focus:border-brand-amber focus:ring-0" required />
                    <select value={fatherId} onChange={e => setFatherId(e.target.value)} className="w-full bg-black/20 p-3 rounded-lg border border-transparent focus:border-brand-amber focus:ring-0" required>
                        <option value="">Seleccione el Padre</option>
                        {fathers.map(father => <option key={father.id} value={father.id}>{father.name}</option>)}
                    </select>
                    <select value={offspringCount} onChange={e => setOffspringCount(Number(e.target.value))} className="w-full bg-black/20 p-3 rounded-lg border border-transparent focus:border-brand-amber focus:ring-0" required>
                        {parturitionTypes.map(pt => <option key={pt.count} value={pt.count}>Parto {pt.name} ({pt.count})</option>)}
                    </select>
                </div>

                <div className="space-y-4 pt-4 border-t border-brand-border">
                    {offspring.map((kid, index) => (
                        <div key={index} className="p-3 bg-black/20 rounded-lg space-y-3">
                            <p className="font-semibold text-brand-amber">Cría {index + 1}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">Sexo</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center"><input type="radio" name={`sex-${index}`} value="Hembra" checked={kid.sex === 'Hembra'} onChange={() => handleOffspringChange(index, 'sex', 'Hembra')} className="form-radio text-brand-amber" /> <span className="ml-2">Hembra</span></label>
                                        <label className="flex items-center"><input type="radio" name={`sex-${index}`} value="Macho" checked={kid.sex === 'Macho'} onChange={() => handleOffspringChange(index, 'sex', 'Macho')} className="form-radio text-brand-amber" /> <span className="ml-2">Macho</span></label>
                                    </div>
                                </div>
                                <input type="text" value={kid.correlative} onChange={e => handleOffspringChange(index, 'correlative', e.target.value)} placeholder="Nº Correlativo" className="w-full bg-black/30 p-3 rounded-lg" required />
                                <input type="text" value={generateId(kid)} readOnly placeholder="ID Generado" className="w-full bg-black/50 p-3 rounded-lg text-zinc-400 cursor-not-allowed" />
                                <input type="number" step="0.1" value={kid.birthWeight} onChange={e => handleOffspringChange(index, 'birthWeight', e.target.value)} placeholder="Peso al Nacer (Kg)" className="w-full bg-black/30 p-3 rounded-lg" required />
                            </div>
                        </div>
                    ))}
                </div>

                <button type="submit" className="w-full bg-brand-amber text-black font-bold py-3 rounded-lg">Guardar Registro</button>
                
                {/* CORRECCIÓN: Se vuelve a añadir el bloque para mostrar mensajes */}
                {message && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}
            </form>
        </div>
    );
}