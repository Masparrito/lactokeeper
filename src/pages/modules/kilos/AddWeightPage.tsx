// src/pages/modules/kilos/AddWeightPage.tsx

import { useState } from 'react';
import { Zap, ScanLine } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import BatchImportPage, { OcrResult } from '../../BatchImportPage';
import { BatchWeighingForm } from '../../../components/forms/BatchWeighingForm';
import { RapidWeighingSession } from '../../../components/forms/RapidWeighingSession';

// --- Componente de Opciones (El Hub) ---
const EntryOptions = ({ onSelectMode }: { onSelectMode: (mode: 'rapid' | 'scan') => void }) => (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pt-4">
        <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-c-text-strong">Añadir Pesaje Corporal</h1>
            <p className="text-lg text-c-text-muted">Carga de Datos de Crecimiento</p>
        </header>
        <div className="space-y-4">
            <button onClick={() => onSelectMode('rapid')} className="w-full bg-c-surface backdrop-blur-xl border border-c-border hover:border-c-accent text-c-text p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <Zap className="w-12 h-12 mb-2 text-c-accent" />
                <span className="text-lg font-semibold">Carga Rápida</span>
                <span className="text-sm font-normal text-c-text-muted">Cada pesaje se guarda al instante</span>
            </button>
            <button onClick={() => onSelectMode('scan')} className="w-full bg-c-surface backdrop-blur-xl border border-c-border hover:border-c-accent-sky text-c-text p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <ScanLine className="w-12 h-12 mb-2 text-c-accent-sky" />
                <span className="text-lg font-semibold">Escanear Cuaderno</span>
                <span className="text-sm font-normal text-c-text-muted">Digitalización asistida por IA</span>
            </button>
        </div>
    </div>
);

export default function AddWeightPage({ onSaveSuccess }: { onSaveSuccess: (date: string) => void; }) {
    const [mode, setMode] = useState<'options' | 'rapid' | 'scan' | 'validate'>('options');
    const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
    const [ocrDefaultDate, setOcrDefaultDate] = useState('');

    const handleOcrSuccess = (results: OcrResult[], defaultDate: string) => {
        setOcrResults(results);
        setOcrDefaultDate(defaultDate);
        setMode('validate');
    };

    const handleBackToOptions = () => { setMode('options'); setOcrResults([]); setOcrDefaultDate(''); };

    switch (mode) {
        case 'rapid':
            return <RapidWeighingSession weightType="corporal" onSaveSuccess={onSaveSuccess} onBack={handleBackToOptions} />;

        case 'scan':
            return <BatchImportPage importType="corporal" onBack={handleBackToOptions} onImportSuccess={handleOcrSuccess} />;

        case 'validate':
            return (
                <Modal isOpen={true} onClose={handleBackToOptions} title="Verificar Datos de IA (Corporal)" size="fullscreen">
                    <BatchWeighingForm
                        weightType="corporal"
                        importedData={ocrResults}
                        defaultDate={ocrDefaultDate}
                        onSaveSuccess={() => { handleBackToOptions(); onSaveSuccess(ocrDefaultDate); }}
                        onCancel={handleBackToOptions}
                    />
                </Modal>
            );

        case 'options':
        default:
            return <EntryOptions onSelectMode={(m) => setMode(m)} />;
    }
}
