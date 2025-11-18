// src/pages/RebanoProfilePage.tsx
// (ACTUALIZADO: Añade la lógica 'isNativo' y la pasa al Tab)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import {
    ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace, CheckCircle,
    Baby, AlertTriangle, Archive,
    DollarSign, HeartCrack, Ban, RefreshCw, Trash2, Award,
    PlusCircle,
    Printer
} from 'lucide-react'; 

// --- Modales y UI ---
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

// --- Componentes de Pestañas ---
import { MainInfoTab } from '../components/profile/MainInfoTab';
import { GeneticsTab } from '../components/profile/GeneticsTab';
import { ProgenyTab } from '../components/profile/ProgenyTab';
import { EventsTab } from '../components/profile/EventsTab';
import { RecentEvents } from '../components/profile/RecentEvents';
import { HiddenPdfChart } from '../components/profile/HiddenPdfChart';
import { PedigreeChart } from '../components/pedigree/PedigreeChart';

// --- Hooks y Utilitarios ---
import type { PageState } from '../types/navigation';
import { Animal, BodyWeighing } from '../db/local';
import { useEvents } from '../hooks/useEvents';
import { usePedigree } from '../hooks/usePedigree';
import { useAnimalStatus } from '../hooks/useAnimalStatus';
import { useAnimalIndicators } from '../hooks/useAnimalIndicators';
import { exportPedigreeToPDF } from '../utils/pdfExporter';
import {
    getAnimalZootecnicCategory, 
    calculateBreedFromComposition, 
    calculateAgeInDays, 
    calculateChildComposition
} from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';

// Interfaz de la página
interface RebanoProfilePageProps {
    animalId: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
    contextDate?: string; 
}

// Tipo para los campos manuales de indicadores
type ManualIndicatorFields = {
    priorParturitions?: number;
    manualFirstParturitionDate?: string;
};


