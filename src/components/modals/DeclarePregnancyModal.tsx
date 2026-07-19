import { useState } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { GiEmbryo } from 'react-icons/gi';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';

interface DeclarePregnancyModalProps {
    isOpen: boolean;
    onClose: () => void;
    animal: Animal;
}

/**
 * Acción rápida para declarar preñez SIN necesidad de una temporada de monta.
 * Pensada para operaciones que confirman preñez por palpación/eco o por
 * conocimiento directo, y que no usan el flujo de temporadas/servicios.
 */
export const DeclarePregnancyModal = ({ isOpen, onClose, animal }: DeclarePregnancyModalProps) => {
    const { updateAnimal } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // updateAnimal registra automáticamente el evento "Cambio de Estado".
            await updateAnimal(animal.id, { reproductiveStatus: 'Preñada' });
            onClose();
        } catch (error) {
            console.error('Error al declarar preñez:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            <div className="bg-c-surface border-t sm:border border-c-border w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-6 shadow-2xl transform transition-all pb-10 sm:pb-6 relative overflow-hidden">

                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-c-text flex items-center gap-2">
                            <GiEmbryo className="text-brand-green" size={22} />
                            Declarar Preñada
                        </h2>
                        <p className="text-sm text-c-text-muted mt-1">
                            Confirmar preñez de <span className="text-c-text font-mono font-bold">{animal.id.toUpperCase()}</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-c-surface-2 rounded-full text-c-text-muted hover:text-c-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-brand-green/10 border border-brand-green/20 p-3 rounded-xl flex gap-3 items-start">
                    <AlertCircle className="text-brand-green shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-c-text-muted leading-relaxed">
                        El animal pasará a estado <strong className="text-brand-green">Preñada</strong>. Útil cuando confirmas
                        preñez por palpación/eco sin usar temporada de monta.
                    </p>
                </div>

                <div className="pt-1">
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full bg-brand-green hover:brightness-110 text-white font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(34,139,78,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                    >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Confirmar Preñez</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
