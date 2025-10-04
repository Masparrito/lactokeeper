import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, ClipboardList, CheckCircle, AlertTriangle } from 'lucide-react';
import { FeedingPlan } from '../db/local';

// Sub-componente para mostrar una tarjeta de plan de alimentación
const FeedingPlanCard = ({ plan }: { plan: FeedingPlan }) => {
    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <p className="font-semibold text-white">{plan.details}</p>
            <p className="text-sm text-zinc-400 mt-1">
                Iniciado el: {new Date(plan.startDate + 'T00:00:00').toLocaleDateString('es-VE')}
            </p>
        </div>
    );
};

interface FeedingPlanPageProps {
    lotName: string;
    onBack: () => void;
}

export default function FeedingPlanPage({ lotName, onBack }: FeedingPlanPageProps) {
    const { feedingPlans, addFeedingPlan } = useData();
    const [details, setDetails] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filtramos los planes para mostrar solo los del lote actual
    const plansForLot = useMemo(() => {
        return feedingPlans
            .filter(p => p.lotName === lotName)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [feedingPlans, lotName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details.trim()) {
            setMessage({ type: 'error', text: 'Los detalles del plan no pueden estar vacíos.' });
            return;
        }

        try {
            await addFeedingPlan({
                lotName,
                details,
                startDate,
            });
            setMessage({ type: 'success', text: 'Plan de alimentación guardado con éxito.' });
            setDetails(''); // Limpiamos el formulario
        } catch (error) {
            setMessage({ type: 'error', text: 'No se pudo guardar el plan.' });
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
                    <h1 className="text-3xl font-bold tracking-tight text-white">Alimentación: {lotName}</h1>
                    <p className="text-lg text-zinc-400">Planes de Nutrición del Lote</p>
                </div>
                <div className="w-8"></div>
            </header>

            {/* Formulario para añadir un nuevo plan */}
            <form onSubmit={handleSubmit} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Plus size={20} /> Asignar Nuevo Plan
                </h3>
                <div>
                    <label htmlFor="planDetails" className="block text-sm font-medium text-zinc-400 mb-1">Detalles del Plan (Ej: 2kg de concentrado/día)</label>
                    <textarea 
                        id="planDetails"
                        rows={3}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"
                    />
                </div>
                <div>
                    <label htmlFor="planStartDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Inicio</label>
                    <input 
                        id="planStartDate"
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"
                    />
                </div>
                <button type="submit" className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg transition-colors">
                    Guardar Plan
                </button>
                {message && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}
            </form>

            {/* Lista de planes existentes */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 px-2 flex items-center gap-2">
                    <ClipboardList size={20} /> Historial de Planes
                </h3>
                {plansForLot.length > 0 ? (
                    <div className="space-y-2">
                        {plansForLot.map(plan => <FeedingPlanCard key={plan.id} plan={plan} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay planes de alimentación registrados para este lote.</p>
                    </div>
                )}
            </div>
        </div>
    );
}