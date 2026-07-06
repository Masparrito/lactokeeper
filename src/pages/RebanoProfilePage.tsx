import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom'; 
import { useData } from '../context/DataContext';
import {
    ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace,
    Baby, Archive,
    DollarSign, HeartCrack, Ban, RefreshCw, Trash2, Award,
    Printer, CheckCircle2, PlusCircle, BarChart2, Heart, Star, AlertCircle // Importado Heart
} from 'lucide-react';

// --- Modales y UI Esenciales ---
import { Modal } from '../components/ui/Modal';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import { AddLotModal } from '../components/modals/AddLotModal';
import { AddOriginModal } from '../components/ui/AddOriginModal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal'; 
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { AnimalSelectorModal } from '../components/ui/AnimalSelectorModal';
import { AddQuickParentModal } from '../components/modals/AddQuickParentModal';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { StatusLegendModal } from '../components/ui/StatusLegendModal';
import { FormInput, FormSelect } from '../components/ui/FormControls';
import { DeclareServiceWeightModal } from '../components/modals/DeclareServiceWeightModal';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal'; 
import { MilkWeighingActionModal } from '../components/modals/MilkWeighingActionModal';
import { BodyWeighingActionModal } from '../components/modals/BodyWeighingActionModal';

// --- Componentes de Pestañas ---
import { MainInfoTab } from '../components/profile/MainInfoTab';
import { GeneticsTab } from '../components/profile/GeneticsTab';
import { ProgenyTab } from '../components/profile/ProgenyTab';
import { EventsTab } from '../components/profile/EventsTab';
import { RecentEvents } from '../components/profile/RecentEvents';
import { FamachaProfileBadge } from '../components/famacha/FamachaProfileBadge';
import { HiddenPdfChart } from '../components/profile/HiddenPdfChart';
import { PedigreeChart } from '../components/pedigree/PedigreeChart';

// --- Hooks y Utilitarios ---
import type { PageState } from '../types/navigation';
import { Animal } from '../db/local'; 
import { useEvents } from '../hooks/useEvents';
import { usePedigree } from '../hooks/usePedigree';
import { useAnimalIndicators } from '../hooks/useAnimalIndicators';
import { getStatusDisplayFlags } from '../hooks/useAnimalStatus';
import { useShortcuts } from '../context/ShortcutsContext';
import { useToastUndo } from '../context/ToastUndoContext';
import { useManagementAlerts } from '../hooks/useManagementAlerts';
import { exportPedigreeToPDF } from '../utils/pdfExporter';
import {
    getAnimalZootecnicCategory, 
    calculateBreedFromComposition, 
    calculateChildComposition,
    getGrowthStatus,
    getAnimalStatusObjects,
    calculateAgeInDays
} from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';

interface RebanoProfilePageProps {
    animalId?: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
    contextDate?: string; 
}

type ManualIndicatorFields = {
    priorParturitions?: number;
    manualFirstParturitionDate?: string;
};