// --- COMPONENTE PRINCIPAL RebanoProfilePage ---
export default function RebanoProfilePage({ 
    animalId, 
    onBack, 
    navigateTo, 
    contextDate 
}: RebanoProfilePageProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const pdfChartRef = useRef<HTMLDivElement>(null);

    // --- Hooks de Datos ---
    const { animals, lots, origins, parturitions, updateAnimal, deleteAnimalPermanently, fathers, appConfig, bodyWeighings } = useData();

    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);
    const events = useEvents(animal ? animal.id : undefined);
    const pedigreeRoot = usePedigree(animalId);
    const statusObjects = useAnimalStatus(animal as Animal);
    const { indicators, loading: indicatorsLoading } = useAnimalIndicators(animal, parturitions);

    // --- Estado de la Página ---
    // ... (sin cambios) ...
    const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);
    const [isStatusLegendOpen, setIsStatusLegendOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'main' | 'genetics' | 'progeny' | 'events'>('main');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<Animal & ManualIndicatorFields>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const [isAddOriginModalOpen, setAddOriginModalOpen] = useState(false);
    const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);
    const [isAbortionModalOpen, setIsAbortionModalOpen] = useState(false); 
    const [isLotChangeModalOpen, setLotChangeModalOpen] = useState(false);
    const [selectedNewLot, setSelectedNewLot] = useState('');
    const [isDecommissionSheetOpen, setDecommissionSheetOpen] = useState(false);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [isReferenceActionsOpen, setIsReferenceActionsOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isWeanModalOpen, setWeanModalOpen] = useState(false);
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isParentModalOpen, setIsParentModalOpen] = useState<'mother' | 'father' | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- Lógica de Datos Derivados (useMemo) ---
    
    // --- (NUEVO) Determinar si el animal es Nativo ---
    const isNativo = useMemo(() => {
        if (!animal) return false;
        // La lógica de 'calculations.ts': es nativo si aparece como cría en un parto.
        return parturitions.some(p => 
            p.liveOffspring && p.liveOffspring.some(kid => kid.id === animal.id)
        );
    }, [animal, parturitions]);

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
    
    const weaningCandidateInfo = useMemo(() => {
        if (!animal || !animal.birthDate || animal.birthDate === 'N/A') return null;
        if (animal.weaningDate) return null;
        const animalWeighings = bodyWeighings
            .filter(w => w.animalId === animal.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (animalWeighings.length === 0) return null;
        let weighingToEvaluate: BodyWeighing | undefined;
        if (contextDate) {
            weighingToEvaluate = animalWeighings.find(w => w.date === contextDate);
        } else {
            weighingToEvaluate = animalWeighings[0];
        }
        if (!weighingToEvaluate) return null;
        const weighDate = weighingToEvaluate.date;
        const weighKg = weighingToEvaluate.kg;
        const ageAtWeighing = calculateAgeInDays(animal.birthDate, weighDate);
        const metaEdad = appConfig.diasMetaDesteteFinal;
        const metaPeso = appConfig.pesoMinimoDesteteFinal;
        const pesoMinimoConTolerancia = metaPeso - 0.1;
        const meetsMinAge = ageAtWeighing >= metaEdad;
        const meetsMinWeight = weighKg >= pesoMinimoConTolerancia;
        if (meetsMinAge && meetsMinWeight) {
            return { date: weighDate, weight: weighKg };
        }
        return null;
    }, [animal, bodyWeighings, appConfig, contextDate]);

    const breedingFailures = animal?.breedingFailures || 0;
    
    const alertInfo = useMemo(() => {
        if (!animal) return null;
        if (weaningCandidateInfo) {
            return {
                text: `Listo para Destete`, 
                icon: <Award className="text-yellow-400 animate-pulse" size={20} />,
                title: `Candidato a destete basado en el pesaje del ${weaningCandidateInfo.date} (${weaningCandidateInfo.weight} Kg)`
            };
        }
        if (breedingFailures >= 2) {
            return {
                text: `${breedingFailures} Fallos Reprod.`,
                icon: <AlertTriangle className="text-brand-red" size={20} />,
                title: `${breedingFailures} fallos reproductivos reportados`
            };
        }
        if (breedingFailures === 1) {
            return {
                text: `1 Fallo Reprod.`,
                icon: <AlertTriangle className="text-yellow-400" size={20} />,
                title: `1 fallo reproductivo reportado`
            };
        }
        return null;
    }, [animal, weaningCandidateInfo, breedingFailures]);


    // --- Efectos (useEffect) ---
    // ... (sin cambios) ...
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
                    // --- (NUEVO) Añadir lifecycleStage a los datos editables ---
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

    // --- Manejadores de Eventos (Handlers) ---
    // ... (sin cambios) ...
    const handleSave = async () => {
        if (!animal) return;
        if (editedData.id && editedData.id.trim() === '') {
             alert("Error: El ID no puede estar vacío.");
             setSaveStatus('idle');
             return;
        }
        if (editedData.id && editedData.id !== animal.id) {
            console.error("Cambio de ID detectado.");
            alert("Error: El cambio de ID no está soportado.");
            setSaveStatus('idle');
            return;
        }
        setSaveStatus('saving');
        try {
            const { id, ...finalData } = editedData;
            if (editedData.racialComposition !== animal.racialComposition) {
                (finalData as Partial<Animal>).breed = calculateBreedFromComposition(editedData.racialComposition);
            }
            
            // (ACTUALIZADO) Esta lógica ahora usa la 'getAnimalZootecnicCategory' 100% correcta
            if (editedData.birthDate && editedData.birthDate !== animal.birthDate) {
                // Solo recalcula la categoría si es Nativo O si el usuario no la cambió manualmente
                if(isNativo || finalData.lifecycleStage === animal.lifecycleStage) {
                    (finalData as Partial<Animal>).lifecycleStage = getAnimalZootecnicCategory({ ...animal, ...finalData } as Animal, parturitions, appConfig) as any;
                }
            }
            if ((finalData as any).manualFirstParturitionDate === '') {
                (finalData as any).manualFirstParturitionDate = undefined;
            }
            if ((finalData as any).priorParturitions === 0) {
                (finalData as any).priorParturitions = undefined;
            }
            await updateAnimal(animal.id, finalData);
            setSaveStatus('success');
            setTimeout(() => { setIsEditing(false); setSaveStatus('idle'); }, 1500);
        } catch (error) {
            console.error("Error al actualizar:", error);
            setSaveStatus('idle');
        }
    };
    const handleCancel = () => { setIsEditing(false); setEditedData({}); };
    const handleUpdateLocation = async () => {
        if (!animal) return;
        try {
            await updateAnimal(animal.id, { location: selectedNewLot });
            setLotChangeModalOpen(false);
        } catch (error) {
            console.error("Error al actualizar ubicación:", error);
        }
    };
    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!animal || !decommissionReason) return;
        const dataToUpdate: Partial<Animal> = { status: decommissionReason, isReference: true, endDate: details.date };
        if (decommissionReason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (decommissionReason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (decommissionReason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        try {
            await updateAnimal(animal.id, dataToUpdate);
            setDecommissionReason(null);
            onBack();
        } catch (error) {
            console.error("Error al dar de baja:", error);
            setDecommissionReason(null);
        }
    };
    
    const handleReintegrate = async () => { 
        if (!animal) return;
        await updateAnimal(animal.id, { isReference: false, status: 'Activo', endDate: undefined });
        setIsReferenceActionsOpen(false);
    };
    const handlePermanentDelete = async () => { if (!animal) return; await deleteAnimalPermanently(animal.id); onBack(); };
    const handleSaveWean = async (data: { weaningDate: string, weaningWeight: number }) => { if (!animal) return; await updateAnimal(animal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight }); setWeanModalOpen(false); };
    const handleSaveQuickParent = async (newParent: Animal) => {
        try {
            if (isParentModalOpen === 'father') {
                setEditedData(prev => ({ ...prev, fatherId: newParent.id }));
                allFathers.push(newParent); 
            }
            else if (isParentModalOpen === 'mother') {
                setEditedData(prev => ({ ...prev, motherId: newParent.id }));
                mothers.push(newParent); 
            }
        } catch (error) {
            console.error("Error saving quick parent:", error);
        }
        finally { setIsParentModalOpen(null); }
    };
    const handleExportPedigree = async () => {
        if (!pdfChartRef.current || !animal) {
            alert("Error: No se pudo encontrar el gráfico para exportar."); 
            return;
        }
        setIsExporting(true);
        try {
            await exportPedigreeToPDF(pdfChartRef.current, animal);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("Ocurrió un error al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };


    // --- Configuraciones de Acciones ---
    // ... (sin cambios) ...
    const decommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => setDecommissionReason('Venta') },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => setDecommissionReason('Muerte'), color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => setDecommissionReason('Descarte'), color: 'text-brand-red' },
    ];
    const referenceActions: ActionSheetAction[] = [
        { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate },
        { label: "Eliminar Permanentemente", icon: Trash2, onClick: () => setIsDeleteConfirmationOpen(true), color: 'text-brand-red' }
    ];

    // --- Renderizado Temprano (Loading/Error) ---
    if (!animal) { return (<div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div>); }

    // --- Variables de Renderizado ---
    // ... (sin cambios) ...
    const formattedName = animal.name ? animal.name.toUpperCase().trim() : '';
    const displayFormattedName = isEditing ? (editedData.name || '') : formattedName;
    const displayId = (isEditing ? (editedData.id || '') : animal.id.toUpperCase()).toUpperCase();

    // --- 'quickActions' (ACTUALIZADO) ---
    const quickActions = [
        ...(animal.sex === 'Hembra' ? [
            { label: "Leche", icon: Droplets, onClick: () => navigateTo({ name: 'lactation-profile', animalId: animal.id }), color: "text-blue-300", disabled: false },
            { label: "Parto", icon: Baby, onClick: () => setParturitionModalOpen(true), color: "text-pink-400", disabled: animal.isReference },
            { label: "Aborto", icon: HeartCrack, onClick: () => setIsAbortionModalOpen(true), color: "text-yellow-400", disabled: animal.isReference }
        ] : []),
        
        ...(weaningCandidateInfo ? [
            { 
                label: "Destetar", 
                icon: Award, 
                onClick: () => setWeanModalOpen(true), 
                color: "text-yellow-300", 
                disabled: false,
                isPulsing: true 
            }
        ] : []),
        
        { label: "Peso", icon: Scale, onClick: () => navigateTo({ name: 'growth-profile', animalId: animal.id }), color: "text-brand-green", disabled: false },
        { label: "Sanidad", icon: Syringe, onClick: () => alert('Función en desarrollo'), color: "text-teal-300", disabled: animal.isReference },
        ...(!animal.isReference ? [
            { label: "Mover", icon: Replace, onClick: () => setLotChangeModalOpen(true), color: "text-brand-blue", disabled: isEditing },
            { label: "Dar de Baja", icon: Archive, onClick: () => setDecommissionSheetOpen(true), color: "text-amber-400", disabled: isEditing }
        ] : [
            { label: "Acciones", icon: Replace, onClick: () => setIsReferenceActionsOpen(true), color: "text-brand-blue", disabled: isEditing }
        ])
    ];

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            <div
                ref={parentRef}
                className="w-full max-w-2xl mx-auto"
            >
                {/* --- Header --- */}
                <header className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <button onClick={onBack} className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                            <span>Volver</span>
                        </button>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={handleCancel} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                        <X size={18} />
                                    </button>
                                    <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
                                        {saveStatus === 'saving' && <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />}
                                        {saveStatus === 'success' && <CheckCircle size={18} />}
                                        {saveStatus === 'idle' && <Save size={18} />}
                                        {saveStatus === 'idle' && <span>Guardar</span>}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className={`bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange font-bold py-2 px-4 rounded-lg flex items-center gap-2`}>
                                    <Edit size={16} />
                                    <span>Editar</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                            {isEditing ? (
                                <FormInput
                                    type="text"
                                    value={displayId}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                                    placeholder="ID DEL ANIMAL"
                                    className="text-2xl font-mono font-bold tracking-tight text-white p-2"
                                />
                            ) : (
                                <h1 className="text-2xl font-mono font-bold tracking-tight text-white truncate">{displayId}</h1>
                            )}
                            {isEditing ? (
                                <FormInput
                                    type="text"
                                    value={displayFormattedName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                                    placeholder="Nombre del Animal"
                                    className="text-lg text-zinc-400 -mt-0 p-2"
                                />
                            ) : (
                                <p className="text-lg text-zinc-400 truncate -mt-1">{displayFormattedName}</p>
                            )}
                        </div>
                        {alertInfo && !isEditing && (
                            <div title={alertInfo.title} className="flex-shrink-0 ml-4">
                                {alertInfo.icon}
                            </div>
                        )}
                    </div>
                    {!isEditing && (
                        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={`flex-shrink-0 flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 ${action.color} font-semibold px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                        (action as any).isPulsing ? 'animate-pulse' : ''
                                    }`}
                                >
                                    <action.icon size={14} />
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {/* --- Main Tabs --- */}
                <main className="px-4 space-y-4">
                    <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                        <button onClick={() => setActiveTab('main')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'main' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Ficha</button>
                        <button onClick={() => setActiveTab('genetics')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genetics' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Genealogía</button>
                        <button onClick={() => setActiveTab('progeny')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'progeny' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Progenie</button>
                        <button onClick={() => setActiveTab('events')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Eventos</button>
                    </div>

                    {activeTab === 'main' && (
                        <div className="space-y-4">
                            <MainInfoTab
                                animal={animal}
                                // --- (NUEVO) Prop 'isNativo' pasada al Tab ---
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
                                onOpenPedigree={() => setIsPedigreeModalOpen(true)}
                                onOpenLegend={() => setIsStatusLegendOpen(true)}
                                indicators={indicators}
                                indicatorsLoading={indicatorsLoading}
                                onEditFather={() => setFatherSelectorOpen(true)}
                                onEditMother={() => setMotherSelectorOpen(true)}
                            />
                            {!isEditing && (
                                <div className="pt-4">
                                    <RecentEvents events={events} />
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'genetics' && (
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <GeneticsTab
                                animal={animal}
                                rootNode={pedigreeRoot}
                                navigateTo={navigateTo}
                                onExportPDF={handleExportPedigree}
                                isExporting={isExporting}
                            />
                        </div>
                    )}
                    {activeTab === 'progeny' && (
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <ProgenyTab offspring={progeny} navigateTo={navigateTo} />
                        </div>
                    )}
                    {activeTab === 'events' && (
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <EventsTab events={events as any[]} />
                        </div>
                    )}
                </main>
            </div>

            <HiddenPdfChart ref={pdfChartRef} rootNode={pedigreeRoot} />

            {/* --- Modales --- */}
            {/* (Omitidos por brevedad, sin cambios) */}
            <Modal isOpen={isLotChangeModalOpen} onClose={() => setLotChangeModalOpen(false)} title={`Mover a ${formatAnimalDisplay(animal)}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar nuevo lote</label>
                        <div className="flex items-center gap-2">
                            <FormSelect value={selectedNewLot} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedNewLot(e.target.value)}>
                                <option value="">Sin Asignar</option>
                                {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                            </FormSelect>
                            <button type="button" onClick={() => { setLotChangeModalOpen(false); setAddLotModalOpen(true); }} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><PlusCircle size={24} /></button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setLotChangeModalOpen(false)} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                        <button onClick={handleUpdateLocation} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">Guardar Cambio</button>
                    </div>
                </div>
            </Modal>
            
            <ActionSheetModal isOpen={isDecommissionSheetOpen} onClose={() => setDecommissionSheetOpen(false)} title="Causa de la Baja" actions={decommissionActions} />

            {decommissionReason && animal && (
                <DecommissionAnimalModal
                    isOpen={!!decommissionReason}
                    animal={animal}
                    onCancel={() => setDecommissionReason(null)}
                    onConfirm={handleDecommissionConfirm}
                    reason={decommissionReason}
                />
            )}

            <ActionSheetModal isOpen={isReferenceActionsOpen} onClose={() => setIsReferenceActionsOpen(false)} title="Acciones de Referencia" actions={referenceActions} />
            <ConfirmationModal isOpen={isDeleteConfirmationOpen} onClose={() => setIsDeleteConfirmationOpen(false)} onConfirm={handlePermanentDelete} title={`¿Eliminar ${formatAnimalDisplay(animal)} Permanentemente?`} message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer." />
            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
            <AddOriginModal isOpen={isAddOriginModalOpen} onClose={() => setAddOriginModalOpen(false)} />
            <ParturitionModal isOpen={isParturitionModalOpen} onClose={() => setParturitionModalOpen(false)} motherId={animal.id} />
            
            {isAbortionModalOpen && (
                <DeclareAbortionModal
                    animal={animal}
                    onCancel={() => setIsAbortionModalOpen(false)}
                    onSaveSuccess={() => setIsAbortionModalOpen(false)}
                />
            )}

            {isWeanModalOpen && (
                <Modal isOpen={isWeanModalOpen} onClose={() => setWeanModalOpen(false)} title={`Confirmar Destete de ${formatAnimalDisplay(animal)}`}> 
                    <WeanAnimalForm 
                        animalId={animal.id} 
                        birthDate={animal.birthDate} 
                        onSave={handleSaveWean} 
                        onCancel={() => setWeanModalOpen(false)} 
                        defaultDate={weaningCandidateInfo?.date}
                        defaultWeight={weaningCandidateInfo?.weight}
                    /> 
                </Modal>
            )}

            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, motherId: id })); setMotherSelectorOpen(false); }} animals={mothers} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, fatherId: id })); setFatherSelectorOpen(false); }} animals={allFathers} title="Seleccionar Padre" filterSex="Macho" />
            {isParentModalOpen && <AddQuickParentModal type={isParentModalOpen} onClose={() => setIsParentModalOpen(null)} onSave={handleSaveQuickParent} />}

            <Modal isOpen={isPedigreeModalOpen} onClose={() => setIsPedigreeModalOpen(false)} title={`Genealogía de ${formatAnimalDisplay(animal)}`} size="fullscreen">
                <div className="w-full h-full overflow-auto p-4 bg-brand-darkest">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={handleExportPedigree}
                            disabled={isExporting}
                            className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                            <Printer size={16} />
                            {isExporting ? 'Generando...' : 'Exportar PDF'}
                        </button>
                    </div>
                    <PedigreeChart
                        rootNode={pedigreeRoot}
                        onAncestorClick={(id: string) => {
                            setIsPedigreeModalOpen(false);
                            setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: id }), 50);
                        }}
                    />
                </div>
            </Modal>

            <StatusLegendModal
                isOpen={isStatusLegendOpen}
                onClose={() => setIsStatusLegendOpen(false)}
            />
        </>
    );
}