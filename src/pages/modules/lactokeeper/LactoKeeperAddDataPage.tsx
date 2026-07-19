// src/pages/modules/lactokeeper/LactoKeeperAddDataPage.tsx

import { useState } from 'react';
import { Zap, ScanLine, Archive, ArrowLeft, UserPlus, ChevronRight, Search } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import BatchImportPage, { OcrResult } from '../../BatchImportPage';
import { BatchWeighingForm } from '../../../components/forms/BatchWeighingForm';
import { RapidWeighingSession } from '../../../components/forms/RapidWeighingSession';
import { AddAnimalForm } from '../../../components/forms/AddAnimalForm';
import { useData } from '../../../context/DataContext';

// Navegación interna de LactoKeeper hacia el perfil de lactancia.
type NavigateToProfile = (page: { name: 'lactation-profile'; animalId: string }) => void;

// --- Componente de Opciones (El Hub) ---
const EntryOptions = ({ onSelectMode }: { onSelectMode: (mode: 'rapid' | 'scan' | 'reference') => void }) => (
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
            <button onClick={() => onSelectMode('reference')} className="w-full bg-c-surface backdrop-blur-xl border border-c-border hover:border-brand-green shadow-sm text-c-text p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <Archive className="w-12 h-12 mb-2 text-brand-green" />
                <span className="text-lg font-semibold">Cargar Animales Referencia</span>
                <span className="text-sm font-normal text-c-text-muted">Lactancias históricas de madres, abuelas, etc.</span>
            </button>
        </div>
    </div>
);

// --- Hub de carga histórica a Referencias ---
const ReferenceLoadHub = ({ navigateTo, onBack }: { navigateTo: NavigateToProfile; onBack: () => void }) => {
    const { animals } = useData();
    const [search, setSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    if (showAddForm) {
        return (
            <div className="animate-fade-in">
                <AddAnimalForm initialStatus="Referencia" onSaveSuccess={() => setShowAddForm(false)} onCancel={() => setShowAddForm(false)} />
            </div>
        );
    }

    const term = search.trim().toUpperCase();
    const females = animals.filter(a => a.sex === 'Hembra');
    const results = term
        ? females.filter(a => a.id.toUpperCase().includes(term) || (a.name || '').toUpperCase().includes(term)).slice(0, 40)
        : females.filter(a => a.isReference).slice(0, 40); // por defecto: las de referencia

    return (
        <div className="w-full max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-24 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-c-text-muted hover:text-c-text">
                <ArrowLeft size={20} /> <span className="font-semibold">Volver</span>
            </button>

            <div>
                <h1 className="text-2xl font-bold text-c-text">Cargar Animales Referencia</h1>
                <p className="text-sm text-c-text-muted mt-1">
                    Crea o elige una hembra (referencia o activa) para cargarle sus <strong>lactancias y pesajes históricos</strong>.
                </p>
            </div>

            <button onClick={() => setShowAddForm(true)} className="w-full bg-brand-green hover:brightness-110 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(34,139,78,0.25)]">
                <UserPlus size={20} /> Nuevo animal de referencia
            </button>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-c-text-faint" size={18} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por ID o nombre..."
                    className="w-full bg-c-surface-2 border border-c-border rounded-xl py-3 pl-12 pr-4 text-c-text outline-none focus:border-c-accent-sky focus:ring-1 focus:ring-c-accent-sky transition-all"
                />
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-c-text-faint">{term ? `Resultados (${results.length})` : 'Referencias'}</p>
                {results.map(a => (
                    <button
                        key={a.id}
                        onClick={() => navigateTo({ name: 'lactation-profile', animalId: a.id })}
                        className="w-full text-left bg-c-surface rounded-xl p-4 border border-c-border flex items-center justify-between hover:border-c-accent-sky/40 transition-colors"
                    >
                        <div className="min-w-0 flex items-center gap-2">
                            <span className="font-mono font-bold text-c-text">{a.id}</span>
                            {a.name && <span className="text-xs text-c-text-muted truncate max-w-[120px]">{a.name}</span>}
                            {a.isReference && <span className="text-[9px] text-c-text-faint uppercase">Ref.</span>}
                        </div>
                        <ChevronRight className="text-c-text-faint flex-none" size={18} />
                    </button>
                ))}
                {results.length === 0 && (
                    <p className="text-sm text-c-text-faint text-center py-8">
                        {term ? 'Sin resultados. Usa "Nuevo animal de referencia".' : 'No hay hembras de referencia. Crea una con el botón de arriba.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export interface LactoKeeperAddDataPageProps {
    onSaveSuccess: () => void;
    navigateTo: NavigateToProfile;
}

export default function LactoKeeperAddDataPage({ onSaveSuccess, navigateTo }: LactoKeeperAddDataPageProps) {
    const [mode, setMode] = useState<'options' | 'rapid' | 'scan' | 'validate' | 'reference'>('options');
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

        case 'reference':
            return <ReferenceLoadHub navigateTo={navigateTo} onBack={handleBackToOptions} />;

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