export default function RebanoProfilePage({ 
    animalId: propAnimalId, 
    onBack, 
    navigateTo, 
}: RebanoProfilePageProps) {
    
    const { animalId: paramAnimalId } = useParams();
    const animalId = propAnimalId || paramAnimalId || '';
    
    const parentRef = useRef<HTMLDivElement>(null);
    const pdfChartRef = useRef<HTMLDivElement>(null);

    const { 
        animals, lots, origins, parturitions, updateAnimal, deleteAnimalPermanently, changeAnimalId, fathers, appConfig,
        bodyWeighings, addEvent, events,
        serviceRecords, sireLots, breedingSeasons,
        startDryingProcess, setLactationAsDry
    } = useData();

    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);
    const { recordView, toggleFavorite, isFavorite } = useShortcuts();
    const { showUndo } = useToastUndo();
    const allAlerts = useManagementAlerts();
    const animalAlerts = useMemo(() => animal ? allAlerts.filter(a => a.animalId === animal.id) : [], [allAlerts, animal]);
    useEffect(() => { if (animal?.id) recordView(animal.id); }, [animal?.id, recordView]);
    const animalEvents = useEvents(animal ? animal.id : undefined); 
    const pedigreeRoot = usePedigree(animalId);
    
    const statusObjects = useMemo(() =>
        getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
    [animal, parturitions, serviceRecords, sireLots, breedingSeasons]);

    const { showReproductive, showLactation } = useMemo(() =>
        getStatusDisplayFlags(animal, parturitions, appConfig),
    [animal, parturitions, appConfig]);

    const { indicators, loading: indicatorsLoading } = useAnimalIndicators(animal, parturitions);

    // --- Estados de la Página ---
    const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);
    const [isStatusLegendOpen, setIsStatusLegendOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'ficha' | 'genealogia' | 'progenie' | 'eventos'>('ficha');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<Animal & ManualIndicatorFields>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [selectedNewLot, setSelectedNewLot] = useState(''); 
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- Estados de Modales ---
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const [isAddOriginModalOpen, setAddOriginModalOpen] = useState(false);
    const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);
    const [isAbortionModalOpen, setIsAbortionModalOpen] = useState(false); 
    const [isLotChangeModalOpen, setLotChangeModalOpen] = useState(false);
    const [isDecommissionModalOpen, setIsDecommissionModalOpen] = useState(false);
    const [isDecommissionSheetOpen, setDecommissionSheetOpen] = useState(false);
    const [isReferenceActionsOpen, setIsReferenceActionsOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isWeanModalOpen, setWeanModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false); // Modal para Servicio
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isParentModalOpen, setIsParentModalOpen] = useState<'mother' | 'father' | null>(null);
    
    // Modales de acciones de peso
    const [isMilkModalOpen, setIsMilkModalOpen] = useState(false);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isServiceWeightModalOpen, setIsServiceWeightModalOpen] = useState(false);
    const [isWeightMenuOpen, setIsWeightMenuOpen] = useState(false); 

    // --- Autocorrección ---
    useEffect(() => {
        if (!animal) return;
        const hasProvenFertility = parturitions.some(p => 
            p.goatId === animal.id && 
            (p.parturitionOutcome === 'Normal' || p.parturitionOutcome === 'Con Mortinatos' || p.parturitionOutcome === 'Aborto')
        );
        if (hasProvenFertility && animal.lifecycleStage !== 'Cabra' && animal.sex === 'Hembra') {
            updateAnimal(animal.id, { lifecycleStage: 'Cabra' });
        }
    }, [animal, parturitions, updateAnimal]);

    const isNativo = useMemo(() => {
        if (!animal) return false;
        return parturitions.some(p => p.liveOffspring && p.liveOffspring.some(kid => kid.id === animal.id));
    }, [animal, parturitions]);

    // Información para sugerir datos en el modal de destete
    const weaningCandidateInfo = useMemo(() => {
        if (!animal) return null;
        const animalWeighings = bodyWeighings
            .filter(w => w.animalId === animal.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (animalWeighings.length > 0) {
            const metaEdad = Number(appConfig.diasMetaDesteteFinal) || 60;
            const targetWeighing = animalWeighings.find(w => {
                const days = calculateAgeInDays(animal.birthDate, w.date);
                return days >= metaEdad && days <= metaEdad + 45;
            });
            if (targetWeighing) return { date: targetWeighing.date, weight: targetWeighing.kg };
            return { date: animalWeighings[0].date, weight: animalWeighings[0].kg };
        }
        return null;
    }, [animal, bodyWeighings, appConfig]);

    const growthStatus = useMemo(() => 
        animal ? getGrowthStatus(animal, bodyWeighings, appConfig, events) : null, 
    [animal, bodyWeighings, appConfig, events]);

    const progeny = useMemo(() => {
        if (!animal) return [];
        if (animal.sex === 'Hembra') { return animals.filter(a => a.motherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        if (animal.sex === 'Macho') { return animals.filter(a => a.fatherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        return [];
    }, [animals, animal]);
    
    const mothers = useMemo(() => animals.filter(a => a.sex === 'Hembra'), [animals]);
    const allFathers = useMemo(() => {
        const internalSires: Animal[] = animals.filter(a => a.sex === 'Macho');
        const externalSires: any[] = fathers.map(f => ({
            id: f.id, name: f.name, sex: 'Macho', status: 'Activo', isReference: true,
            birthDate: 'N/A', lifecycleStage: 'Reproductor', location: 'Referencia', reproductiveStatus: 'No Aplica',
            createdAt: 0, lastWeighing: null,
        }));
        return [...internalSires, ...externalSires];
    }, [animals, fathers]);
    
    // --- Efectos Edición ---
    useEffect(() => {
        if (animal) {
            if (isEditing) {
                setEditedData({
                    id: animal.id,
                    name: animal.name,
                    birthDate: animal.birthDate,
                    birthWeight: animal.birthWeight,
                    origin: animal.origin,
                    fatherId: animal.fatherId,
                    motherId: animal.motherId,
                    racialComposition: animal.racialComposition,
                    location: animal.location,
                    isReference: animal.isReference,
                    conceptionMethod: animal.conceptionMethod,
                    parturitionType: animal.parturitionType,
                    lifecycleStage: animal.lifecycleStage, 
                    priorParturitions: (animal as any).priorParturitions,
                    manualFirstParturitionDate: (animal as any).manualFirstParturitionDate,
                });
            } else {
                setEditedData({});
            }
            setSelectedNewLot(animal.location || '');
        }
    }, [animal, isEditing]);
    
    useEffect(() => {
        if (!isEditing) return;
        const mother = mothers.find(a => a.id === editedData.motherId);
        const father = allFathers.find(a => a.id === editedData.fatherId);
        if (mother?.racialComposition && father?.racialComposition) {
            const childComp = calculateChildComposition(mother.racialComposition, father.racialComposition);
            setEditedData(prev => ({ ...prev, racialComposition: childComp }));
        }
    }, [editedData.motherId, editedData.fatherId, isEditing, mothers, allFathers]);

    // --- Handlers ---
    const handleSave = async () => {
        if (!animal) return;
        if (editedData.id && editedData.id.trim() === '') { alert("Error: ID vacío"); setSaveStatus('idle'); return; }
        setSaveStatus('saving');

        try {
            const { id, ...finalData } = editedData;
            const currentId = animal.id;
            const newId = editedData.id?.trim().toUpperCase();
            
            if (editedData.racialComposition !== animal.racialComposition) {
                (finalData as Partial<Animal>).breed = calculateBreedFromComposition(editedData.racialComposition);
            }
            
            if (editedData.birthDate && editedData.birthDate !== animal.birthDate) {
                 (finalData as Partial<Animal>).lifecycleStage = getAnimalZootecnicCategory({ ...animal, ...finalData } as Animal, parturitions, appConfig, animals) as any;
            }

            if (newId && newId !== currentId) {
                if (appConfig.lockAnimalIdEditing !== false) {
                    alert("La edición del ID está protegida. Para cambiarlo, ve a Configuración → Seguridad y desactiva \"Proteger ID del animal\".");
                    setSaveStatus('idle');
                    return;
                }
                const ok = window.confirm(`¿Cambiar el ID de "${currentId}" a "${newId}"?\n\nSe actualizarán TODAS las referencias (partos, pesajes, eventos, progenie, servicios). Asegúrate de que el nuevo ID es correcto.`);
                if (!ok) { setSaveStatus('idle'); return; }
                await changeAnimalId(currentId, newId);
                // Aplicar el resto de cambios (nombre, raza, etc.) sobre el nuevo ID.
                if (Object.keys(finalData).length > 0) await updateAnimal(newId, finalData);
                setSaveStatus('success');
                setTimeout(() => {
                    setIsEditing(false); setSaveStatus('idle');
                    navigateTo({ name: 'rebano-profile', animalId: newId });
                }, 1200);
            } else {
                await updateAnimal(animal.id, finalData);
                setSaveStatus('success');
                setTimeout(() => { setIsEditing(false); setSaveStatus('idle'); }, 1500);
            }
        } catch (error: any) { console.error("Error:", error); alert(`Error: ${error.message}`); setSaveStatus('idle'); }
    };

    const handleCancel = () => { setIsEditing(false); setEditedData({}); };
    const handleUpdateLocation = async () => {
        if (!animal) return;
        const prevLocation = animal.location || '';
        const id = animal.id;
        await updateAnimal(id, { location: selectedNewLot });
        setLotChangeModalOpen(false);
        showUndo(`${id} movido a ${selectedNewLot || 'Sin Asignar'}`, () => updateAnimal(id, { location: prevLocation }));
    };

    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!animal || !decommissionReason) return;
        const id = animal.id;
        const prev = { status: animal.status, isReference: animal.isReference, endDate: animal.endDate, reproductiveStatus: animal.reproductiveStatus };
        const dataToUpdate: Partial<Animal> = { status: decommissionReason, isReference: true, endDate: details.date };
        if (decommissionReason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (decommissionReason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (decommissionReason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        await updateAnimal(id, dataToUpdate);
        setDecommissionSheetOpen(false); setIsDecommissionModalOpen(false);
        showUndo(`${id} dado de baja (${decommissionReason})`, () => updateAnimal(id, { status: prev.status || 'Activo', isReference: prev.isReference ?? false, endDate: prev.endDate, reproductiveStatus: prev.reproductiveStatus }));
        onBack();
    };
    
    const handleReintegrate = async () => { if (!animal) return; await updateAnimal(animal.id, { isReference: false, status: 'Activo', endDate: undefined }); setIsReferenceActionsOpen(false); };
    const handlePermanentDelete = async () => { if (!animal) return; await deleteAnimalPermanently(animal.id); onBack(); };
    const handleSaveWean = async (data: { weaningDate: string, weaningWeight: number }) => {
        if (!animal) return;
        await updateAnimal(animal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight });
        if (addEvent) addEvent({ animalId: animal.id, date: data.weaningDate, type: 'Destete', details: `Destete: ${data.weaningWeight} Kg.`, metaWeight: data.weaningWeight });
        setWeanModalOpen(false);
    };
    const handleSaveQuickParent = async (newParent: Animal) => { if (isParentModalOpen === 'father') { setEditedData(prev => ({ ...prev, fatherId: newParent.id })); allFathers.push(newParent); } else if (isParentModalOpen === 'mother') { setEditedData(prev => ({ ...prev, motherId: newParent.id })); mothers.push(newParent); } setIsParentModalOpen(null); };
    const handleExportPedigree = async () => { if (!pdfChartRef.current || !animal) return; setIsExporting(true); await exportPedigreeToPDF(pdfChartRef.current, animal); setIsExporting(false); };
    const handleDecommissionSelect = (reason: 'Venta' | 'Muerte' | 'Descarte') => { setDecommissionReason(reason); setDecommissionSheetOpen(false); setIsDecommissionModalOpen(true); };
    
    
    // Handlers conectados
    const handleStartDrying = (id: string) => { startDryingProcess(id); setIsMilkModalOpen(false); };
    const handleSetDry = (id: string) => { setLactationAsDry(id); setIsMilkModalOpen(false); };

    // --- ACCIONES DE MENÚS ---
    const decommissionActions: ActionSheetAction[] = [ { label: "Por Venta", icon: DollarSign, onClick: () => handleDecommissionSelect('Venta') }, { label: "Por Muerte", icon: HeartCrack, onClick: () => handleDecommissionSelect('Muerte'), color: 'text-brand-red' }, { label: "Por Descarte", icon: Ban, onClick: () => handleDecommissionSelect('Descarte'), color: 'text-brand-red' }, ];
    const referenceActions: ActionSheetAction[] = [ { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate }, { label: "Eliminar Permanentemente", icon: Trash2, onClick: () => setIsDeleteConfirmationOpen(true), color: 'text-brand-red' } ];

    if (!animal) return null;

    const formattedName = animal.name ? animal.name.toUpperCase().trim() : '';
    const displayFormattedName = isEditing ? (editedData.name || '') : formattedName;
    const displayId = (isEditing ? (editedData.id || '') : animal.id.toUpperCase()).toUpperCase();
    
    // --- LÓGICA DE MENÚ DE PESO ---
    const getWeightMenuActions = (): ActionSheetAction[] => {
        const actions: ActionSheetAction[] = [
            { 
                label: 'Ver Perfil de Crecimiento', 
                icon: BarChart2, 
                onClick: () => navigateTo({ name: 'growth-profile', animalId: animal.id }) 
            },
            {
                label: 'Nuevo Pesaje Corporal',
                icon: Scale,
                onClick: () => { setIsWeightMenuOpen(false); setIsWeightModalOpen(true); }
            }
        ];

        if (!animal.weaningDate && !animal.isReference) {
            actions.push({
                label: 'Registrar Destete',
                icon: Award,
                onClick: () => { setIsWeightMenuOpen(false); setWeanModalOpen(true); },
                color: 'text-yellow-400'
            });
        }

        if (animal.sex === 'Hembra' && !animal.isReference) {
            actions.push({
                label: 'Registrar Peso 1er Servicio',
                icon: CheckCircle2,
                onClick: () => { setIsWeightMenuOpen(false); setIsServiceWeightModalOpen(true); },
                color: 'text-pink-400'
            });
        }

        return actions;
    };

    const quickActions = [
        ...(animal.sex === 'Hembra' ? [
            { label: "Leche", icon: Droplets, onClick: () => navigateTo({ name: 'lactation-profile', animalId: animal.id }), color: "text-blue-300", disabled: false },
            // --- NUEVO BOTÓN DE SERVICIO ---
            { label: "Servicio", icon: Heart, onClick: () => setIsServiceModalOpen(true), color: "text-pink-500", disabled: animal.isReference },
            
            { label: "Parto", icon: Baby, onClick: () => setParturitionModalOpen(true), color: "text-pink-400", disabled: animal.isReference },
            { label: "Aborto", icon: HeartCrack, onClick: () => setIsAbortionModalOpen(true), color: "text-yellow-400", disabled: animal.isReference }
        ] : []),
        { label: "Kilos", icon: Scale, onClick: () => navigateTo({ name: 'growth-profile', animalId: animal.id }), color: "text-brand-green", disabled: false },
        { label: "Sanidad", icon: Syringe, onClick: () => alert('Función en desarrollo'), color: "text-teal-300", disabled: animal.isReference },
        ...(!animal.isReference ? [
            { label: "Mover", icon: Replace, onClick: () => setLotChangeModalOpen(true), color: "text-brand-blue", disabled: isEditing },
            { label: "Dar de Baja", icon: Archive, onClick: () => setDecommissionSheetOpen(true), color: "text-amber-400", disabled: isEditing }
        ] : [
            { label: "Acciones", icon: Replace, onClick: () => setIsReferenceActionsOpen(true), color: "text-brand-blue", disabled: isEditing }
        ])
    ];

    return (
        <>
            <div ref={parentRef} className="w-full max-w-2xl mx-auto bg-c-bg min-h-screen text-c-text-strong flex flex-col">
                {/* Barra de acciones fija y delgada (siempre accesible) */}
                <header className="px-4 py-3 sticky top-0 z-20 bg-c-bg/95 backdrop-blur-sm border-b border-c-border flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center gap-1 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={20} /><span>Volver</span></button>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancel} className="bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold py-2 px-4 rounded-lg flex items-center gap-2"><X size={18} /></button>
                                <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-c-accent hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">{saveStatus === 'saving' ? <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : <Save size={18} />}</button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => toggleFavorite(animal.id)}
                                    title={isFavorite(animal.id) ? 'Quitar de favoritos' : 'Marcar como favorito'}
                                    className={`p-2 rounded-lg transition-colors ${isFavorite(animal.id) ? 'text-c-accent-gold bg-c-accent-gold/15' : 'text-c-text-faint hover:text-c-text hover:bg-c-surface-2'}`}
                                >
                                    <Star size={18} className={isFavorite(animal.id) ? 'fill-current' : ''} />
                                </button>
                                <button onClick={() => setIsEditing(true)} className={`bg-c-accent/15 hover:bg-c-accent/25 text-c-accent font-bold py-2 px-4 rounded-lg flex items-center gap-2`}><Edit size={16} /><span>Editar</span></button>
                            </>
                        )}
                    </div>
                </header>

                <main className="px-4 space-y-4 pb-32 flex-1">
                    {/* Aviso de baja: identifica rápido si el animal está vendido/muerto/descartado */}
                    {animal.isReference && (
                        <div className="mt-4 flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 rounded-xl px-3 py-2.5">
                            <Archive size={18} className="text-brand-red shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-brand-red leading-tight">DE BAJA · {animal.status}</p>
                                <p className="text-[11px] text-c-text-muted leading-tight">
                                    {animal.status === 'Descarte' && animal.cullReason ? animal.cullReason : ''}
                                    {animal.status === 'Muerte' && animal.deathReason ? animal.deathReason : ''}
                                    {animal.endDate ? `${(animal.cullReason || animal.deathReason) ? ' · ' : ''}${new Date(animal.endDate + 'T00:00:00Z').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ''}
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Identidad del animal (en el flujo, ya no fijo) */}
                    <div className="pt-4 space-y-2">
                        {isEditing ? ( <FormInput type="text" value={displayId} disabled={appConfig.lockAnimalIdEditing !== false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))} placeholder="ID DEL ANIMAL" title={appConfig.lockAnimalIdEditing !== false ? 'ID protegido. Actívalo en Configuración → Seguridad para editarlo.' : 'Edición de ID habilitada'} className={`text-2xl font-mono font-bold tracking-tight text-c-text p-2 ${appConfig.lockAnimalIdEditing !== false ? 'opacity-60' : ''}`} /> ) : ( <h1 className="text-2xl font-mono font-bold tracking-tight text-c-text truncate">{displayId}</h1> )}
                        {isEditing ? ( <FormInput type="text" value={displayFormattedName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))} placeholder="Nombre del Animal" className="text-lg text-c-text-muted p-2" /> ) : ( <p className="text-lg text-c-text-muted truncate -mt-1">{displayFormattedName}</p> )}
                        {!isEditing && <FamachaProfileBadge animalId={animal.id} />}
                    </div>

                    {/* Centro de alertas del animal */}
                    {!isEditing && animalAlerts.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wide">
                                <AlertCircle size={14} /> Alertas ({animalAlerts.length})
                            </div>
                            {animalAlerts.map((al) => (
                                <div key={al.id} className="flex items-start gap-2">
                                    <al.icon size={16} className={`${al.color} mt-0.5 shrink-0`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-c-text leading-tight">{al.title}</p>
                                        <p className="text-xs text-c-text-muted leading-tight">{al.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Acciones Rápidas */}
                    {!isEditing && <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>{quickActions.map((action) => ( <button key={action.label} onClick={action.onClick} disabled={action.disabled} className={`flex-shrink-0 flex items-center gap-2 bg-c-surface-2 hover:bg-c-surface-3 ${action.color} font-semibold px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}><action.icon size={14} /><span>{action.label}</span></button>))}</div>}

                    <div className="flex bg-c-surface-2 rounded-xl p-1 border border-c-border">
                        <button onClick={() => setActiveTab('ficha')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'ficha' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>Ficha</button>
                        <button onClick={() => setActiveTab('genealogia')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genealogia' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>Genealogía</button>
                        <button onClick={() => setActiveTab('progenie')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'progenie' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>Progenie</button>
                        <button onClick={() => setActiveTab('eventos')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'eventos' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>Eventos</button>
                    </div>

                    {activeTab === 'ficha' && (
                        <div className="space-y-4">
                            <MainInfoTab
                                animal={animal}
                                isNativo={isNativo}
                                isEditing={isEditing}
                                editedData={editedData}
                                setEditedData={setEditedData}
                                origins={origins}
                                lots={lots}
                                onAddOriginClick={() => setAddOriginModalOpen(true)}
                                onAddLotClick={() => setAddLotModalOpen(true)}
                                allFathers={allFathers}
                                mothers={mothers}
                                navigateTo={navigateTo}
                                statusObjects={statusObjects}
                                showReproductive={showReproductive}
                                showLactation={showLactation}
                                onOpenPedigree={() => setIsPedigreeModalOpen(true)}
                                onOpenLegend={() => setIsStatusLegendOpen(true)}
                                indicators={indicators}
                                indicatorsLoading={indicatorsLoading}
                                onEditFather={() => setFatherSelectorOpen(true)}
                                onEditMother={() => setMotherSelectorOpen(true)}
                            />
                            {!isEditing && <div className="pt-2"><h3 className="text-[10px] font-bold uppercase tracking-widest text-c-text-faint mb-2 px-1">Actividad Reciente</h3><RecentEvents events={animalEvents} /></div>}
                        </div>
                    )}
                    {activeTab === 'genealogia' && <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border min-h-[200px]"><GeneticsTab animal={animal} rootNode={pedigreeRoot} navigateTo={navigateTo} onExportPDF={handleExportPedigree} isExporting={isExporting} /></div>}
                    {activeTab === 'progenie' && <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border min-h-[200px]"><ProgenyTab offspring={progeny} navigateTo={navigateTo} /></div>}
                    {activeTab === 'eventos' && <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border min-h-[200px]"><EventsTab events={animalEvents} /></div>}
                </main>
            </div>

            <HiddenPdfChart ref={pdfChartRef} rootNode={pedigreeRoot} />

            {/* MODALES DE ACCIÓN */}
            <Modal isOpen={isLotChangeModalOpen} onClose={() => setLotChangeModalOpen(false)} title={`Mover a ${formatAnimalDisplay(animal)}`}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-c-text-muted mb-1">Seleccionar nuevo lote</label><div className="flex items-center gap-2"><FormSelect value={selectedNewLot} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedNewLot(e.target.value)}><option value="">Sin Asignar</option>{lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}</FormSelect><button type="button" onClick={() => { setLotChangeModalOpen(false); setAddLotModalOpen(true); }} className="p-3 bg-c-accent hover:bg-green-600 text-white rounded-xl"><PlusCircle size={24} /></button></div></div>
                    <div className="flex justify-end gap-3 pt-2"><button onClick={() => setLotChangeModalOpen(false)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">Cancelar</button><button onClick={handleUpdateLocation} className="px-5 py-2 bg-c-accent hover:bg-green-600 text-white font-bold rounded-lg">Guardar Cambio</button></div>
                </div>
            </Modal>
            
            <ActionSheetModal isOpen={isDecommissionSheetOpen} onClose={() => setDecommissionSheetOpen(false)} title="Causa de la Baja" actions={decommissionActions} />
            {isDecommissionModalOpen && decommissionReason && (<DecommissionAnimalModal isOpen={true} animal={animal} reason={decommissionReason} onCancel={() => setIsDecommissionModalOpen(false)} onConfirm={handleDecommissionConfirm} />)}
            <ActionSheetModal isOpen={isReferenceActionsOpen} onClose={() => setIsReferenceActionsOpen(false)} title="Acciones de Referencia" actions={referenceActions} />
            <ConfirmationModal isOpen={isDeleteConfirmationOpen} onClose={() => setIsDeleteConfirmationOpen(false)} onConfirm={handlePermanentDelete} title={`¿Eliminar ${formatAnimalDisplay(animal)} Permanentemente?`} message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer." />
            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
            <AddOriginModal isOpen={isAddOriginModalOpen} onClose={() => setAddOriginModalOpen(false)} />
            {isParturitionModalOpen && <ParturitionModal isOpen={true} onClose={() => setParturitionModalOpen(false)} motherId={animal.id} />}
            {isAbortionModalOpen && <DeclareAbortionModal animal={animal} onCancel={() => setIsAbortionModalOpen(false)} onSaveSuccess={() => setIsAbortionModalOpen(false)} />}
            
            {/* MODAL DE SERVICIO (Conectado) */}
            {isServiceModalOpen && <DeclareServiceModal isOpen={true} onClose={() => setIsServiceModalOpen(false)} onSaved={() => setIsServiceModalOpen(false)} animal={animal} />}
            
            {/* Nuevo Menú de Peso */}
            <ActionSheetModal isOpen={isWeightMenuOpen} onClose={() => setIsWeightMenuOpen(false)} title="Gestión de Crecimiento" actions={getWeightMenuActions()} />

            {isMilkModalOpen && (<MilkWeighingActionModal isOpen={true} animal={animal} onClose={() => setIsMilkModalOpen(false)} onLogToSession={() => {}} onStartNewSession={() => {}} onStartDrying={(id: string) => handleStartDrying(id)} onSetDry={(id: string) => handleSetDry(id)} />)}
            {isWeightModalOpen && (<BodyWeighingActionModal isOpen={true} animal={animal} onClose={() => setIsWeightModalOpen(false)} onLogToSession={() => {}} onStartNewSession={() => {}} onSetReadyForMating={async () => { await updateAnimal(animal.id, { reproductiveStatus: 'En Servicio' }); setIsWeightModalOpen(false); }} />)}
            {isServiceWeightModalOpen && (<DeclareServiceWeightModal isOpen={true} onClose={() => setIsServiceWeightModalOpen(false)} animal={animal} currentWeight={growthStatus?.currentWeight || 0} suggestedDate={growthStatus?.currentWeightDate} />)}

            <WeanAnimalForm isOpen={isWeanModalOpen} animalId={animal.id} birthDate={animal.birthDate} onCancel={() => setWeanModalOpen(false)} onSave={handleSaveWean} defaultDate={weaningCandidateInfo?.date} defaultWeight={weaningCandidateInfo?.weight} />
            
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, motherId: id })); setMotherSelectorOpen(false); }} animals={mothers} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, fatherId: id })); setFatherSelectorOpen(false); }} animals={allFathers} title="Seleccionar Padre" filterSex="Macho" />
            {isParentModalOpen && <AddQuickParentModal type={isParentModalOpen} onClose={() => setIsParentModalOpen(null)} onSave={handleSaveQuickParent} />}
            <Modal isOpen={isPedigreeModalOpen} onClose={() => setIsPedigreeModalOpen(false)} title={`Genealogía de ${formatAnimalDisplay(animal)}`} size="fullscreen"><div className="w-full h-full overflow-auto p-4 bg-c-bg"><div className="flex justify-end mb-4"><button onClick={handleExportPedigree} disabled={isExporting} className="flex items-center gap-2 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50"><Printer size={16} />{isExporting ? 'Generando...' : 'Exportar PDF'}</button></div><PedigreeChart rootNode={pedigreeRoot} onAncestorClick={(id: string) => { setIsPedigreeModalOpen(false); setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: id }), 50); }} /></div></Modal>
            <StatusLegendModal isOpen={isStatusLegendOpen} onClose={() => setIsStatusLegendOpen(false)} />
        </>
    );
}