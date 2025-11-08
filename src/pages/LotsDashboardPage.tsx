import React, { useState } from 'react';
import type { PageState } from '../types/navigation';
// --- CORRECCIÓN: Iconos que SÍ se usan ---
import { 
    Users, Plus, ChevronRight, Baby, HeartPulse, TrendingUp, Dna, 
    GitCompareArrows, CircleDot, LayoutGrid, Heart, FlaskConical, Archive 
} from 'lucide-react';
import { FaWeightHanging } from "react-icons/fa";
// ---
import { AddLotModal } from '../components/ui/AddLotModal';
import PhysicalLotsView from '../components/lots/PhysicalLotsView';
import BreedingLotsView from '../components/lots/BreedingLotsView';
import { Modal } from '../components/ui/Modal';
// --- CORRECCIÓN: Imports de Recharts que SÍ se usan ---
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
// ---
import { useHerdAnalytics } from '../hooks/useHerdAnalytics';
// --- CORRECCIÓN: Import que SÍ se usa ---
import { formatAnimalDisplay } from '../utils/formatting';
// ---

// --- SUB-COMPONENTES ESTILIZADOS ---

const CategoryChip = ({ title, value, icon: Icon, onClick }: { 
    title: string, 
    value: string | number, 
    icon: React.ElementType, 
    onClick: () => void 
}) => (
    <button 
        onClick={onClick}
        className="flex-shrink-0 w-32 bg-dashboard-surface backdrop-blur-xl rounded-2xl p-4 border border-brand-border/50 text-left hover:border-brand-orange/60 hover:bg-dashboard-surface-hover transition-all duration-200 group"
    >
        <Icon className="w-6 h-6 text-zinc-400 mb-2 group-hover:text-brand-orange transition-colors" />
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
    </button>
);

const LotSegmentedControl = ({ value, onChange }: { 
    value: 'physical' | 'breeding', 
    onChange: (val: 'physical' | 'breeding') => void 
}) => (
    <div className="flex rounded-lg bg-brand-glass border border-brand-border p-0.5"> 
        <button 
            onClick={() => onChange('physical')} 
            className={`w-1/2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${ 
              value === 'physical' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white' 
            }`} 
        >
            <LayoutGrid size={16} /> Lotes
        </button> 
        <button 
            onClick={() => onChange('breeding')} 
            className={`w-1/2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${ 
              value === 'breeding' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white' 
            }`} 
        >
            <Heart size={16} /> Lotes de Monta
        </button> 
    </div> 
);

const ModalSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-sm font-semibold text-brand-light-gray mb-3 px-1">{title}</h3>
        <div className="bg-brand-glass backdrop-blur-lg rounded-xl p-4 border border-brand-border/50">
            {children}
        </div>
    </div>
);

const StatItem = ({ label, value, unit, subLabel, icon: Icon }: { label: string, value: string | number, unit: string, subLabel?: string, icon?: React.ElementType }) => (
     <div className="flex justify-between items-center py-2.5">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-zinc-400" />}
            <div>
                <p className="text-base text-white">{label}</p>
                {subLabel && <p className="text-xs text-brand-medium-gray mt-0.5">{subLabel}</p>}
            </div>
        </div>
        <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-semibold text-white">{value}</p>
            <p className="text-sm text-brand-medium-gray">{unit}</p>
        </div>
    </div>
);

const CustomRechartsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-zinc-800/80 backdrop-blur-md rounded-lg border border-zinc-700 text-white text-sm">
                <p className="font-semibold mb-1">{label || payload[0].name}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}{entry.unit}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---

