import React, { useState, useMemo } from 'react';
import type { PageState } from '../types/navigation';
// --- Iconos ---
import { 
    Plus, ChevronRight, HeartPulse, TrendingUp, Dna, 
    LayoutGrid, Heart, FlaskConical, Archive, Search, Baby 
} from 'lucide-react';
// ---
import { AddLotModal } from '../components/ui/AddLotModal';
import PhysicalLotsView from '../components/lots/PhysicalLotsView';
import BreedingLotsView from '../components/lots/BreedingLotsView';
import { Modal } from '../components/ui/Modal';
// ---
import { useHerdAnalytics } from '../hooks/useHerdAnalytics';
import { useData } from '../context/DataContext';
import { BreedingSeason } from '../db/local';
import { BreedingSeasonForm } from '../components/forms/BreedingSeasonForm';
import { formatAnimalDisplay } from '../utils/formatting';


// --- SUB-COMPONENTES ESTILIZADOS ---

const CategoryChip = ({ title, value, icon: Icon, onClick }: { 
    title: string, 
    value: string | number, 
    icon: React.ElementType, 
    onClick: () => void 
}) => (
    <button 
        onClick={onClick}
        className="flex-shrink-0 w-32 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-800 text-left hover:border-brand-orange/50 hover:bg-zinc-800 transition-all duration-200 group active:scale-95 shadow-sm"
    >
        <div className="flex justify-between items-start mb-2">
            <Icon className="w-5 h-5 text-zinc-500 group-hover:text-brand-orange transition-colors" />
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">{title}</p>
    </button>
);

const LotSegmentedControl = ({ value, onChange }: { 
    value: 'physical' | 'breeding', 
    onChange: (val: 'physical' | 'breeding') => void 
}) => (
    <div className="flex rounded-xl bg-black/40 border border-zinc-800 p-1"> 
        <button 
            onClick={() => onChange('physical')} 
            className={`w-1/2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${ 
              value === 'physical' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300' 
            }`} 
        >
            <LayoutGrid size={14} /> Lotes Físicos
        </button> 
        <button 
            onClick={() => onChange('breeding')} 
            className={`w-1/2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${ 
              value === 'breeding' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300' 
            }`} 
        >
            <Heart size={14} /> Temporadas
        </button> 
    </div> 
);

const ModalSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-6 last:mb-0">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
            <div className="w-1 h-3 bg-brand-orange rounded-full"></div>
            {title}
        </h3>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1 overflow-hidden">
            {children}
        </div>
    </div>
);

