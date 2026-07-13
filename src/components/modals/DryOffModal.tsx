// src/components/modals/DryOffModal.tsx
// Motor ÚNICO de secado: declarar una lactancia como seca SIEMPRE pidiendo la
// fecha (incluso desde accesos rápidos). Se usa en todos los puntos de secado.
import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useData } from '../../context/DataContext';

interface DryOffModalProps {
    isOpen: boolean;
    onClose: () => void;
    parturitionId: string | null;
    onDone?: () => void;
}

export function DryOffModal({ isOpen, onClose, parturitionId, onDone }: DryOffModalProps) {
    const { parturitions, animals, setLactationAsDry } = useData();
    const today = new Date().toISOString().split('T')[0];

    const part = parturitions.find(p => p.id === parturitionId) || null;
    const animal = part ? animals.find(a => a.id === part.goatId) : null;

    const [date, setDate] = useState(today);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) { setDate(part?.dryingStartDate || today); setError(''); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, parturitionId]);

    const handleSave = async () => {
        if (!parturitionId || !part) { onClose(); return; }
        if (!date) { setError('Elige la fecha de secado.'); return; }
        if (date < part.parturitionDate) { setError('La fecha no puede ser anterior al parto.'); return; }
        if (date > today) { setError('La fecha no puede ser futura.'); return; }
        setError('');
        setSaving(true);
        try {
            await setLactationAsDry(parturitionId, date);
            onDone?.();
            onClose();
        } catch (e: any) {
            setError(e?.message || 'No se pudo declarar el secado.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Declarar secado">
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-c-surface-2 text-c-text-muted flex items-center justify-center flex-shrink-0"><Archive size={20} /></div>
                    <p className="text-sm text-c-text-muted">
                        Indica la fecha en que {animal ? <span className="font-mono font-bold text-c-text">{animal.id.toUpperCase()}</span> : 'la cabra'} fue secada.
                        {part ? <span className="block text-xs text-c-text-faint mt-0.5">Lactancia del parto {part.parturitionDate}.</span> : null}
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-c-text-muted mb-1">Fecha de secado</label>
                    <input type="date" value={date} min={part?.parturitionDate} max={today} onChange={e => setDate(e.target.value)}
                        className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-c-accent-sky hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50">
                        {saving ? 'Guardando…' : 'Declarar seca'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
