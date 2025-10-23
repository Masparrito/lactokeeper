// src/pages/RebanoProfilePage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
    ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace, CheckCircle, PlusCircle,
    Move, Tag, HeartPulse, Milk, FileText, Feather, AlertTriangle, ChevronRight, Archive,
    DollarSign, HeartCrack, Ban, RefreshCw, Trash2, Award, Baby, Eye
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import type { PageState } from '../types/navigation';
// --- CORRECCIÓN: 'Parturition' SÍ es necesario para getAnimalZootecnicCategory ---
import { Animal, Origin, EventType } from '../db/local';
import { AddLotModal } from '../components/ui/AddLotModal';
import { AddOriginModal } from '../components/ui/AddOriginModal';
import { useEvents } from '../hooks/useEvents';
// usePedigree se usa en PedigreeModal
import { formatAge, getAnimalZootecnicCategory } from '../utils/calculations';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { formatAnimalDisplay } from '../utils/formatting';
// Import the Pedigree Modal
import { PedigreeModal } from '../components/modals/PedigreeModal';

// --- SUB-COMPONENTES DE LA PÁGINA ---

const InfoRow = ({ label, value, isEditing, children }: { label: string, value?: React.ReactNode, isEditing?: boolean, children?: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-zinc-400">{label}</dt>
        {isEditing && children ? children : <dd className="mt-1 text-lg font-semibold text-white truncate">{value || 'N/A'}</dd>}
    </div>
);

// --- CORRECCIÓN: GeneticsTab ahora abre el modal ---
const GeneticsTab = ({ onOpenModal }: { onOpenModal: () => void }) => {
    return (
        <div className="text-center p-4 min-h-[150px] flex flex-col justify-center items-center">
            <button
                onClick={onOpenModal}
                className="inline-flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-colors"
            >
                <Eye size={20} /> Ver Genealogía Completa
            </button>
        </div>
    );
};


// --- MAPEO DE ICONOS PARA EVENTOS (Incluye 'Registro') ---
const EVENT_ICONS: Record<EventType, { icon: React.ElementType, color: string }> = {
    'Nacimiento': { icon: Feather, color: 'bg-green-500/20 text-brand-green' },
    'Registro': { icon: FileText, color: 'bg-blue-500/20 text-brand-blue' }, // Añadido
    'Parto': { icon: Baby, color: 'bg-pink-500/20 text-pink-400' },
    'Aborto': { icon: HeartCrack, color: 'bg-yellow-500/20 text-yellow-400' },
    'Movimiento': { icon: Move, color: 'bg-blue-500/20 text-brand-blue' },
    'Cambio de Estado': { icon: Tag, color: 'bg-purple-500/20 text-purple-400' },
    'Pesaje Lechero': { icon: Milk, color: 'bg-gray-500/20 text-gray-300' },
    'Pesaje Corporal': { icon: Scale, color: 'bg-green-500/20 text-brand-green' },
    'Servicio': { icon: HeartPulse, color: 'bg-pink-500/20 text-pink-400' },
    'Tratamiento': { icon: Syringe, color: 'bg-red-500/20 text-brand-red' },
    'Diagnóstico': { icon: CheckCircle, color: 'bg-teal-500/20 text-teal-300' },
};

// --- PESTAÑA DE EVENTOS (Con lógica de fecha corregida) ---
const EventsTab = ({ animal }: { animal: Animal | null | undefined }) => {
    const events = useEvents(animal?.id);

    if (!animal) return <div className="text-center p-8 text-zinc-500">Cargando datos del animal...</div>;

    if (events.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene eventos registrados.</div>;
    }
    return (
        <div className="space-y-3">
            {events.map(event => {
                const eventMeta = EVENT_ICONS[event.type] || { icon: FileText, color: 'bg-gray-500/20 text-gray-300' };
                const IconComponent = eventMeta.icon;
                let displayDate = 'Fecha desconocida';
                let dateLabelPrefix = '';

                // --- LÓGICA DE FECHA CORREGIDA ---
                if (event.type === 'Registro' && animal.createdAt) {
                    displayDate = new Date(animal.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
                    dateLabelPrefix = 'Registrado el: ';
                } else if (event.date && event.date !== 'N/A') {
                     try {
                         displayDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                     } catch (e) {
                         console.error("Error formatting event date:", event.date, e);
                         displayDate = event.date;
                     }
                }
                // --- FIN LÓGICA DE FECHA ---

                return (
                    <div key={event.id} className="flex items-start gap-4 p-3 bg-black/20 rounded-lg">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                {dateLabelPrefix}{displayDate}
                                {event.lotName && ` | Lote: ${event.lotName}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- ProgenyTab (Usa formatAnimalDisplay) ---
const ProgenyTab = ({ offspring, navigateTo }: { offspring: Animal[], navigateTo: (page: PageState) => void }) => {
    if (offspring.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene descendencia registrada.</div>;
    }
    return (
        <div className="space-y-2">
            {offspring.map(child => (
                <button
                    key={child.id}
                    onClick={() => navigateTo({ name: 'rebano-profile', animalId: child.id })}
                    className="w-full text-left p-3 bg-black/20 hover:bg-zinc-800/60 rounded-lg transition-colors flex justify-between items-center group"
                >
                   <div>
                       <p className="font-bold text-lg text-white">{formatAnimalDisplay(child)}</p>
                       <p className="text-sm text-zinc-400">
                           {child.sex} | {formatAge(child.birthDate)} | Lote: {child.location || 'Sin Asignar'}
                       </p>
                   </div>
                   <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
                </button>
            ))}
        </div>
    );
};

// --- MainInfoTab (Muestra animal.lifecycleStage) ---
const MainInfoTab = ({ animal, isEditing, editedData, setEditedData, origins, onAddOriginClick, onLocationClick, }: {
    animal: Animal,
    // parturitions prop eliminada
    isEditing: boolean,
    editedData: Partial<Animal>,
    setEditedData: React.Dispatch<React.SetStateAction<Partial<Animal>>>,
    origins: Origin[],
    onAddOriginClick: () => void,
    onLocationClick: () => void,
}) => {
    const handleChange = (field: keyof Animal, value: any) => { setEditedData(prev => ({ ...prev, [field]: value })); };
    const formattedAge = formatAge(animal.birthDate);
    
    // El cálculo de zootecnicCategory ya no se hace aquí

    return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <InfoRow label="ID" value={animal.id} />
            <InfoRow label="Sexo" value={animal.sex} />
            <InfoRow label="Fecha Nacimiento" value={animal.birthDate !== 'N/A' ? new Date(animal.birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'}) : 'N/A'} isEditing={isEditing}>
                <input type="date" value={editedData.birthDate === 'N/A' ? '' : editedData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value || 'N/A')} className="w-full bg-zinc-700 p-2 rounded-md mt-1 text-white" />
            </InfoRow>
            <InfoRow label="Edad" value={formattedAge} />
            <InfoRow label="Ubicación / Lote">{!isEditing && ( <dd className="mt-1 text-lg"><button onClick={onLocationClick} className="font-semibold text-brand-orange hover:underline text-left">{animal.location || 'Sin Asignar'}</button></dd> )}</InfoRow>
            {/* --- CORRECCIÓN: Muestra el valor guardado --- */}
            <InfoRow label="Categoría" value={animal.lifecycleStage} />
            <InfoRow label="Origen" value={animal.origin} isEditing={isEditing}>
                <div className="flex items-center gap-2 mt-1">
                    <select value={editedData.origin || ''} onChange={e => handleChange('origin', e.target.value)} className="w-full bg-zinc-700 p-2 rounded-md text-white">
                        <option value="">Seleccionar Origen...</option>
                        <option value="Finca Masparrito">Finca Masparrito</option>
                        {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </select>
                    <button type="button" onClick={onAddOriginClick} className="p-2 bg-brand-orange hover:bg-orange-600 text-white rounded-md"><PlusCircle size={20} /></button>
                </div>
            </InfoRow>
            {animal.weaningDate && <InfoRow label="Fecha de Destete" value={new Date(animal.weaningDate + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'})} />}
            {animal.weaningWeight && <InfoRow label="Peso al Destete" value={`${animal.weaningWeight} Kg`} />}
        </dl>
    );
};


// --- DecommissionModal (Restaurado) ---
const DecommissionModal = ({ isOpen, onClose, onConfirm, reason }: { isOpen: boolean, onClose: () => void, onConfirm: (details: { date: string, price?: number, buyer?: string, purpose?: 'Cría' | 'Carne', reason?: string, cullReason?: Animal['cullReason'], cullDetails?: string }) => void, reason: 'Venta' | 'Muerte' | 'Descarte' | null }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [price, setPrice] = useState('');
    const [buyer, setBuyer] = useState('');
    const [purpose, setPurpose] = useState<'Cría' | 'Carne'>('Cría');
    const [deathReason, setDeathReason] = useState('');
    const [cullReason, setCullReason] = useState<Animal['cullReason']>();
    const [cullDetails, setCullDetails] = useState('');

    if (!isOpen || !reason) return null;

    const cullOptions = ['Baja producción', 'Bajo índice de crecimiento', 'Inflamación articular', 'Linfadenitis caseosa', 'Sospecha de otras enfermedades'] as const;
    type CullOptionType = typeof cullOptions[number];

    const handleConfirm = () => { onConfirm({ date, price: parseFloat(price) || undefined, buyer: buyer || undefined, purpose, reason: deathReason || undefined, cullReason: cullReason || undefined, cullDetails: cullReason === 'Sospecha de otras enfermedades' ? cullDetails : undefined }); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dar de baja por ${reason}`}>
            <div className="space-y-4 text-white">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" max={new Date().toISOString().split('T')[0]}/>
                </div>
                {reason === 'Venta' && (
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-zinc-400 mb-1">Precio (Opcional)</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" /></div>
                        <div><label className="block text-sm font-medium text-zinc-400 mb-1">Comprador (Opcional)</label><input type="text" value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Nombre del comprador" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" /></div>
                        <div><label className="block text-sm font-medium text-zinc-400 mb-1">Fin</label><select value={purpose} onChange={e => setPurpose(e.target.value as 'Cría' | 'Carne')} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none"><option value="Cría">Cría</option><option value="Carne">Carne</option></select></div>
                    </div>
                )}
                {reason === 'Muerte' && (
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Causa / Descripción</label>
                        <textarea value={deathReason} onChange={e => setDeathReason(e.target.value)} placeholder="Ej: Infección..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" rows={3}></textarea>
                    </div>
                )}
                {reason === 'Descarte' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Causa</label>
                            <select value={cullReason || ''} onChange={e => setCullReason(e.target.value as CullOptionType)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none">
                                <option value="">Seleccione...</option>
                                {cullOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        {cullReason === 'Sospecha de otras enfermedades' && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Especificar</label>
                                <input type="text" value={cullDetails} onChange={e => setCullDetails(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                            </div>
                        )}
                    </div>
                )}
                <p className="text-sm text-zinc-400">El animal pasará a "Referencia".</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                    <button onClick={handleConfirm} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg">Confirmar Baja</button>
                </div>
            </div>
        </Modal>
    );
};


// --- ConfirmationModal (Restaurado) ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-zinc-300">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button>
                </div>
            </div>
        </Modal>
    );
};

// --- COMPONENTE PRINCIPAL RebanoProfilePage ---
interface RebanoProfilePageProps { animalId: string; onBack: () => void; navigateTo: (page: PageState) => void; }

export default function RebanoProfilePage({ animalId, onBack, navigateTo }: RebanoProfilePageProps) {
    // 'parturitions' se usa en zootecnicCategoryForLogic
    const { animals, lots, origins, parturitions, updateAnimal, deleteAnimalPermanently } = useData();
    const [activeTab, setActiveTab] = useState<'main' | 'genetics' | 'events' | 'progeny'>('main');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<Animal>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const [isAddOriginModalOpen, setAddOriginModalOpen] = useState(false);
    const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);
    const [isLotChangeModalOpen, setLotChangeModalOpen] = useState(false);
    const [selectedNewLot, setSelectedNewLot] = useState('');
    const [isDecommissionSheetOpen, setDecommissionSheetOpen] = useState(false);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [isReferenceActionsOpen, setIsReferenceActionsOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isWeanModalOpen, setWeanModalOpen] = useState(false);
    const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);

    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);

    const progeny = useMemo(() => {
        if (!animal) return [];
        if (animal.sex === 'Hembra') { return animals.filter(a => a.motherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        if (animal.sex === 'Macho') { return animals.filter(a => a.fatherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        return [];
    }, [animals, animal]);

    // 'zootecnicCategoryForLogic' se usa para el botón "Destetar"
    const zootecnicCategoryForLogic = useMemo(() => {
        if (!animal) return '';
        return getAnimalZootecnicCategory(animal, parturitions); // Requiere 'parturitions'
    }, [animal, parturitions]);

    const breedingFailures = animal?.breedingFailures || 0;
    const headerAlertClass = breedingFailures >= 2 ? 'border-brand-red ring-2 ring-brand-red/80' : 'border-brand-border';

    useEffect(() => {
        if (animal) {
            if (isEditing) { setEditedData({ birthDate: animal.birthDate, origin: animal.origin }); }
            setSelectedNewLot(animal.location || '');
        }
    }, [animal, isEditing]);

    // --- Handlers (Todos se usan) ---
    const handleSave = async () => { if (!animal) return; setSaveStatus('saving'); try { await updateAnimal(animal.id, editedData); setSaveStatus('success'); setTimeout(() => { setIsEditing(false); setSaveStatus('idle'); }, 1500); } catch (error) { console.error("Error al actualizar:", error); setSaveStatus('idle'); } };
    const handleCancel = () => { setIsEditing(false); setEditedData({}); };
    const handleUpdateLocation = async () => { if (!animal) return; try { await updateAnimal(animal.id, { location: selectedNewLot }); setLotChangeModalOpen(false); } catch (error) { console.error("Error al actualizar ubicación:", error); } };
    const handleDecommission = async (details: { date: string, price?: number, buyer?: string, purpose?: 'Cría' | 'Carne', reason?: string, cullReason?: Animal['cullReason'], cullDetails?: string }) => {
        if (!animal || !decommissionReason) return;
        const dataToUpdate: Partial<Animal> = { status: decommissionReason, isReference: true, endDate: details.date };
        if (decommissionReason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.price, saleBuyer: details.buyer, salePurpose: details.purpose }); }
        if (decommissionReason === 'Muerte') { dataToUpdate.deathReason = details.reason; }
        if (decommissionReason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullDetails }); }
        await updateAnimal(animal.id, dataToUpdate);
        setDecommissionReason(null);
    };
    const handleReintegrate = async () => { if (!animal) return; await updateAnimal(animal.id, { isReference: false, status: 'Activo', endDate: undefined }); };
    const handlePermanentDelete = async () => { if (!animal) return; await deleteAnimalPermanently(animal.id); onBack(); };
    const handleSaveWean = async (data: { weaningDate: string, weaningWeight: number }) => { if (!animal) return; await updateAnimal(animal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight }); setWeanModalOpen(false); };

    // Acciones (Usan los iconos)
    const decommissionActions: ActionSheetAction[] = [ { label: "Por Venta", icon: DollarSign, onClick: () => setDecommissionReason('Venta') }, { label: "Por Muerte", icon: HeartCrack, onClick: () => setDecommissionReason('Muerte'), color: 'text-brand-red' }, { label: "Por Descarte", icon: Ban, onClick: () => setDecommissionReason('Descarte'), color: 'text-brand-red' }, ];
    const referenceActions: ActionSheetAction[] = [ { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate }, { label: "Eliminar Permanentemente", icon: Trash2, onClick: () => setIsDeleteConfirmationOpen(true), color: 'text-brand-red' }, ];

    if (!animal) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
                <header className={`bg-brand-glass backdrop-blur-xl rounded-b-2xl p-4 border-b border-x sticky top-0 z-10 transition-all ${headerAlertClass}`}>
                   <div className="flex justify-between items-center mb-1">
                       <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                       <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">{formatAnimalDisplay(animal)} {breedingFailures === 1 && ( <span title="1 fallo reproductivo reportado"><AlertTriangle className="text-yellow-400" size={20} /></span> )} {breedingFailures >= 2 && ( <span title={`${breedingFailures} fallos reproductivos reportados`}><AlertTriangle className="text-brand-red" size={20} /></span> )}</h1>
                       <div className="w-8"></div>
                   </div>
                   {/* --- LÓGICA DE ESTADO EN HEADER CORREGIDA --- */}
                   <p className="text-center text-brand-orange font-semibold text-sm -mt-1 mb-3 uppercase tracking-wider">
                       {animal.isReference ? 'REFERENCIA' : (animal.status !== 'Activo' ? animal.status : (animal.location || 'Sin Asignar'))}
                   </p>
                   {/* Botones de acción del header (Usan los iconos) */}
                   <div className="flex justify-around bg-black/20 rounded-xl p-1">
                        {animal.sex === 'Hembra' && ( <> <button onClick={() => navigateTo({ name: 'lactation-profile', animalId: animal.id })} className="flex flex-col items-center p-2 text-blue-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Droplets size={22}/><span className="text-xs mt-1">Leche</span></button> <button onClick={() => setParturitionModalOpen(true)} disabled={animal.isReference || animal.status !== 'Activo'} className="flex flex-col items-center p-2 text-pink-400 hover:bg-zinc-700/50 w-full rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Baby size={22}/><span className="text-xs mt-1">Parto</span></button> </> )}
                        {(zootecnicCategoryForLogic === 'Cabrita' || zootecnicCategoryForLogic === 'Cabrito') && !animal.weaningDate && !animal.isReference && animal.status === 'Activo' && ( <button onClick={() => setWeanModalOpen(true)} className="flex flex-col items-center p-2 text-yellow-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Award size={22}/><span className="text-xs mt-1">Destetar</span></button> )}
                        <button onClick={() => navigateTo({ name: 'growth-profile', animalId: animal.id })} className="flex flex-col items-center p-2 text-brand-green hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Scale size={22}/><span className="text-xs mt-1">Peso</span></button>
                        <button onClick={() => alert('Función en desarrollo')} disabled={animal.isReference || animal.status !== 'Activo'} className="flex flex-col items-center p-2 text-teal-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Syringe size={22}/><span className="text-xs mt-1">Sanidad</span></button>
                        <button onClick={() => animal.isReference ? setIsReferenceActionsOpen(true) : setLotChangeModalOpen(true)} className="flex flex-col items-center p-2 text-brand-blue hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Replace size={22}/><span className="text-xs mt-1">Mover</span></button>
                        {animal.status === 'Activo' && !animal.isReference && ( <button onClick={() => setDecommissionSheetOpen(true)} className="flex flex-col items-center p-2 text-amber-400 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Archive size={22}/><span className="text-xs mt-1">Dar de baja</span></button> )}
                        <button onClick={() => setIsEditing(!isEditing)} disabled={animal.isReference} className={`flex flex-col items-center p-2 w-full rounded-lg transition-colors ${isEditing ? 'text-green-400' : 'text-brand-orange'} hover:bg-zinc-700/50 disabled:opacity-40 disabled:cursor-not-allowed`}><Edit size={22}/><span className="text-xs mt-1">Editar</span></button>
                   </div>
                </header>
                <main className="p-4 space-y-4">
                    <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                         <button onClick={() => setActiveTab('main')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'main' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Ficha</button>
                        <button onClick={() => setActiveTab('genetics')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genetics' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Genealogía</button>
                        <button onClick={() => setActiveTab('progeny')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'progeny' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Progenie</button>
                        <button onClick={() => setActiveTab('events')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Eventos</button>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                        {/* --- CORRECCIÓN: 'parturitions' eliminado de la llamada a MainInfoTab --- */}
                        {activeTab === 'main' && ( <div className="space-y-6"> <MainInfoTab animal={animal} isEditing={isEditing} editedData={editedData} setEditedData={setEditedData} origins={origins} onAddOriginClick={() => setAddOriginModalOpen(true)} onLocationClick={() => setLotChangeModalOpen(true)} /> {isEditing && ( <div className="flex justify-end gap-4 pt-4 border-t border-zinc-700"> <button onClick={handleCancel} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><X size={18}/> Cancelar</button> <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[130px] justify-center"> {saveStatus === 'saving' && <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"/>} {saveStatus === 'success' && <CheckCircle size={18}/>} {saveStatus === 'idle' && <Save size={18}/>} <span className="ml-2">{saveStatus === 'success' ? 'Guardado' : 'Guardar'}</span> </button> </div> )} </div> )}
                        {activeTab === 'genetics' && <GeneticsTab onOpenModal={() => setIsPedigreeModalOpen(true)} />}
                        {activeTab === 'progeny' && <ProgenyTab offspring={progeny} navigateTo={navigateTo} />}
                        {activeTab === 'events' && <EventsTab animal={animal} />}
                    </div>
                </main>
            </div>
            {/* --- Modales --- */}
            <Modal isOpen={isLotChangeModalOpen} onClose={() => setLotChangeModalOpen(false)} title={`Cambiar Lote para ${formatAnimalDisplay(animal)}`}>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar nuevo lote</label>
                         <div className="flex items-center gap-2">
                             <select value={selectedNewLot} onChange={e => setSelectedNewLot(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none">
                                 <option value="">Sin Asignar</option>
                                 {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                             </select>
                             <button type="button" onClick={() => {setLotChangeModalOpen(false); setAddLotModalOpen(true);}} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><PlusCircle size={24} /></button>
                         </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-2">
                         <button onClick={() => setLotChangeModalOpen(false)} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                         <button onClick={handleUpdateLocation} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">Guardar Cambio</button>
                     </div>
                 </div>
            </Modal>
            <ActionSheetModal isOpen={isDecommissionSheetOpen} onClose={() => setDecommissionSheetOpen(false)} title="Causa de la Baja" actions={decommissionActions} />
            <DecommissionModal isOpen={!!decommissionReason} onClose={() => setDecommissionReason(null)} onConfirm={handleDecommission} reason={decommissionReason} />
            <ActionSheetModal isOpen={isReferenceActionsOpen} onClose={() => setIsReferenceActionsOpen(false)} title="Acciones de Referencia" actions={referenceActions} />
            <ConfirmationModal isOpen={isDeleteConfirmationOpen} onClose={() => setIsDeleteConfirmationOpen(false)} onConfirm={handlePermanentDelete} title={`¿Eliminar ${formatAnimalDisplay(animal)} Permanentemente?`} message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer." />
            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
            <AddOriginModal isOpen={isAddOriginModalOpen} onClose={() => setAddOriginModalOpen(false)} />
            <ParturitionModal isOpen={isParturitionModalOpen} onClose={() => setParturitionModalOpen(false)} motherId={animal.id} />
            <Modal isOpen={isWeanModalOpen} onClose={() => setWeanModalOpen(false)} title={`Registrar Destete de ${formatAnimalDisplay(animal)}`}> <WeanAnimalForm animalId={animal.id} birthDate={animal.birthDate} onSave={handleSaveWean} onCancel={() => setWeanModalOpen(false)} /> </Modal>
            <PedigreeModal isOpen={isPedigreeModalOpen} onClose={() => setIsPedigreeModalOpen(false)} animalId={animal.id} navigateTo={navigateTo} />
        </>
    );
}