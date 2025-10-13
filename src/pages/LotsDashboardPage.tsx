// src/pages/LotsDashboardPage.tsx

import { useState } from 'react';
import type { PageState } from '../types/navigation';
import { Users, Zap, Plus, ChevronRight, Baby, HeartPulse, TrendingUp, Dna, FlaskConical, Archive, GitCompareArrows, CircleDot } from 'lucide-react';
import { FaWeightHanging } from "react-icons/fa";
import { AddLotModal } from '../components/ui/AddLotModal';
import PhysicalLotsView from '../components/lots/PhysicalLotsView';
import BreedingLotsView from '../components/lots/BreedingLotsView';
import { Modal } from '../components/ui/Modal';
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useHerdAnalytics } from '../hooks/useHerdAnalytics';

// --- SUB-COMPONENTES ESTILIZADOS PARA EL DASHBOARD Y MODALES ---

const DashboardKpiCard = ({ title, value, icon: Icon, onClick }: { title: string, value: string | number, icon: React.ElementType, onClick: () => void }) => (
    <button onClick={onClick} className="bg-dashboard-surface backdrop-blur-xl rounded-2xl p-4 border border-brand-border/50 text-left hover:border-brand-orange/60 hover:bg-dashboard-surface-hover transition-all duration-200 w-full">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-brand-light-gray uppercase tracking-wider">{title}</h3>
            <Icon className="w-6 h-6 text-brand-orange" />
        </div>
        <p className="text-4xl font-semibold text-white mt-4">{value}</p>
    </button>
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

    return (
        <>
            {/* --- CAMBIO CLAVE: Se elimina el padding 'px-4' del contenedor principal --- */}
            <div className="w-full max-w-lg mx-auto space-y-6 pb-24 pt-4"> 
                <div className="text-center mb-6 px-4">
                    <p className="text-base text-zinc-300 font-light">
                        Población Total del Rebaño: <span className="font-bold text-white">{herdAnalytics.totalPoblacion}</span>
                    </p>
                    <p className="text-sm text-zinc-400">
                        Total de Vientres: <span className="font-bold text-zinc-200">{herdAnalytics.totalVientres}</span>
                    </p>
                </div>
                
                {/* --- CAMBIO CLAVE: El padding se añade al contenedor de la grilla --- */}
                <div className="grid grid-cols-2 gap-4 px-4">
                    <DashboardKpiCard title="Cabras" value={herdAnalytics.cabras.total} icon={HeartPulse} onClick={() => setCabrasModalOpen(true)} />
                    <DashboardKpiCard title="Cabritonas" value={herdAnalytics.cabritonas.total} icon={TrendingUp} onClick={() => setCabritonasModalOpen(true)} />
                    <DashboardKpiCard title="Crías" value={herdAnalytics.crias.total} icon={Baby} onClick={() => setCriasModalOpen(true)} />
                    <DashboardKpiCard title="Reproductores" value={herdAnalytics.reproductores.total} icon={Dna} onClick={() => setReproductoresModalOpen(true)} />
                </div>
                
                {/* --- CAMBIO CLAVE: El padding se añade a esta sección --- */}
                <div className="pt-4 px-4">
                    <div className="relative bg-brand-glass rounded-xl p-1 border border-brand-border flex items-center">
                        <button onClick={() => setActiveTab('physical')} className={`w-1/2 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                            <Users size={16}/> <span className="text-sm font-semibold">Lotes Físicos</span>
                            <span onClick={(e) => { e.stopPropagation(); setAddLotModalOpen(true); }} className="ml-2 p-1 rounded-full hover:bg-brand-orange/50"><Plus size={18} /></span>
                        </button>
                        <button onClick={() => setActiveTab('breeding')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'breeding' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                            <Zap size={16}/> Lotes de Monta
                        </button>
                    </div>
                </div>
                
                {/* Las vistas de lotes no llevan padding, ya que sus tarjetas internas lo gestionan */}
                <div className="pt-0">
                    {activeTab === 'physical' && <PhysicalLotsView navigateTo={navigateTo} />}
                    {activeTab === 'breeding' && <BreedingLotsView navigateTo={navigateTo} />}
                </div>
            </div>
            
            <Modal isOpen={isCabrasModalOpen} onClose={() => setCabrasModalOpen(false)} title="Análisis de Hembras Adultas">
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
                        <StatItem icon={CircleDot} label="En Fase de Destete" unit="crías" value={herdAnalytics.crias.enFaseDestete} subLabel="45-52 días"/>
                        <div className="border-b border-brand-border/50 mx-2"></div>
                    </ModalSection>
                </div>
            </Modal>

             <Modal isOpen={isReproductoresModalOpen} onClose={() => setReproductoresModalOpen(false)} title="Estado de Reproductores">
                <div className="space-y-4">
                    <ModalSection title="Activos en Temporada de Monta">
                        {herdAnalytics.reproductores.activos.length > 0 ? (
                            herdAnalytics.reproductores.activos.map((sire, index) => (
                                <div key={sire.id}>
                                    <button onClick={() => { setReproductoresModalOpen(false); navigateTo({ name: 'sire-lot-detail', lotId: sire.lotId }) }} className="w-full text-left p-2 rounded-lg flex justify-between items-center hover:bg-brand-glass transition-colors group">
                                        <div>
                                            <p className="font-bold text-white">{sire.name || `ID: ${sire.id}`}</p>
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