export default function LotsDashboardPage({ navigateTo }: { navigateTo: (page: PageState) => void; }) {
    const [activeTab, setActiveTab] = useState<'physical' | 'breeding'>('physical');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);

    const [isCabrasModalOpen, setCabrasModalOpen] = useState(false);
    const [isCabritonasModalOpen, setCabritonasModalOpen] = useState(false);
    const [isCriasModalOpen, setCriasModalOpen] = useState(false);
    const [isReproductoresModalOpen, setReproductoresModalOpen] = useState(false);

    const herdAnalytics = useHerdAnalytics();

    const categoryChips = [
        { title: "Cabras", value: herdAnalytics.cabras.total, icon: HeartPulse, onClick: () => setCabrasModalOpen(true) },
        { title: "Cabritonas", value: herdAnalytics.cabritonas.total, icon: TrendingUp, onClick: () => setCabritonasModalOpen(true) },
        { title: "Crías", value: herdAnalytics.crias.total, icon: Baby, onClick: () => setCriasModalOpen(true) },
        { title: "Reproductores", value: herdAnalytics.reproductores.total, icon: Dna, onClick: () => setReproductoresModalOpen(true) },
    ];

    return (
        <>
            {/* --- CORRECCIÓN CRÍTICA: Eliminado pt-16 y pb-24 del div raíz --- */}
            <div className="w-full max-w-lg mx-auto space-y-6"> 
                
                {/* KPIs Hero (pt-4 se mantiene para espacio interno) */}
                <div className="flex justify-around items-baseline text-center px-4 pt-4">
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'all' })} className="hover:opacity-80 transition-opacity">
                        <span className="text-4xl font-semibold text-zinc-200">{herdAnalytics.totalPoblacion}</span>
                        <p className="text-sm text-zinc-400 uppercase tracking-wider">Animales</p>
                    </button>
                    <div className="border-l border-zinc-700 h-10 mx-2"></div>
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'females' })} className="hover:opacity-80 transition-opacity">
                        <span className="text-4xl font-semibold text-zinc-200">{herdAnalytics.totalHembras}</span>
                        <p className="text-sm text-zinc-400 uppercase tracking-wider">Hembras</p>
                    </button>
                    <div className="border-l border-zinc-700 h-10 mx-2"></div>
                    <button onClick={() => navigateTo({ name: 'herd', kpiFilter: 'vientres' })} className="hover:opacity-80 transition-opacity">
                        <span className="text-5xl font-bold text-white">{herdAnalytics.totalVientres}</span>
                        <p className="text-sm text-zinc-400 uppercase tracking-wider -mt-1">Vientres</p>
                    </button>
                </div>


                {/* Grilla de KPIs (Chips Horizontales) */}
                <div className="flex gap-3 overflow-x-auto pb-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`
                        .horizontal-scroll::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {categoryChips.map(chip => (
                        <CategoryChip 
                            key={chip.title}
                            title={chip.title}
                            value={chip.value}
                            icon={chip.icon}
                            onClick={chip.onClick}
                        />
                    ))}
                </div>


                {/* Selector de Pestañas (pt-4 se mantiene para espacio interno) */}
                <div className="pt-4 px-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold text-white">Lotes de Manejo</h2>
                        {activeTab === 'physical' && (
                            <button 
                                onClick={() => setAddLotModalOpen(true)} 
                                className="flex items-center gap-1 text-sm text-brand-orange font-semibold"
                            >
                                <Plus size={16} /> Añadir
                            </button>
                        )}
                    </div>
                    <LotSegmentedControl value={activeTab} onChange={setActiveTab} />
                </div>

                {/* Contenido de la pestaña activa */}
                <div className="pt-0"> 
                    {activeTab === 'physical' && <PhysicalLotsView navigateTo={navigateTo} />}
                    {activeTab === 'breeding' && <BreedingLotsView navigateTo={navigateTo} />}
                </div>
            </div>

            {/* --- Modales de Análisis (Restaurados) --- */}
            
            <Modal isOpen={isCabrasModalOpen} onClose={() => setCabrasModalOpen(false)} title="Análisis de Hembras Adultas">
                <button
                    onClick={() => {
                        setCabrasModalOpen(false); 
                        navigateTo({ name: 'herd', kpiFilter: 'Cabra' }); 
                    }}
                    className="w-full text-center py-3 px-4 bg-brand-glass hover:bg-zinc-700 border border-brand-border rounded-lg text-brand-orange font-semibold text-sm mb-4 transition-colors"
                >
                    Ver Lista de {herdAnalytics.cabras.total} Cabras
                </button>
                <div className="space-y-5">
                    <ModalSection title="Estado Productivo y Reproductivo">
                         <StatItem icon={FlaskConical} label="En Producción" unit="cabras" value={herdAnalytics.cabras.enProduccion} subLabel={`${(herdAnalytics.cabras.total > 0 ? herdAnalytics.cabras.enProduccion / herdAnalytics.cabras.total * 100 : 0).toFixed(0)}% del total`} />
                         <div className="border-b border-brand-border/50 mx-2"></div>
                         <StatItem icon={Archive} label="Secas" unit="cabras" value={herdAnalytics.cabras.secas} subLabel={`${(herdAnalytics.cabras.total > 0 ? herdAnalytics.cabras.secas / herdAnalytics.cabras.total * 100 : 0).toFixed(0)}% del total`} />
                         <div className="border-b border-brand-border/50 mx-2"></div>
                         <StatItem icon={GitCompareArrows} label="En Monta Activa" unit="cabras" value={herdAnalytics.cabras.enMonta} />
                    </ModalSection>
                    <ModalSection title="Estado Reproductivo (Vientres)">
                        <div className="w-full h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={herdAnalytics.cabras.reproductiveStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} cornerRadius={5}>
                                        {herdAnalytics.cabras.reproductiveStatusData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={entry.color} stroke="none" />))}
                                    </Pie>
                                    <Tooltip content={<CustomRechartsTooltip />} />
                                    <Legend iconSize={10} wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </ModalSection>
                    <ModalSection title="Rendimiento Anual en Ordeño">
                        <div className="w-full h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={herdAnalytics.cabras.milkingPercentageData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} unit="%" axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomRechartsTooltip unit="%"/>} cursor={{fill: 'rgba(255, 255, 255, 0.08)'}} />
                                    <Bar dataKey="En Ordeño (%)" fill="#FF9500" radius={[8, 8, 0, 0]} animationDuration={500} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ModalSection>
                </div>
            </Modal>

            <Modal isOpen={isCabritonasModalOpen} onClose={() => setCabritonasModalOpen(false)} title="Análisis de Cabritonas">
                <button
                    onClick={() => {
                        setCabritonasModalOpen(false);
                        navigateTo({ name: 'herd', kpiFilter: 'Cabritona' });
                    }}
                    className="w-full text-center py-3 px-4 bg-brand-glass hover:bg-zinc-700 border border-brand-border rounded-lg text-brand-orange font-semibold text-sm mb-4 transition-colors"
                >
                    Ver Lista de {herdAnalytics.cabritonas.total} Cabritonas
                </button>
                 <div className="space-y-4">
                    <ModalSection title="Disponibilidad para Monta">
                         <StatItem icon={GitCompareArrows} label="En Monta" unit="cabritonas" value={herdAnalytics.cabritonas.enMonta} subLabel={`${(herdAnalytics.cabritonas.total > 0 ? herdAnalytics.cabritonas.enMonta / herdAnalytics.cabritonas.total * 100 : 0).toFixed(0)}% del total`} />
                         <div className="border-b border-brand-border/50 mx-2"></div>
                         <StatItem icon={Users} label="Disponibles" unit="cabritonas" value={herdAnalytics.cabritonas.disponibles} />
                    </ModalSection>
                    <ModalSection title="Próximas a Servicio">
                         <StatItem icon={FaWeightHanging} label="Con Peso Óptimo" unit="cabritonas" value={herdAnalytics.cabritonas.proximasAServicio} subLabel="(≥ 28.5 Kg y sin lote asignado)" />
                    </ModalSection>
                </div>
            </Modal>

             <Modal isOpen={isCriasModalOpen} onClose={() => setCriasModalOpen(false)} title="Análisis de Crías en Maternidad">
                <button
                    onClick={() => {
                        setCriasModalOpen(false);
                        navigateTo({ name: 'herd', kpiFilter: 'Crias' });
                    }}
                    className="w-full text-center py-3 px-4 bg-brand-glass hover:bg-zinc-700 border border-brand-border rounded-lg text-brand-orange font-semibold text-sm mb-4 transition-colors"
                >
                    Ver Lista de {herdAnalytics.crias.total} Crías
                </button>
                <div className="space-y-5">
                    <ModalSection title="Distribución por Sexo">
                         <div className="w-full h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={herdAnalytics.crias.criasEnMaternidadData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} cornerRadius={5}>
                                        {herdAnalytics.crias.criasEnMaternidadData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={entry.color} stroke="none" />))}
                                    </Pie>
                                    <Tooltip content={<CustomRechartsTooltip />} />
                                    <Legend iconSize={10} wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </ModalSection>
                    <ModalSection title="Estado de Destete">
                        <StatItem icon={Baby} label="Listas para Destete" unit="crías" value={herdAnalytics.crias.listasParaDestete} subLabel="≥ 52 días y ≥ 9.5 Kg"/>
                        <div className="border-b border-brand-border/50 mx-2"></div>
                        <StatItem icon={CircleDot} label="Próximas a Destete" unit="crías" value={herdAnalytics.crias.proximasADestete} subLabel="Cerca por edad o peso"/>
                    </ModalSection>
                </div>
            </Modal>

             <Modal isOpen={isReproductoresModalOpen} onClose={() => setReproductoresModalOpen(false)} title="Estado de Reproductores">
                <button
                    onClick={() => {
                        setReproductoresModalOpen(false);
                        navigateTo({ name: 'herd', kpiFilter: 'Reproductor' });
                    }}
                    className="w-full text-center py-3 px-4 bg-brand-glass hover:bg-zinc-700 border border-brand-border rounded-lg text-brand-orange font-semibold text-sm mb-4 transition-colors"
                >
                    Ver Lista de {herdAnalytics.reproductores.total} Reproductores
                </button>
                <div className="space-y-4">
                    <ModalSection title="Activos en Temporada de Monta">
                        {herdAnalytics.reproductores.activos.length > 0 ? (
                            herdAnalytics.reproductores.activos.map((sire, index) => (
                                <div key={sire.id}>
                                    <button
                                        onClick={() => { setReproductoresModalOpen(false); navigateTo({ name: 'sire-lot-detail', lotId: sire.lotId }) }}
                                        className="w-full text-left p-2 rounded-lg flex justify-between items-center hover:bg-brand-glass transition-colors group"
                                    >
                                        <div>
                                            <p className="font-bold text-white">{formatAnimalDisplay(sire)}</p>
                                            <p className="text-xs text-brand-medium-gray">Ver lote de monta asignado</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-semibold text-brand-orange">{sire.assignedFemales} hembras</span>
                                            <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
                                        </div>
                                    </button>
                                    {index < herdAnalytics.reproductores.activos.length - 1 && <div className="border-b border-brand-border/50 mx-2"></div>}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-brand-medium-gray text-center py-4">
                                No hay reproductores activos en una temporada de monta actualmente.
                            </p>
                        )}
                    </ModalSection>
                </div>
            </Modal>

            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
        </>
    );
}