import React from 'react';
import { KilosFilterType, CohortType, SubFilterType } from '../../hooks/useKilosAnalytics';

interface KilosFilterBarProps {
    filterState: {
        filterType: KilosFilterType;
        selectedYear: number;
        selectedCohort: CohortType;
        subFilter: SubFilterType;
    };
    setters: {
        setFilterType: (t: KilosFilterType) => void;
        setSelectedYear: (y: number) => void;
        setSelectedCohort: (c: CohortType) => void;
        setSubFilter: (s: SubFilterType) => void;
    };
}

export const KilosFilterBar: React.FC<KilosFilterBarProps> = ({ filterState, setters }) => {
    const { filterType, selectedYear, selectedCohort, subFilter } = filterState;
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="flex flex-col gap-3 px-4 py-2 bg-[#121214] border-b border-zinc-800">
            
            {/* Fila 1: Filtro Principal (Scroll Horizontal) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <FilterButton 
                    label="Actual" 
                    isActive={filterType === 'ACTUAL'} 
                    onClick={() => setters.setFilterType('ACTUAL')} 
                    icon={ActivityIcon}
                />
                <FilterButton 
                    label="Global" 
                    isActive={filterType === 'GLOBAL'} 
                    onClick={() => setters.setFilterType('GLOBAL')} 
                    icon={GlobeIcon}
                />
                <FilterButton 
                    label="Anual" 
                    isActive={filterType === 'ANUAL'} 
                    onClick={() => setters.setFilterType('ANUAL')} 
                    icon={CalendarIcon}
                />
                <FilterButton 
                    label="Cohorte" 
                    isActive={filterType === 'COHORTE'} 
                    onClick={() => setters.setFilterType('COHORTE')} 
                    icon={LayersIcon}
                />
            </div>

            {/* Fila 2: Sub-Filtros Contextuales */}
            <div className="flex items-center gap-2 animate-fade-in">
                
                {/* Opciones para ACTUAL */}
                {filterType === 'ACTUAL' && (
                    <div className="flex bg-zinc-800 rounded-lg p-0.5 w-full">
                        {(['TODOS', 'CRIAS', 'CABRITONAS'] as SubFilterType[]).map((sf) => (
                            <button
                                key={sf}
                                onClick={() => setters.setSubFilter(sf)}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                                    subFilter === sf ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {sf}
                            </button>
                        ))}
                    </div>
                )}

                {/* Opciones para ANUAL / COHORTE (Selector Año) */}
                {(filterType === 'ANUAL' || filterType === 'COHORTE') && (
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setters.setSelectedYear(Number(e.target.value))}
                        className="bg-zinc-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg border-none focus:ring-1 focus:ring-brand-green outline-none"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}

                {/* Opciones para COHORTE (Selector Trimestre) */}
                {filterType === 'COHORTE' && (
                    <div className="flex bg-zinc-800 rounded-lg p-0.5 flex-1">
                        {(['A', 'B', 'C', 'D'] as CohortType[]).map((c) => (
                            <button
                                key={c}
                                onClick={() => setters.setSelectedCohort(c)}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                                    selectedCohort === c ? 'bg-brand-blue text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FilterButton = ({ label, isActive, onClick, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
            isActive 
                ? 'bg-white text-black border-white font-bold' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
        }`}
    >
        {Icon && <Icon size={12} />}
        <span className="text-xs">{label}</span>
    </button>
);

// Iconos simples SVG
const ActivityIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);
const GlobeIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);
const CalendarIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
const LayersIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
);