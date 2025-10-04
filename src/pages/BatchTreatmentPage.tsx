import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, TestTube, CheckCircle, AlertTriangle } from 'lucide-react';
import { Event } from '../db/local';

// Sub-componente para mostrar una tarjeta de un tratamiento aplicado
const TreatmentCard = ({ event }: { event: Event }) => {
    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <p className="font-semibold text-white">{event.details}</p>
            <p className="text-sm text-zinc-400 mt-1">
                Aplicado el: {new Date(event.date + 'T00:00:00').toLocaleDateString('es-VE')}
            </p>
        </div>
    );
};

interface BatchTreatmentPageProps {
    lotName: string;
    onBack: () => void;
}

export default function BatchTreatmentPage({ lotName, onBack }: BatchTreatmentPageProps) {
    const { events, addBatchEvent } = useData();
    const [details, setDetails] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const treatmentsForLot = useMemo(() => {
        // Se agrupan los eventos por fecha y detalle para no mostrar uno por cada animal
        const groupedEvents = events
            .filter(e => e.lotName === lotName && e.type === 'Tratamiento')
            .reduce((acc, current) => {
                const key = `${current.date}-${current.details}`;
                if (!acc[key]) {
                    acc[key] = current;
                }
                return acc;
            }, {} as Record<string, Event>);

        // Se convierte el objeto de vuelta a un array y se ordena por fecha
        return Object.values(groupedEvents)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
    }, [events, lotName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!details.trim()) {
            setMessage({ type: 'error', text: 'Los detalles del tratamiento no pueden estar vacíos.' });
            return;
        }

        try {
            await addBatchEvent({
                lotName,
                details,
                date,
                type: 'Tratamiento',
            });
            setMessage({ type: 'success', text: 'Tratamiento registrado con éxito para todo el lote.' });
            setDetails('');
        } catch (error) {
            setMessage({ type: 'error', text: 'No se pudo registrar el tratamiento.' });
            console.error(error);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
            <header className="flex items-center pt-8 pb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Tratamientos: {lotName}</h1>
                    <p className="text-lg text-zinc-400">Sanidad Colectiva del Lote</p>
                </div>
                <div className="w-8"></div>
            </header>

            <form onSubmit={handleSubmit} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Plus size={20} /> Registrar Tratamiento al Lote
                </h3>
                <div>
                    <label htmlFor="treatmentDetails" className="block text-sm font-medium text-zinc-400 mb-1">Detalles del Tratamiento (Ej: Vacuna Triple)</label>
                    <textarea 
                        id="treatmentDetails"
                        rows={3}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"
                    />
                </div>
                <div>
                    <label htmlFor="treatmentDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Aplicación</label>
                    <input 
                        id="treatmentDate"
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"
                    />
                </div>
                <button type="submit" className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg transition-colors">
                    Guardar Tratamiento
                </button>
                {message && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}
            </form>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 px-2 flex items-center gap-2">
                    <TestTube size={20} /> Historial de Tratamientos del Lote
                </h3>
                {treatmentsForLot.length > 0 ? (
                    <div className="space-y-2">
                        {treatmentsForLot.map(event => <TreatmentCard key={event.id as string} event={event} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay tratamientos registrados para este lote.</p>
                    </div>
                )}
            </div>
        </div>
    );
}