const StatItem = ({ label, value, unit, subLabel, icon: Icon }: { label: string, value: string | number, unit: string, subLabel?: string, icon?: React.ElementType }) => (
     <div className="flex justify-between items-center p-4 border-b border-zinc-800 last:border-0 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
            {Icon && <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Icon size={16} /></div>}
            <div>
                <p className="text-sm font-bold text-white">{label}</p>
                {subLabel && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{subLabel}</p>}
            </div>
        </div>
        <div className="text-right">
            <p className="text-lg font-mono font-bold text-white leading-none">{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{unit}</p>
        </div>
    </div>
);

// --- INTERFAZ DE PROPS (CORRECCIÓN TYPESCRIPT) ---
interface LotsDashboardPageProps {
    navigateTo: (page: PageState) => void;
    initialTab?: string; // Recibimos el parámetro opcional desde RebanoShell
}

// --- COMPONENTE PRINCIPAL ---

export default function LotsDashboardPage({ navigateTo, initialTab }: LotsDashboardPageProps) {
    
    // Lógica para determinar la pestaña inicial basada en lo que envía RebanoShell
    const getInitialTab = (): 'physical' | 'breeding' => {
        if (initialTab === 'breeding' || initialTab === 'seasons') return 'breeding';
        return 'physical';
    };

    // Inicializamos el estado con la lógica anterior
    const [activeTab, setActiveTab] = useState<'physical' | 'breeding'>(getInitialTab());
    
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const { addBreedingSeason, updateBreedingSeason } = useData();
    const [isAddSeasonModalOpen, setAddSeasonModalOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<BreedingSeason | undefined>(undefined);

    const [isCabrasModalOpen, setCabrasModalOpen] = useState(false);
    const [isReproductoresModalOpen, setReproductoresModalOpen] = useState(false);
    const [reproductorSearch, setReproductorSearch] = useState('');

    // --- EL CEREBRO DE DATOS ---
    const herdAnalytics = useHerdAnalytics();

    const categoryChips = [
        { title: "Cabras", value: herdAnalytics.cabras.total, icon: HeartPulse, onClick: () => setCabrasModalOpen(true) },
        { title: "Cabritonas", value: herdAnalytics.cabritonas.total, icon: TrendingUp, onClick: () => navigateTo({ name: 'herd', kpiFilter: 'Cabritona' }) },
        { title: "Crías", value: herdAnalytics.crias.total, icon: Baby, onClick: () => navigateTo({ name: 'herd', kpiFilter: 'Crias' }) },
        { title: "Reproductores", value: herdAnalytics.reproductores.total, icon: Dna, onClick: () => setReproductoresModalOpen(true) },
    ];

    const handleOpenSeasonModal = (season?: BreedingSeason) => {
        setEditingSeason(season);
        setAddSeasonModalOpen(true);
    };

    const handleSaveSeason = async (seasonData: Omit<BreedingSeason, 'id' | 'status'>) => {
        if (editingSeason) {
            await updateBreedingSeason(editingSeason.id, { ...seasonData });
        } else {
            await addBreedingSeason({ ...seasonData, status: 'Activo' });
        }
        setAddSeasonModalOpen(false);
        setEditingSeason(undefined);
    };

    // --- FILTRO DE REPRODUCTORES (BLINDADO) ---
    const activeReproductores = useMemo(() => {
        return herdAnalytics.lists.reproductores.filter((r: any) => 
            r.status === 'Activo' && 
            !r.isReference &&
            r.lifecycleStage === 'Reproductor' 
        );
    }, [herdAnalytics.lists.reproductores]);

    const filteredReproductores = useMemo(() => {
        if (!reproductorSearch) return activeReproductores;
        const term = reproductorSearch.toLowerCase();
        return activeReproductores.filter((r: any) => 
            (r.name?.toLowerCase() || '').includes(term) || 
            r.id.toLowerCase().includes(term)
        );
    }, [activeReproductores, reproductorSearch]);


    return (
        <>
            <div className="w-full max-w-lg mx-auto"> 
                
                {/* KPIs Hero & Chips (SOLO EN LOTES FÍSICOS) */}
                {activeTab === 'physical' && (
                    <div className="pt-4 animate-fade-in">
                        {/* Números Flotantes */}
                        <div className="flex justify-around items-baseline text-center px-4">
                            <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'all' })} className="hover:opacity-80 transition-opacity group">
                                <span className="text-4xl font-bold text-zinc-200 group-hover:text-white transition-colors tracking-tight">{herdAnalytics.totalPoblacion}</span>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Total</p>
                            </button>
                            <div className="border-l border-zinc-800 h-10 mx-2 self-center"></div>
                            <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'females' })} className="hover:opacity-80 transition-opacity group">
                                <span className="text-4xl font-bold text-zinc-200 group-hover:text-white transition-colors tracking-tight">{herdAnalytics.totalHembras}</span>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Hembras</p>
                            </button>
                            <div className="border-l border-zinc-800 h-10 mx-2 self-center"></div>
                            <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'vientres' })} className="hover:opacity-80 transition-opacity group">
                                <span className="text-5xl font-bold text-brand-orange group-hover:text-orange-400 transition-colors tracking-tight">{herdAnalytics.totalVientres}</span>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Vientres</p>
                            </button>
                        </div>

                        {/* Grilla de Chips (Scroll Horizontal) */}
                        <div className="flex gap-3 overflow-x-auto pb-4 px-4 mt-8 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style>{`.horizontal-scroll::-webkit-scrollbar { display: none; }`}</style>
                            {categoryChips.map(chip => (
                                <div key={chip.title} className="snap-start">
                                    <CategoryChip 
                                        title={chip.title}
                                        value={chip.value}
                                        icon={chip.icon}
                                        onClick={chip.onClick}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CORRECCIÓN DE SCROLL: 
                    Aumentado z-index de 'z-10' a 'z-50' para que el header 
                    siempre esté por encima de las tarjetas que scrollean.
                */}
                <div className={`sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-md px-4 py-3 border-b border-zinc-800 transition-all ${activeTab === 'breeding' ? 'pt-6' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {activeTab === 'physical' ? 'Gestión de Lotes' : 'Temporadas de Monta'}
                        </h2>
                        
                        {/* Botón (+) contextual */}
                        {activeTab === 'physical' ? (
                             <button 
                                onClick={() => setAddLotModalOpen(true)} 
                                className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full flex items-center justify-center transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleOpenSeasonModal()} 
                                className="w-10 h-10 bg-brand-blue hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-blue-900/20 active:scale-90"
                            >
                                <Plus size={24} />
                            </button>
                        )}
                    </div>
                    <LotSegmentedControl value={activeTab} onChange={setActiveTab} />
                </div>

                {/* Contenido */}
                <div className="pb-24 pt-4"> 
                    {activeTab === 'physical' && <PhysicalLotsView navigateTo={navigateTo} />}
                    {activeTab === 'breeding' && <BreedingLotsView navigateTo={navigateTo} onEditSeason={handleOpenSeasonModal} />}
                </div>
            </div>

            {/* --- Modales --- */}
            
            <Modal isOpen={isCabrasModalOpen} onClose={() => setCabrasModalOpen(false)} title="Análisis: Cabras">
                <div className="p-1">
                    <button onClick={() => { setCabrasModalOpen(false); navigateTo({ name: 'herd', kpiFilter: 'Cabra' } as any); }} className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-brand-blue font-bold text-xs mb-6 transition-all flex items-center justify-center gap-2 group">
                        VER LISTADO COMPLETO ({herdAnalytics.cabras.total}) <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                    
                    <ModalSection title="Productividad">
                         <StatItem icon={FlaskConical} label="En Producción" unit="cabras" value={herdAnalytics.cabras.enProduccion} subLabel={`${(herdAnalytics.cabras.total > 0 ? herdAnalytics.cabras.enProduccion / herdAnalytics.cabras.total * 100 : 0).toFixed(0)}% del rebaño`} />
                         <StatItem icon={Archive} label="Secas" unit="cabras" value={herdAnalytics.cabras.secas} subLabel="Periodo seco o descanso" />
                    </ModalSection>
                    
                    <ModalSection title="Estado Reproductivo">
                        <div className="p-4 grid grid-cols-3 gap-2 text-center mb-2">
                             <div className="bg-zinc-800/50 rounded-lg p-2"><p className="text-xl font-bold text-brand-green">{herdAnalytics.cabras.preñadas}</p><p className="text-[9px] text-zinc-500 font-bold uppercase">Preñadas</p></div>
                             <div className="bg-zinc-800/50 rounded-lg p-2"><p className="text-xl font-bold text-brand-blue">{herdAnalytics.cabras.enMonta}</p><p className="text-[9px] text-zinc-500 font-bold uppercase">En Monta</p></div>
                             <div className="bg-zinc-800/50 rounded-lg p-2"><p className="text-xl font-bold text-brand-orange">{herdAnalytics.cabras.vacias}</p><p className="text-[9px] text-zinc-500 font-bold uppercase">Vacías</p></div>
                        </div>
                    </ModalSection>
                </div>
            </Modal>

             <Modal isOpen={isReproductoresModalOpen} onClose={() => setReproductoresModalOpen(false)} title="Inventario de Machos Activos">
                <div className="p-1">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div>
                            <p className="text-sm text-zinc-400">Total Activos</p>
                            <p className="text-3xl font-bold text-white">{filteredReproductores.length}</p>
                        </div>
                        <button onClick={() => { setReproductoresModalOpen(false); navigateTo({ name: 'herd', kpiFilter: 'Reproductor' } as any); }} className="py-2 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-brand-blue font-bold text-xs transition-all flex items-center gap-2">
                            Ver en Rebaño <ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="relative mb-4 px-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar reproductor..."
                            value={reproductorSearch}
                            onChange={(e) => setReproductorSearch(e.target.value)}
                            className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-blue outline-none placeholder-zinc-600"
                        />
                    </div>

                    <ModalSection title="Sementales">
                        {filteredReproductores.length > 0 ? (
                            <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                {filteredReproductores.map((sire: any) => {
                                    const activeAssignment = herdAnalytics.reproductores.activos.find(a => a.id === sire.id);
                                    return (
                                        <div 
                                            key={sire.id}
                                            onClick={() => { setReproductoresModalOpen(false); navigateTo({ name: 'rebano-profile', animalId: sire.id }) }}
                                            className="bg-black border border-zinc-800 rounded-xl p-3 flex flex-col gap-3 cursor-pointer hover:border-brand-blue/50 transition-all group active:scale-[0.99]"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex-shrink-0 flex items-center justify-center text-brand-blue border border-zinc-800">
                                                        <Dna size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white text-sm truncate max-w-[140px]">
                                                            {formatAnimalDisplay(sire).split(' ')[1] || formatAnimalDisplay(sire)}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-mono truncate">{sire.id}</p>
                                                    </div>
                                                </div>
                                                
                                                {activeAssignment ? (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[9px] font-bold uppercase rounded border border-green-500/20 animate-pulse-slow">
                                                        Trabajando
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-zinc-800 text-zinc-500 text-[9px] font-bold uppercase rounded border border-zinc-700">
                                                        Descanso
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {activeAssignment && (
                                                <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                                                    <span className="text-[10px] text-zinc-500">Lote Activo</span>
                                                    <span className="text-[10px] font-bold text-brand-blue flex items-center gap-1">
                                                        {activeAssignment.assignedFemales} hembras asignadas
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Dna size={32} className="text-zinc-700 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm text-zinc-500">No se encontraron reproductores activos.</p>
                            </div>
                        )}
                    </ModalSection>
                </div>
            </Modal>

            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />

            <Modal isOpen={isAddSeasonModalOpen} onClose={() => { setAddSeasonModalOpen(false); setEditingSeason(undefined); }} title={editingSeason ? "Editar Temporada" : "Nueva Temporada"}>
                <BreedingSeasonForm 
                    onSave={handleSaveSeason}
                    onCancel={() => { setAddSeasonModalOpen(false); setEditingSeason(undefined); }}
                    existingSeason={editingSeason}
                />
            </Modal>
        </>
    );
}