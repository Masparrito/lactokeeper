// src/pages/AnimalsPage.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ChevronRight, Zap, BarChart2, ArrowUp, ArrowDown, Sparkles, ChevronLeft, FilterX, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../hooks/useGaussAnalysis';
import { WeighingTrendIcon } from '../components/ui/WeighingTrendIcon';
import { Modal } from '../components/ui/Modal';
import { useWeighingTrend } from '../hooks/useWeighingTrend';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';

// --- SUB-COMPONENTE PARA ETIQUETAS DE PORCENTAJE ---
const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return (
        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize="14px" fontWeight="bold" opacity={0.8}>
            {`${percentage}%`}
        </text>
    );
};

// --- SUB-COMPONENTE PARA LA FILA DE UN ANIMAL EN ANÁLISIS ---
const MilkingAnimalRow = ({ animal, onSelectAnimal }: { animal: AnalyzedAnimal, onSelectAnimal: (id: string) => void }) => {
    const { weighings } = useData();
    const { isLongTrend, lastTwoWeighings, difference } = useWeighingTrend(animal.id, weighings);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleTrendClick = (e: React.MouseEvent) => { e.stopPropagation(); if (animal.trend && animal.trend !== 'single') setIsModalOpen(true); };

    return (
        <>
            <div onClick={() => onSelectAnimal(animal.id)} className="w-full cursor-pointer text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-amber transition-colors">
                <div>
                    <p className="font-bold text-lg text-white">{animal.id}</p>
                    <p className="text-sm text-zinc-400">DEL: {animal.del} | Score: {animal.score.toFixed(2)} | <span className="font-semibold text-amber-400"> Pesaje: {animal.latestWeighing.toFixed(2)} Kg</span></p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleTrendClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:cursor-not-allowed" disabled={!animal.trend || animal.trend === 'single'}><WeighingTrendIcon trend={animal.trend} isLongTrend={isLongTrend} /></button>
                   <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${animal.classification === 'Pobre' ? 'bg-red-500/80' : animal.classification === 'Sobresaliente' ? 'bg-green-500/80' : 'bg-gray-500/80'}`}>{animal.classification}</span>
                   <ChevronRight className="text-zinc-600" />
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Tendencia de ${animal.id}`}>
                <div className="text-center text-white space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div><p className="text-sm text-zinc-400">Pesaje Anterior ({lastTwoWeighings[1] ? new Date(lastTwoWeighings[1].date).toLocaleDateString() : 'N/A'})</p><p className="text-2xl font-semibold">{lastTwoWeighings[1]?.kg.toFixed(2) || 'N/A'} Kg</p></div>
                        <div><p className="text-sm text-zinc-400">Último Pesaje ({lastTwoWeighings[0] ? new Date(lastTwoWeighings[0].date).toLocaleDateString() : 'N/A'})</p><p className="text-2xl font-semibold">{lastTwoWeighings[0]?.kg.toFixed(2) || 'N/A'} Kg</p></div>
                    </div>
                    <div><p className="text-zinc-400 text-base mb-1">Diferencia</p><p className={`text-3xl font-bold ${difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-zinc-400'}`}>{difference > 0 ? '+' : ''}{difference.toFixed(2)} Kg</p></div>
                </div>
            </Modal>
        </>
    );
};

interface AnimalsPageProps {
    onSelectAnimal: (animalId: string) => void;
}

