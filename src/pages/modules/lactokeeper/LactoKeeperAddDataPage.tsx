// src/pages/modules/lactokeeper/LactoKeeperAddDataPage.tsx

import { useState } from 'react';
import { Zap, ScanLine } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import BatchImportPage, { OcrResult } from '../../BatchImportPage';
import { BatchWeighingForm } from '../../../components/forms/BatchWeighingForm';
import { RapidWeighingSession } from '../../../components/forms/RapidWeighingSession';

// --- Componente de Opciones (El Hub) ---
const EntryOptions = ({ onSelectMode }: { onSelectMode: (mode: 'rapid' | 'scan') => void }) => (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-c-text-strong text-center">Añadir Datos de Leche</h1>
        <div className="space-y-4">
            <button onClick={() => onSelectMode('rapid')} className="w-full bg-c-surface backdrop-blur-xl border border-c-border hover:border-c-accent-sky shadow-sm text-c-text p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <Zap className="w-12 h-12 mb-2 text-c-accent-sky" />
                <span className="text-lg font-semibold">Carga Rápida</span>
                <span className="text-sm font-normal text-c-text-muted">Cada pesaje se guarda al instante</span>
            </button>
            <button onClick={() => onSelectMode('scan')} className="w-full bg-c-surface backdrop-blur-xl border border-c-border hover:border-c-accent-sky shadow-sm text-c-text p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <ScanLine className="w-12 h-12 mb-2 text-c-accent-sky" />
                <span className="text-lg font-semibold">Escanear Cuaderno</span>
                <span className="text-sm font-normal text-c-text-muted">Digitalización asistida por IA</span>
            </button>
        </div>
    </div>
);

export interface LactoKeeperAddDataPageProps {
    onSaveSuccess: () => void;
}

export default function LactoKeeperAddDataPage({ onSaveSuccess }: LactoKeeperAddDataPageProps) {
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
            return <RapidWeighingSession weightType="leche" onSaveSuccess={onSaveSuccess} onBack={handleBackToOptions} />;

        case 'scan':
            return <BatchImportPage importType="leche" onBack={handleBackToOptions} onImportSuccess={handleOcrSuccess} />;

        case 'validate':
            return (
                <Modal isOpen={true} onClose={handleBackToOptions} title="Verificar Datos de IA (Leche)" size="fullscreen">
                    <BatchWeighingForm
                        weightType="leche"
                        importedData={ocrResults}
                        defaultDate={ocrDefaultDate}
                        onSaveSuccess={() => { handleBackToOptions(); onSaveSuccess(); }}
                        onCancel={handleBackToOptions}
                    />
                </Modal>
            );

        case 'options':
        default:
            return <EntryOptions onSelectMode={(m) => setMode(m)} />;
    }
}
