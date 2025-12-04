import { useState, useMemo } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { QuickActionType } from '../ui/QuickActionFab';
import { Animal } from '../../db/local';

interface QuickActionAnimalSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: QuickActionType | null;
    onAnimalSelect: (animal: Animal) => void;
}

export const QuickActionAnimalSelector = ({ isOpen, onClose, actionType, onAnimalSelect }: QuickActionAnimalSelectorProps) => {
    const { animals } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAnimals = useMemo(() => {
        if (!actionType) return [];

        // 1. FILTRO BASE: Solo animales ACTIVOS en el rebaño (Nada de Referencias ni Vendidos)
        let candidates = animals.filter(a => a.status === 'Activo' && !a.isReference);

        // 2. FILTROS DE NEGOCIO (Lógica Zootécnica)
        switch (actionType) {
            case 'parto':
            case 'servicio_visto':
                // VIENTRES: Solo Hembras que ya son Cabras o Cabritonas
                candidates = candidates.filter(a => 
                    a.sex === 'Hembra' && 
                    (a.lifecycleStage === 'Cabra' || a.lifecycleStage === 'Cabritona')
                );
                break;

            case 'secado':
                // LACTANCIA ACTIVA: Por definición son Cabras (Adultas)
                // Nota: Si tuvieras un status 'Lactante' explícito lo usaríamos, 
                // pero filtrar por 'Cabra' es lo más seguro para abarcar a todas las posibles.
                candidates = candidates.filter(a => 
                    a.sex === 'Hembra' && 
                    a.lifecycleStage === 'Cabra'
                );
                break;

            case 'destete':
                // CRÍAS: Machos y Hembras jóvenes
                candidates = candidates.filter(a => 
                    ['Cabrito', 'Cabrita', 'Macho de Levante', 'Cría'].includes(a.lifecycleStage || '')
                );
                break;

            case 'peso_servicio':
                // CABRITONAS: Solo hembras en desarrollo próximas a servicio
                candidates = candidates.filter(a => 
                    a.sex === 'Hembra' && 
                    (a.lifecycleStage === 'Cabritona' || a.lifecycleStage === 'Cabrita')
                );
                break;
        }

        // 3. BUSCADOR (Deducción por texto)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            candidates = candidates.filter(a => 
                a.id.toLowerCase().includes(term) || 
                (a.name && a.name.toLowerCase().includes(term))
            );
        }

        // Ordenar alfabéticamente por ID para facilitar búsqueda visual
        return candidates.sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, actionType, searchTerm]);

    if (!isOpen) return null;

    const getTitle = () => {
        switch (actionType) {
            case 'parto': return 'Registrar Parto';
            case 'secado': return 'Registrar Secado';
            case 'destete': return 'Registrar Destete';
            case 'peso_servicio': return 'Peso 1er Servicio';
            case 'servicio_visto': return 'Servicio Visto';
            default: return 'Seleccionar Animal';
        }
    };

    return (
        // Estructura Mobile First (Bottom Sheet)
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            
            <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl h-[85vh] sm:h-[600px] flex flex-col shadow-2xl transition-all">
                
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">{getTitle()}</h2>
                        <p className="text-xs text-zinc-400">Selecciona el animal ({filteredAnimals.length} disponibles)</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar Sticky */}
                <div className="p-4 pb-2 shrink-0 bg-[#121214]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar ID o Nombre..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all placeholder:text-zinc-600 text-base"
                        />
                    </div>
                </div>

                {/* Listado */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-10">
                    {filteredAnimals.map(animal => (
                        <button 
                            key={animal.id}
                            onClick={() => onAnimalSelect(animal)}
                            className="w-full flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98] transition-all group text-left"
                        >
                            <div>
                                <span className="font-mono font-bold text-white text-base block">{animal.id}</span>
                                <span className="text-xs text-zinc-500 font-medium flex gap-2">
                                    <span>{animal.name || 'Sin Nombre'}</span>
                                    <span className="text-zinc-700">•</span>
                                    <span className="text-brand-blue">{animal.lifecycleStage}</span>
                                </span>
                            </div>
                            <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" size={20} />
                        </button>
                    ))}
                    
                    {filteredAnimals.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                            <Search size={32} className="opacity-20" />
                            <p className="text-sm font-medium">No hay animales aptos.</p>
                            <p className="text-xs opacity-60 text-center px-4">
                                No se encontraron animales activos que cumplan con el criterio para esta acción.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};