export default function AnimalsPage({ onSelectAnimal }: AnimalsPageProps) {
    const { animals, parturitions, weighings, isLoading } = useData();
    const [isWeighted, setIsWeighted] = useState(false);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const [trendFilter, setTrendFilter] = useState<'all' | 'up' | 'down' | 'stable' | 'single'>('all');
    const [lactationPhaseFilter, setLactationPhaseFilter] = useState<'all' | 'first' | 'second' | 'third' | 'drying'>('all');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isScoreInfoModalOpen, setIsScoreInfoModalOpen] = useState(false);

    const { weighingsByDate, availableDates } = useMemo(() => {
        const groups: Record<string, any[]> = {};
        weighings.forEach(w => { if (!groups[w.date]) groups[w.date] = []; groups[w.date].push(w); });
        const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return { weighingsByDate: groups, availableDates: dates };
    }, [weighings]);
    
    const [dateIndex, setDateIndex] = useState(0);
    const selectedDate = availableDates[dateIndex];
    const selectedWeighings = weighingsByDate[selectedDate] || [];
    
    const { classifiedAnimals, distribution, mean, stdDev } = useGaussAnalysis(selectedWeighings, animals, weighings, parturitions, isWeighted);
    
    const filteredAnalysisList = useMemo(() => {
        let list: AnalyzedAnimal[] = [...classifiedAnimals];
        if (classificationFilter !== 'all') list = list.filter(a => a.classification === classificationFilter);
        if (trendFilter !== 'all') list = list.filter(animal => animal.trend === trendFilter);
        if (lactationPhaseFilter !== 'all') {
            list = list.filter(animal => {
                const del = animal.del;
                if (lactationPhaseFilter === 'first') return del > 0 && del <= 100;
                if (lactationPhaseFilter === 'second') return del > 100 && del <= 200;
                if (lactationPhaseFilter === 'third') return del > 200 && del < 270;
                if (lactationPhaseFilter === 'drying') return del >= 270;
                return true;
            });
        }
        return list.sort((a,b) => a.id.localeCompare(b.id));
    }, [classifiedAnimals, classificationFilter, trendFilter, lactationPhaseFilter]);

    const { searchTerm, setSearchTerm, filteredItems: searchedAnimals } = useSearch(filteredAnalysisList, ['id']);

    const trendCounts = useMemo(() => {
        const total = classifiedAnimals.length;
        if (total === 0) return { up: 0, down: 0, new: 0, stable: 0, total: 0 };
        const up = classifiedAnimals.filter(a => a.trend === 'up').length; const down = classifiedAnimals.filter(a => a.trend === 'down').length; const stable = classifiedAnimals.filter(a => a.trend === 'stable').length; const single = classifiedAnimals.filter(a => a.trend === 'single').length;
        return { up: (up / total) * 100, down: (down / total) * 100, stable: (stable / total) * 100, new: (single / total) * 100, total };
    }, [classifiedAnimals]);

    const resetFilters = () => { setClassificationFilter('all'); setTrendFilter('all'); setLactationPhaseFilter('all'); };
    const handleBarClick = (data: any) => { if (data?.name) { const newFilter = data.name as 'Pobre' | 'Promedio' | 'Sobresaliente'; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};

    if (isLoading) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando animales...</h1></div>;
    
    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <SearchHeader 
                title="Análisis de Rebaño"
                subtitle="Animales en Ordeño"
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border flex justify-between items-center">
                <button onClick={() => setDateIndex(i => Math.min(i + 1, availableDates.length - 1))} disabled={dateIndex >= availableDates.length - 1} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronLeft /></button>
                <div className="text-center"><p className="text-lg font-semibold text-white">{selectedDate ? new Date(selectedDate).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin Datos'}</p><p className="text-sm text-zinc-400">{selectedWeighings.length} animales pesados</p></div>
                <button onClick={() => setDateIndex(i => Math.max(i - 1, 0))} disabled={dateIndex === 0} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronRight /></button>
            </div>
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                <div className="flex justify-between items-center border-b border-brand-border pb-2 mb-4">
                    <div className="flex items-center space-x-2"><BarChart2 className="text-amber-400" size={18}/><h3 className="text-lg font-semibold text-white">Análisis del Día</h3><button onClick={() => setIsInfoModalOpen(true)} className="text-zinc-500 hover:text-white"><Info size={14}/></button></div>
                    <label className="flex items-center space-x-2 text-sm text-zinc-300 cursor-pointer">
                        <Zap size={14} className={isWeighted ? 'text-amber-400' : 'text-zinc-500'}/>
                        <span>Ponderado a DEL</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsScoreInfoModalOpen(true); }} className="text-zinc-500 hover:text-white -ml-1">
                            <Info size={14}/>
                        </button>
                        <input type="checkbox" checked={isWeighted} onChange={(e) => setIsWeighted(e.target.checked)} className="form-checkbox h-4 w-4 bg-zinc-700 border-zinc-600 rounded text-amber-500 focus:ring-offset-0"/>
                    </label>
                </div>
                <div className="w-full h-48">
                    <ResponsiveContainer><BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                        <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                            {distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                            <LabelList dataKey="count" content={<CustomBarLabel total={classifiedAnimals.length} />} />
                        </Bar>
                    </BarChart></ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-zinc-400 mt-2"><span>μ = {mean.toFixed(2)}</span> | <span>σ = {stdDev.toFixed(2)}</span></div>
            </div>
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border space-y-2">
                <div className="flex justify-between items-center px-2 pt-2">
                   <div className="flex items-center space-x-1 sm:space-x-2">
                        <button onClick={() => setTrendFilter('all')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${trendFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button>
                        <button onClick={() => setTrendFilter('up')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'up' ? 'bg-green-700 text-white' : 'bg-zinc-800/50 text-green-400'}`}><ArrowUp size={14}/> <span>{trendCounts.up.toFixed(0)}%</span></button>
                        <button onClick={() => setTrendFilter('down')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'down' ? 'bg-red-700 text-white' : 'bg-zinc-800/50 text-red-400'}`}><ArrowDown size={14}/> <span>{trendCounts.down.toFixed(0)}%</span></button>
                        <button onClick={() => setTrendFilter('single')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'single' ? 'bg-blue-700 text-white' : 'bg-zinc-800/50 text-blue-400'}`}><Sparkles size={14}/> <span>{trendCounts.new.toFixed(0)}%</span></button>
                   </div>
                   <div className="flex items-center space-x-2">
                       <div className="text-sm font-medium text-zinc-500">{searchedAnimals.length} / {classifiedAnimals.length}</div>
                       <button onClick={resetFilters} title="Limpiar todos los filtros" className="text-zinc-500 hover:text-white"><FilterX size={16}/></button>
                   </div>
                </div>
                 <div className="flex justify-between items-center p-2 border-t border-brand-border">
                    <div className="text-xs font-semibold text-zinc-400">Fase Lactancia:</div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <button onClick={() => setLactationPhaseFilter('all')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button>
                        <button onClick={() => setLactationPhaseFilter('first')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'first' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>1er T</button>
                        <button onClick={() => setLactationPhaseFilter('second')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'second' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>2do T</button>
                        <button onClick={() => setLactationPhaseFilter('third')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'third' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>3er T</button>
                        <button onClick={() => setLactationPhaseFilter('drying')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'drying' ? 'bg-red-700/80 text-white' : 'bg-zinc-800/50 text-red-300'}`}>A Secado</button>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {searchedAnimals.length > 0 ? ( 
                    searchedAnimals.map((animal) => (<MilkingAnimalRow key={animal.weighingId || animal.id} animal={animal} onSelectAnimal={onSelectAnimal}/>))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-400">
                            {searchTerm 
                                ? `No se encontraron resultados para "${searchTerm}"` 
                                : "No se encontraron animales con los filtros actuales."}
                        </p>
                    </div>
                )}
            </div>
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="¿Qué es el Análisis del Ordeño?">
                <div className="text-zinc-300 space-y-4 text-base">
                    <p>Este panel clasifica a los animales en ordeño según su rendimiento, permitiéndote identificar rápidamente a los individuos de mayor y menor producción.</p>
                    <div><h4 className="font-semibold text-white mb-1">Clasificación (Pobre, Promedio, Sobresaliente)</h4><p className="text-sm">Se calcula usando la media (μ) y la desviación estándar (σ) de la producción. Los animales que se desvían significativamente del promedio se marcan como pobres o sobresalientes.</p></div>
                    <div><h4 className="font-semibold text-white mb-1">Ponderado a DEL</h4><p className="text-sm">Al activar este interruptor (<Zap size={12} className="inline-block mb-0.5"/>), el análisis se vuelve más inteligente. Otorga un mayor "score" a los animales que producen bien al inicio de su lactancia, ya que es más valioso que la misma producción en una etapa tardía.</p></div>
                </div>
            </Modal>
            
            {/* --- MODAL CON TEXTO CORREGIDO --- */}
            <Modal isOpen={isScoreInfoModalOpen} onClose={() => setIsScoreInfoModalOpen(false)} title="¿Qué es el Score Ponderado?">
              <div className="text-zinc-300 space-y-4 text-base">
                  <p>
                      El Score Ponderado ajusta la producción de un animal para premiar la **persistencia lechera**, un indicador clave de la calidad genética y la eficiencia.
                  </p>
                  <div>
                      <h4 className="font-semibold text-white mb-1">Fórmula Aplicada</h4>
                      <div className="bg-black/30 p-3 rounded-lg text-sm font-mono text-center">
                          Score = Kg × (1 + ((DEL - 50) / (DEL + 50)))
                      </div>
                  </div>
                  <p className="pt-2 border-t border-zinc-700/80 text-sm">
                      Esto significa que 2 Kg en el día **200** de lactancia obtendrán un score **mucho más alto** que 2 Kg en el día 40, ayudándote a identificar a tus animales más eficientes y persistentes.
                  </p>
              </div>
            </Modal>
        </div>
    );
}