import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace, CheckCircle, PlusCircle, Move, Tag, HeartPulse, Milk, FileText, Feather, AlertTriangle } from 'lucide-react';
import { AddParturitionForm } from '../components/forms/AddParturitionForm';
import { Modal } from '../components/ui/Modal';
import { PageState } from './RebanoShell';
import { Animal, Lot, Origin, EventType } from '../db/local';
import { AddLotModal } from '../components/ui/AddLotModal';
import { AddOriginModal } from '../components/ui/AddOriginModal';
import { useEvents } from '../hooks/useEvents';
import { usePedigree } from '../hooks/usePedigree';
import { PedigreeChart } from '../components/pedigree/PedigreeChart';

// --- Componente reutilizable para mostrar una fila de información ---
const InfoRow = ({ label, value, isEditing, children }: { label: string, value: React.ReactNode, isEditing?: boolean, children?: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-zinc-400">{label}</dt>
        {isEditing ? children : <dd className="mt-1 text-lg font-semibold text-white">{value || 'N/A'}</dd>}
    </div>
);

// --- Contenido de la Pestaña "Ficha Principal" ---
const MainInfoTab = ({ 
    animal, 
    isEditing, 
    editedData, 
    setEditedData,
    lots,
    onAddLotClick,
    origins,
    onAddOriginClick
}: { 
    animal: Animal, 
    isEditing: boolean, 
    editedData: Partial<Animal>,
    setEditedData: React.Dispatch<React.SetStateAction<Partial<Animal>>>,
    lots: Lot[],
    onAddLotClick: () => void,
    origins: Origin[],
    onAddOriginClick: () => void
}) => {
    
    const handleChange = (field: keyof Animal, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    const age = useMemo(() => {
        if (!animal.birthDate || animal.birthDate === 'N/A') return 'N/A';
        const birthDate = new Date(animal.birthDate);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }
        return `${years} años, ${months} meses`;
    }, [animal.birthDate]);

    return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <InfoRow label="ID" value={animal.id} />
            <InfoRow label="Sexo" value={animal.sex} />
            <InfoRow label="Fecha Nacimiento" value={animal.birthDate} isEditing={isEditing}>
                <input type="date" value={editedData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} className="w-full bg-zinc-700 p-2 rounded-md mt-1" />
            </InfoRow>
            <InfoRow label="Edad" value={age} />
            <InfoRow label="Ubicación / Lote" value={animal.location} isEditing={isEditing}>
                <div className="flex items-center gap-2 mt-1">
                    <select value={editedData.location || ''} onChange={e => handleChange('location', e.target.value)} className="w-full bg-zinc-700 p-2 rounded-md">
                        <option value="">Seleccione...</option>
                        {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                    </select>
                    <button type="button" onClick={onAddLotClick} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"><PlusCircle size={20} /></button>
                </div>
            </InfoRow>
            <InfoRow label="Estado Crecimiento" value={animal.lifecycleStage} />
            <InfoRow label="Origen" value={animal.origin} isEditing={isEditing}>
                 <div className="flex items-center gap-2 mt-1">
                    <select value={editedData.origin || ''} onChange={e => handleChange('origin', e.target.value)} className="w-full bg-zinc-700 p-2 rounded-md">
                        <option value="Finca Masparrito">Finca Masparrito</option>
                        {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </select>
                    <button type="button" onClick={onAddOriginClick} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"><PlusCircle size={20} /></button>
                </div>
            </InfoRow>
        </dl>
    );
};

// --- Pestaña de Genealogía ---
const GeneticsTab = ({ animalId }: { animalId: string }) => {
    const pedigreeRoot = usePedigree(animalId);
    return <PedigreeChart rootNode={pedigreeRoot} />;
};

// --- Componente para la pestaña de Eventos ---
const EVENT_ICONS: Record<EventType, { icon: React.ElementType, color: string }> = {
    'Nacimiento': { icon: FileText, color: 'bg-green-500/20 text-green-300' },
    'Movimiento': { icon: Move, color: 'bg-blue-500/20 text-blue-300' },
    'Cambio de Estado': { icon: Tag, color: 'bg-yellow-500/20 text-yellow-300' },
    'Pesaje Lechero': { icon: Milk, color: 'bg-gray-500/20 text-gray-300' },
    'Pesaje Corporal': { icon: Scale, color: 'bg-purple-500/20 text-purple-300' },
    'Servicio': { icon: HeartPulse, color: 'bg-pink-500/20 text-pink-300' },
    'Tratamiento': { icon: Syringe, color: 'bg-red-500/20 text-red-300' },
    'Diagnóstico': { icon: CheckCircle, color: 'bg-teal-500/20 text-teal-300' },
};

const EventsTab = ({ animalId }: { animalId: string }) => {
    const events = useEvents(animalId);

    if (events.length === 0) {
        return <div className="text-center p-8 text-zinc-500">No hay eventos registrados para este animal.</div>;
    }

    return (
        <div className="space-y-3">
            {events.map(event => {
                const eventMeta = EVENT_ICONS[event.type] || { icon: FileText, color: 'bg-gray-500/20 text-gray-300' };
                const IconComponent = eventMeta.icon;
                return (
                    <div key={event.id} className="flex items-start gap-4 p-3 bg-black/20 rounded-lg">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">{new Date(event.date + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// --- Componente Principal de la Página de Perfil ---
interface RebanoProfilePageProps {
  animalId: string;
  onBack: () => void;
  navigateTo: (page: PageState) => void;
}

export default function RebanoProfilePage({ animalId, onBack, navigateTo }: RebanoProfilePageProps) {
    const { animals, lots, origins, updateAnimal } = useData();
    const [activeTab, setActiveTab] = useState<'main' | 'genetics' | 'events'>('main');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<Animal>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [isLotModalOpen, setLotModalOpen] = useState(false);
    const [isOriginModalOpen, setOriginModalOpen] = useState(false);
    const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);

    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);
    
    const breedingFailures = animal?.breedingFailures || 0;
    const headerAlertClass = breedingFailures >= 2 
        ? 'border-red-500/80 ring-2 ring-red-500/60' 
        : 'border-brand-border';

    useEffect(() => {
        if (animal && isEditing) {
            setEditedData({
                birthDate: animal.birthDate,
                location: animal.location,
                origin: animal.origin,
            });
        }
    }, [animal, isEditing]);

    const handleSave = async () => {
        if (!animal) return;
        setSaveStatus('saving');
        try {
            await updateAnimal(animal.id, editedData);
            setSaveStatus('success');
            setTimeout(() => {
                setIsEditing(false);
                setSaveStatus('idle');
            }, 1500);
        } catch (error) {
            console.error("Error al actualizar el animal:", error);
            setSaveStatus('idle');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
    };
    
    if (!animal) {
        return (
            <div className="text-center p-10">
                <h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1>
                <button onClick={onBack} className="mt-4 text-brand-amber">Volver</button>
            </div>
        );
    }
    
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
                <header className={`bg-brand-glass backdrop-blur-xl rounded-b-2xl p-4 border-b border-x sticky top-0 z-10 transition-all ${headerAlertClass}`}>
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            {animal.id}
                            {/* --- LÍNEA CORREGIDA --- */}
                            {breedingFailures === 1 && (
                                <span title="1 fallo reproductivo reportado">
                                    <AlertTriangle className="text-yellow-400" size={20} />
                                </span>
                            )}
                        </h1>
                        <div className="w-8"></div>
                    </div>
                    <div className="flex justify-around bg-black/20 rounded-xl p-1">
                        {animal.sex === 'Hembra' && (
                            <>
                                <button onClick={() => navigateTo({ name: 'lactation-profile', animalId: animal.id })} className="flex flex-col items-center p-2 text-zinc-400 hover:text-brand-amber w-full rounded-lg">
                                    <Droplets size={22}/><span className="text-xs mt-1">Leche</span>
                                </button>
                                <button onClick={() => setParturitionModalOpen(true)} className="flex flex-col items-center p-2 text-zinc-400 hover:text-brand-amber w-full rounded-lg">
                                    <Feather size={22}/><span className="text-xs mt-1">Parto</span>
                                </button>
                            </>
                        )}
                        <button onClick={() => alert('Función en desarrollo')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-brand-amber w-full rounded-lg"><Scale size={22}/><span className="text-xs mt-1">Peso</span></button>
                        <button onClick={() => alert('Función en desarrollo')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-brand-amber w-full rounded-lg"><Syringe size={22}/><span className="text-xs mt-1">Sanidad</span></button>
                        <button onClick={() => alert('Función en desarrollo')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-brand-amber w-full rounded-lg"><Replace size={22}/><span className="text-xs mt-1">Mover</span></button>
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex flex-col items-center p-2 w-full rounded-lg ${isEditing ? 'text-green-400' : 'text-zinc-400 hover:text-brand-amber'}`}><Edit size={22}/><span className="text-xs mt-1">Editar</span></button>
                    </div>
                </header>

                <main className="p-4 space-y-4">
                    <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                        <button onClick={() => setActiveTab('main')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'main' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Ficha</button>
                        <button onClick={() => setActiveTab('genetics')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genetics' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Genealogía</button>
                        <button onClick={() => setActiveTab('events')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Eventos</button>
                    </div>

                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                        {activeTab === 'main' && (
                            <div className="space-y-6">
                                <MainInfoTab 
                                    animal={animal} 
                                    isEditing={isEditing} 
                                    editedData={editedData}
                                    setEditedData={setEditedData}
                                    lots={lots}
                                    onAddLotClick={() => setLotModalOpen(true)}
                                    origins={origins}
                                    onAddOriginClick={() => setOriginModalOpen(true)}
                                />
                                {isEditing && (
                                    <div className="flex justify-end gap-4 pt-4 border-t border-zinc-700">
                                        <button onClick={handleCancel} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                                            <X size={18}/> Cancelar
                                        </button>
                                        <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-brand-amber hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[130px] justify-center">
                                            {saveStatus === 'saving' && <span className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"/>}
                                            {saveStatus === 'success' && <CheckCircle size={18}/>}
                                            {saveStatus === 'idle' && <Save size={18}/>}
                                            <span className="ml-2">{saveStatus === 'success' ? 'Guardado' : 'Guardar'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'genetics' && <GeneticsTab animalId={animal.id} />}
                        {activeTab === 'events' && <EventsTab animalId={animal.id} />}
                    </div>
                </main>
            </div>
            <AddLotModal 
                isOpen={isLotModalOpen}
                onClose={() => setLotModalOpen(false)}
            />
            <AddOriginModal
                isOpen={isOriginModalOpen}
                onClose={() => setOriginModalOpen(false)}
            />
            
            <Modal isOpen={isParturitionModalOpen} onClose={() => setParturitionModalOpen(false)} title={`Registrar Parto para ${animal.id}`}>
                <AddParturitionForm
                    motherId={animal.id}
                    onSaveSuccess={() => setParturitionModalOpen(false)}
                    onCancel={() => setParturitionModalOpen(false)}
                />
            </Modal>
        </>
    );
}

