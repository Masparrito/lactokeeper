import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell'; // Ruta de importación corregida
import { ArrowLeft, Plus, Heart, Search, Feather } from 'lucide-react'; // Iconos no usados eliminados
import { AddParturitionForm } from '../components/forms/AddParturitionForm';
import { Animal, ServiceRecord } from '../db/local'; // Tipos no usados eliminados
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { Modal } from '../components/ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// --- Estilos para el calendario ---
const calendarCss = `
  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #FBBF24; --rdp-background-color: #3a3a3c; --rdp-accent-color-dark: #FBBF24; --rdp-background-color-dark: #3a3a3c; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-outline-selected: 3px solid var(--rdp-accent-color); --rdp-border-radius: 6px; color: #FFF; margin: 1em; }
  .rdp-caption_label, .rdp-nav_button { color: #FBBF24; } .rdp-head_cell { color: #8e8e93; }
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
`;

// --- Componente para la Fila de una Hembra ---
const AssignedFemaleRow = ({ 
    animal, 
    services, 
    onDeclareService,
    onDeclareParturition,
    onSelect 
}: { 
    animal: Animal, 
    services: ServiceRecord[], 
    onDeclareService: (femaleId: string) => void,
    onDeclareParturition: (femaleId: string) => void,
    onSelect: (id: string) => void 
}) => {
    const serviceCount = services.length;
    const lastServiceDate = serviceCount > 0 
        ? new Date(services[services.length - 1].serviceDate + 'T00:00:00').toLocaleDateString('es-VE') 
        : null;

    return (
        <div className="w-full text-left bg-zinc-800/50 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <button onClick={() => onSelect(animal.id)} className="w-full sm:w-auto text-left">
                <p className="font-bold text-lg text-white">{animal.id}</p>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    {serviceCount > 0 ? (
                        <div className="flex items-center gap-1 text-pink-400 font-semibold">
                            <Heart size={14} fill="currentColor" />
                            <span>{serviceCount} {serviceCount > 1 ? 'Servicios' : 'Servicio'} ({lastServiceDate})</span>
                        </div>
                    ) : ( <span>Sin servicios reportados</span> )}
                </div>
            </button>
            <div className="w-full sm:w-auto flex flex-shrink-0 gap-2">
                <button onClick={() => onDeclareService(animal.id)} className="flex-1 sm:flex-initial bg-indigo-600/80 hover:bg-indigo-500/100 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">
                    Servicio
                </button>
                <button onClick={() => onDeclareParturition(animal.id)} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-500/100 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">
                    <Feather size={14} /> Parto
                </button>
            </div>
        </div>
    );
};


interface BreedingGroupDetailPageProps {
    groupId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function BreedingGroupDetailPage({ groupId, navigateTo, onBack }: BreedingGroupDetailPageProps) {
    const { breedingGroups, animals, parturitions, serviceRecords, updateAnimal, addServiceRecord } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceModal, setServiceModal] = useState<{ isOpen: boolean; femaleId: string | null }>({ isOpen: false, femaleId: null });
    const [parturitionModal, setParturitionModal] = useState<{ isOpen: boolean; femaleId: string | null }>({ isOpen: false, femaleId: null });
    
    const group = useMemo(() => breedingGroups.find(g => g.id === groupId), [breedingGroups, groupId]);

    const assignedFemales = useMemo(() => {
        if (!group) return [];
        return animals.filter(animal => animal.breedingGroupId === group.id).sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, group]);

    const filteredFemales = useMemo(() => {
        if (!searchTerm) return assignedFemales;
        return assignedFemales.filter(animal => animal.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [assignedFemales, searchTerm]);

    // Lógica de la función restaurada
    const handleAssignFemales = async (selectedIds: string[]) => {
        if (!group) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, {
                breedingGroupId: group.id,
                reproductiveStatus: 'En Servicio',
            });
        });
        try {
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Error al asignar hembras:", error);
        }
    };

    // Lógica de la función restaurada
    const handleDeclareService = async (date: Date | undefined) => {
        if (!date || !serviceModal.femaleId || !group) return;
        
        try {
            await addServiceRecord({
                breedingGroupId: group.id,
                femaleId: serviceModal.femaleId,
                serviceDate: date.toISOString().split('T')[0]
            });
        } catch (error) {
            console.error("Error al guardar el servicio:", error);
        } finally {
            setServiceModal({ isOpen: false, femaleId: null });
        }
    };

    if (!group) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Lote de Monta no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-amber">Volver</button></div>;

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-white">{group.name}</h1>
                        <p className="text-md text-zinc-400">Reproductor: {group.sireId}</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <button onClick={() => setSelectorOpen(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg">
                    <Plus size={20} /> Asignar Hembras
                </button>

                <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-lg font-semibold text-zinc-300">Hembras Asignadas ({filteredFemales.length})</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full bg-zinc-800/80 rounded-lg pl-10 pr-4 py-2 text-white border-transparent focus:border-brand-amber focus:ring-0" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        {filteredFemales.length > 0 ? (
                            filteredFemales.map(animal => {
                                const animalServices = serviceRecords.filter(sr => sr.femaleId === animal.id && sr.breedingGroupId === group.id).sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());
                                return <AssignedFemaleRow 
                                    key={animal.id} 
                                    animal={animal} 
                                    services={animalServices}
                                    onDeclareService={(id) => setServiceModal({ isOpen: true, femaleId: id })}
                                    onDeclareParturition={(id) => setParturitionModal({ isOpen: true, femaleId: id })}
                                    onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })}
                                />;
                            })
                        ) : (
                            <div className="text-center py-10 bg-brand-glass rounded-2xl">
                                <p className="text-zinc-500">{searchTerm ? 'No se encontraron coincidencias.' : 'Aún no has asignado hembras a este lote.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AdvancedAnimalSelector isOpen={isSelectorOpen} onClose={() => setSelectorOpen(false)} onSelect={handleAssignFemales} animals={animals} parturitions={parturitions} title={`Asignar Hembras a: ${group.name}`} sireIdForInbreedingCheck={group.sireId} />

            <Modal isOpen={serviceModal.isOpen} onClose={() => setServiceModal({ isOpen: false, femaleId: null })} title={`Declarar Servicio para ${serviceModal.femaleId}`}>
                <style>{calendarCss}</style>
                <div className="flex justify-center"><DayPicker mode="single" onSelect={handleDeclareService} /></div>
            </Modal>
            
            <Modal isOpen={parturitionModal.isOpen} onClose={() => setParturitionModal({ isOpen: false, femaleId: null })} title={`Registrar Parto para ${parturitionModal.femaleId}`}>
                <AddParturitionForm
                    motherId={parturitionModal.femaleId || ''}
                    onSaveSuccess={() => setParturitionModal({ isOpen: false, femaleId: null })}
                    onCancel={() => setParturitionModal({ isOpen: false, femaleId: null })}
                />
            </Modal>
        </>
    );
}