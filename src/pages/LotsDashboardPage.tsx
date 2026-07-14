import React, { useState, useMemo } from 'react';
import type { PageState } from '../types/navigation';
// --- Iconos ---
import {
    Plus, ChevronRight, Dna,
    LayoutGrid, Heart, FlaskConical, Archive, Search
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
import { TodayPanel } from '../components/ui/TodayPanel';


// --- SUB-COMPONENTES ESTILIZADOS ---

interface CategoryDatum {
    title: string;
    value: number;
    colorClass: string; // clase Tailwind de fondo (segmento de barra + swatch)
    onClick: () => void;
}

// Tarjeta unificada "Composición del Rebaño": número héroe + KPIs (Hembras/
// Vientres) + barra proporcional por categoría + leyenda tappable.
const HerdCompositionCard = ({ total, hembras, vientres, categories, navigateTo }: {
    total: number;
    hembras: number;
    vientres: number;
    categories: CategoryDatum[];
    navigateTo: (page: PageState) => void;
}) => {
    const catTotal = categories.reduce((s, c) => s + (c.value || 0), 0) || 1;
    return (
        <div className="mx-4 mt-4 bg-c-surface rounded-2xl border border-c-border shadow-sm p-4 animate-fade-in">
            {/* Encabezado: héroe (Total) + KPIs secundarios (Hembras/Vientres) */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-[11px] font-bold text-c-text-faint uppercase tracking-widest mb-1.5">Composición del rebaño</p>
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'all' })} className="flex items-baseline gap-2 active:opacity-70 transition-opacity">
                        <span className="text-4xl font-bold text-c-text-strong tracking-tight leading-none">{total}</span>
                        <span className="text-xs font-bold text-c-text-faint uppercase tracking-wider">animales</span>
                    </button>
                </div>
                <div className="flex gap-4 text-right">
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'females' })} className="active:opacity-70 transition-opacity">
                        <p className="text-2xl font-bold text-c-text-strong leading-none">{hembras}</p>
                        <p className="text-[9px] font-bold text-c-text-faint uppercase tracking-widest mt-1">Hembras</p>
                    </button>
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'vientres' })} className="active:opacity-70 transition-opacity">
                        <p className="text-2xl font-bold text-c-accent-gold leading-none">{vientres}</p>
                        <p className="text-[9px] font-bold text-c-text-faint uppercase tracking-widest mt-1">Vientres</p>
                    </button>
                </div>
            </div>

            {/* Barra proporcional */}
            <div className="flex h-4 rounded-lg overflow-hidden mb-3.5 bg-c-surface-2">
                {categories.map(c => (c.value > 0 &&
                    <div key={c.title} className={c.colorClass} style={{ width: `${(c.value / catTotal) * 100}%` }} />
                ))}
            </div>

            {/* Leyenda tappable (2×2) */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {categories.map(c => (
                    <button key={c.title} onClick={c.onClick} className="flex items-center gap-2 text-left active:opacity-70 transition-opacity">
                        <span className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${c.colorClass}`} />
                        <span className="text-[15px] font-bold text-c-text-strong">{c.value}</span>
                        <span className="text-xs text-c-text-muted font-semibold truncate">{c.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const LotSegmentedControl = ({ value, onChange }: { 
    value: 'physical' | 'breeding', 
    onChange: (val: 'physical' | 'breeding') => void 
}) => (
    <div className="flex rounded-xl bg-c-surface-2 border border-c-border p-1">
        <button 
            onClick={() => onChange('physical')} 
            className={`w-1/2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${ 
              value === 'physical' ? 'bg-c-surface text-c-text shadow-sm border border-c-border-strong' : 'text-c-text-faint hover:text-c-text-muted'
            }`} 
        >
            <LayoutGrid size={14} /> Lotes Físicos
        </button> 
        <button 
            onClick={() => onChange('breeding')} 
            className={`w-1/2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${ 
              value === 'breeding' ? 'bg-c-surface text-c-text shadow-sm border border-c-border-strong' : 'text-c-text-faint hover:text-c-text-muted'
            }`} 
        >
            <Heart size={14} /> Temporadas
        </button> 
    </div> 
);

const ModalSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-6 last:mb-0">
        <h3 className="text-xs font-bold text-c-text-faint uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
            <div className="w-1 h-3 bg-c-accent rounded-full"></div>
            {title}
        </h3>
        <div className="bg-c-surface-2 border border-c-border rounded-2xl p-1 overflow-hidden">
            {children}
        </div>
    </div>
);

const StatItem = ({ label, value, unit, subLabel, icon: Icon }: { label: string, value: string | number, unit: string, subLabel?: string, icon?: React.ElementType }) => (
     <div className="flex justify-between items-center p-4 border-b border-c-border last:border-0 hover:bg-c-surface-2 transition-colors">
        <div className="flex items-center gap-3">
            {Icon && <div className="p-2 bg-c-surface-2 rounded-lg text-c-text-muted"><Icon size={16} /></div>}
            <div>
                <p className="text-sm font-bold text-c-text">{label}</p>
                {subLabel && <p className="text-[10px] text-c-text-faint font-medium mt-0.5">{subLabel}</p>}
            </div>
        </div>
        <div className="text-right">
            <p className="text-lg font-mono font-bold text-c-text leading-none">{value}</p>
            <p className="text-[10px] text-c-text-faint uppercase font-bold mt-1">{unit}</p>
        </div>
    </div>
);

// --- INTERFAZ DE PROPS (CORRECCIÓN TYPESCRIPT) ---
interface LotsDashboardPageProps {
    navigateTo: (page: PageState) => void;
    // Pestaña controlada desde el PageState (para preservarla al volver).
    tab?: 'physical' | 'breeding';
    onTabChange?: (tab: 'physical' | 'breeding') => void;
}

// --- COMPONENTE PRINCIPAL ---

export default function LotsDashboardPage({ navigateTo, tab, onTabChange }: LotsDashboardPageProps) {

    // La pestaña puede venir controlada por la ruta (tab) o gestionarse localmente
    // como respaldo. handleTabChange sincroniza ambos y avisa a la ruta.
    const [localTab, setLocalTab] = useState<'physical' | 'breeding'>(tab ?? 'physical');
    const activeTab: 'physical' | 'breeding' = tab ?? localTab;
    const setActiveTab = (v: 'physical' | 'breeding') => {
        setLocalTab(v);
        onTabChange?.(v);
    };
    
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const { addBreedingSeason, updateBreedingSeason } = useData();
    const [isAddSeasonModalOpen, setAddSeasonModalOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<BreedingSeason | undefined>(undefined);

    const [isCabrasModalOpen, setCabrasModalOpen] = useState(false);
    const [isReproductoresModalOpen, setReproductoresModalOpen] = useState(false);
    const [reproductorSearch, setReproductorSearch] = useState('');

    // --- EL CEREBRO DE DATOS ---
    const herdAnalytics = useHerdAnalytics();

    const categoryChips: CategoryDatum[] = [
        { title: "Cabras", value: herdAnalytics.cabras.total, colorClass: 'bg-c-accent', onClick: () => setCabrasModalOpen(true) },
        { title: "Cabritonas", value: herdAnalytics.cabritonas.total, colorClass: 'bg-c-accent-sky', onClick: () => navigateTo({ name: 'herd', kpiFilter: 'Cabritona' }) },
        { title: "Crías", value: herdAnalytics.crias.total, colorClass: 'bg-c-accent-gold', onClick: () => navigateTo({ name: 'herd', kpiFilter: 'Crias' }) },
        { title: "Reproductores", value: herdAnalytics.reproductores.total, colorClass: 'bg-[#6d5fd6]', onClick: () => setReproductoresModalOpen(true) },
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
                
                {/* Panel "Para hoy" (pendientes de manejo) */}
                {activeTab === 'physical' && <TodayPanel navigateTo={navigateTo} />}

                {/* Composición del Rebaño (SOLO EN LOTES FÍSICOS) */}
                {activeTab === 'physical' && (
                    <HerdCompositionCard
                        total={herdAnalytics.totalPoblacion}
                        hembras={herdAnalytics.totalHembras}
                        vientres={herdAnalytics.totalVientres}
                        categories={categoryChips}
                        navigateTo={navigateTo}
                    />
                )}

                {/* CORRECCIÓN DE SCROLL: 
                    Aumentado z-index de 'z-10' a 'z-50' para que el header 
                    siempre esté por encima de las tarjetas que scrollean.
                */}
                <div className={`sticky top-0 z-50 bg-c-bg/95 backdrop-blur-md px-4 py-3 border-b border-c-border transition-all ${activeTab === 'breeding' ? 'pt-6' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-c-text flex items-center gap-2">
                            {activeTab === 'physical' ? 'Gestión de Lotes' : 'Temporadas de Monta'}
                        </h2>
                        
                        {/* Botón (+) contextual */}
                        {activeTab === 'physical' ? (
                             <button 
                                onClick={() => setAddLotModalOpen(true)}
                                className="w-10 h-10 bg-c-surface-2 hover:bg-c-border-strong text-c-text-muted hover:text-c-text rounded-full flex items-center justify-center transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleOpenSeasonModal()}
                                className="w-10 h-10 bg-c-accent-sky hover:opacity-90 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-sky-900/20 active:scale-90"
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
                    <button onClick={() => { setCabrasModalOpen(false); navigateTo({ name: 'herd', kpiFilter: 'Cabra' } as any); }} className="w-full py-3 px-4 bg-c-surface-2 hover:bg-c-border/40 border border-c-border rounded-xl text-c-accent-sky font-bold text-xs mb-6 transition-all flex items-center justify-center gap-2 group">
                        VER LISTADO COMPLETO ({herdAnalytics.cabras.total}) <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                    
                    <ModalSection title="Productividad">
                         <StatItem icon={FlaskConical} label="En Producción" unit="cabras" value={herdAnalytics.cabras.enProduccion} subLabel={`${(herdAnalytics.cabras.total > 0 ? herdAnalytics.cabras.enProduccion / herdAnalytics.cabras.total * 100 : 0).toFixed(0)}% del rebaño`} />
                         <StatItem icon={Archive} label="Secas" unit="cabras" value={herdAnalytics.cabras.secas} subLabel="Periodo seco o descanso" />
                    </ModalSection>
                    
                    <ModalSection title="Estado Reproductivo">
                        <div className="p-4 grid grid-cols-3 gap-2 text-center mb-2">
                             <div className="bg-c-surface-2 rounded-lg p-2"><p className="text-xl font-bold text-c-accent">{herdAnalytics.cabras.preñadas}</p><p className="text-[9px] text-c-text-faint font-bold uppercase">Preñadas</p></div>
                             <div className="bg-c-surface-2 rounded-lg p-2"><p className="text-xl font-bold text-c-accent-sky">{herdAnalytics.cabras.enMonta}</p><p className="text-[9px] text-c-text-faint font-bold uppercase">En Monta</p></div>
                             <div className="bg-c-surface-2 rounded-lg p-2"><p className="text-xl font-bold text-c-accent-gold">{herdAnalytics.cabras.vacias}</p><p className="text-[9px] text-c-text-faint font-bold uppercase">Vacías</p></div>
                        </div>
                    </ModalSection>
                </div>
            </Modal>

             <Modal isOpen={isReproductoresModalOpen} onClose={() => setReproductoresModalOpen(false)} title="Inventario de Machos Activos">
                <div className="p-1">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div>
                            <p className="text-sm text-c-text-muted">Total Activos</p>
                            <p className="text-3xl font-bold text-c-text">{filteredReproductores.length}</p>
                        </div>
                        <button onClick={() => { setReproductoresModalOpen(false); navigateTo({ name: 'herd', kpiFilter: 'Reproductor' } as any); }} className="py-2 px-4 bg-c-surface-2 hover:bg-c-border/40 border border-c-border rounded-lg text-c-accent-sky font-bold text-xs transition-all flex items-center gap-2">
                            Ver en Rebaño <ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="relative mb-4 px-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-c-text-faint" />
                        <input
                            type="text"
                            placeholder="Buscar reproductor..."
                            value={reproductorSearch}
                            onChange={(e) => setReproductorSearch(e.target.value)}
                            className="w-full bg-c-surface-2 border border-c-border rounded-xl pl-10 pr-4 py-3 text-sm text-c-text focus:ring-2 focus:ring-c-accent-sky outline-none placeholder-c-text-faint"
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
                                            className="bg-c-surface border border-c-border rounded-xl p-3 flex flex-col gap-3 cursor-pointer hover:border-c-accent-sky/50 transition-all group active:scale-[0.99]"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-full bg-c-surface-2 flex-shrink-0 flex items-center justify-center text-c-accent-sky border border-c-border">
                                                        <Dna size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-c-text text-sm truncate max-w-[140px]">
                                                            {formatAnimalDisplay(sire).split(' ')[1] || formatAnimalDisplay(sire)}
                                                        </p>
                                                        <p className="text-[10px] text-c-text-faint font-mono truncate">{sire.id}</p>
                                                    </div>
                                                </div>
                                                
                                                {activeAssignment ? (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[9px] font-bold uppercase rounded border border-green-500/20 animate-pulse-slow">
                                                        Trabajando
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-c-surface-2 text-c-text-faint text-[9px] font-bold uppercase rounded border border-c-border">
                                                        Descanso
                                                    </span>
                                                )}
                                            </div>

                                            {activeAssignment && (
                                                <div className="pt-2 border-t border-c-border flex justify-between items-center">
                                                    <span className="text-[10px] text-c-text-faint">Lote Activo</span>
                                                    <span className="text-[10px] font-bold text-c-accent-sky flex items-center gap-1">
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
                                <Dna size={32} className="text-c-text-faint mx-auto mb-3 opacity-50"/>
                                <p className="text-sm text-c-text-faint">No se encontraron reproductores activos.</p>
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