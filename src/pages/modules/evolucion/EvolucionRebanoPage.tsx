import React, { useState, useMemo } from 'react';
// PDF Export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Hooks y Tipos
import { useHerdEvolution, MonthlyPopulationState, SimulationConfig } from '../../../hooks/useHerdEvolution';
import { useMilkCashFlow, CashFlowDataPoint } from '../../../hooks/useMilkCashFlow';
// Iconos
import { TrendingUp, Users, DollarSign, Calendar, Download } from 'lucide-react';
import { GiGoat } from 'react-icons/gi';
// Gráficos
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Line, ComposedChart, Legend,
} from 'recharts';

// --- COMPONENTES UI EXTERNOS O DEFINIDOS EN OTRO LUGAR ---
// (Asumiendo que existen KpiCard, SegmentedControl, CustomTooltip, CustomLegend)

// --- Ejemplo KpiCard ---
const KpiCard = ({ title, value, icon: Icon, unit, color = 'text-white' }: { title: string, value: string | number, icon: React.ElementType, unit?: string, color?: string }) => ( <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border"> <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"> <Icon size={14} /> <span>{title}</span> </div> <p className={`text-3xl font-bold ${color} mt-1`}> {value} <span className="text-xl text-zinc-400">{unit}</span> </p> </div> );
// --- Ejemplo SegmentedControl ---
type SegmentValue = string | number;
const SegmentedControl = <T extends SegmentValue>({ options, value, onChange }: { options: { label: string, value: T }[], value: T, onChange: (value: T) => void }) => ( <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border"> {options.map(opt => ( <button key={String(opt.value)} onClick={() => onChange(opt.value)} className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${ value === opt.value ? 'bg-zinc-700 text-white' : 'text-zinc-400' }`}> {opt.label} </button> ))} </div> );
// --- Ejemplo CustomTooltip (Adaptado para recibir monedaSimbolo) ---
const CustomTooltip = ({ active, payload, label, titleFormatter, monedaSimbolo }: { active?: boolean, payload?: any[], label?: string, titleFormatter?: (label: string) => string, monedaSimbolo?: string }) => {
     if (active && payload && payload.length && label !== undefined) {
        const finalTitle = titleFormatter ? titleFormatter(label) : `Mes ${label}`;
        // Formatter interno simple
        const formatValue = (value: any, dataKey: string) => {
            if (typeof value !== 'number') return value ?? 'N/A';
            // Aplicar formato de moneda si monedaSimbolo está presente y el dataKey lo sugiere
            if (monedaSimbolo && (dataKey.toLowerCase().includes('ingreso') || dataKey.toLowerCase().includes('venta'))) {
                return `${monedaSimbolo}${value.toFixed(0)}`;
            }
            // Formato numérico general
            return value.toFixed(0);
        };
        return (
            <div className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-zinc-700 shadow-lg">
                <p className="text-base font-bold text-white mb-2">{finalTitle}</p>
                <div className="space-y-1">
                    {payload.map((p: any, index: number) => (
                        <div key={`${p.dataKey}-${index}`} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill }}></div>
                                <span className="text-sm text-zinc-300">{p.name}:</span>
                            </div>
                            <span className="text-sm font-semibold text-white">
                                {formatValue(p.value, p.dataKey)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};
// --- Ejemplo CustomLegend ---
const CustomLegend = ({ items }: { items: { name: string, color: string }[] }) => ( <div className="absolute top-4 left-4 p-2 flex flex-wrap items-center gap-4 bg-black/30 backdrop-blur-sm rounded-lg z-10"> {items.map(item => ( <div key={item.name} className="flex items-center gap-1.5"> <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div> <span className="text-xs text-zinc-200 font-medium">{item.name}</span> </div> ))} </div> );


// --- Tipos para las vistas temporales ---
type TimeView = 'semestral' | 'anual';
type CashFlowView = 'quincenal' | 'mensual' | 'semestral' | 'anual';
type TableView = 'anual-detailed' | 'semestral-summary';

// --- Interfaz para datos semestrales agregados ---
interface AggregatedSemestralData {
    semesterIndex: number; year: number; name: string;
    startCabras: number; startCabritonas: number; startCabritas: number; startPadres: number;
    nacimientosH: number; nacimientosM: number; muertesCrias: number; muertesLevante: number; muertesAdultas: number;
    ventasCabritos: number; ventasDescartes: number; // Número de animales
    descartesAdultas: number; // Mantenido por coherencia
    comprasVientres: number;
    promocionCriasLevante: number; promocionLevanteAdultas: number;
    endCabras: number; endCabritonas: number; endCabritas: number; endPadres: number;
    endTotal: number;
    Litros: number; Hembras: number;
    ingresosVentaLeche: number; ingresosVentaCabritos: number; ingresosVentaDescartes: number; ingresosTotales: number; // Plural
    Cabras: number; Levante: number; Crías: number;
}
// Interfaz para datos anuales agregados
interface AggregatedAnnualData {
    year: number; name: string;
    Cabras: number; Levante: number; Crías: number;
    Litros: number; Hembras: number;
    ingresosVentaLeche: number; ingresosVentaCabritos: number; ingresosVentaDescartes: number; ingresosTotales: number; // Plural
}

// --- Helper para agrupar datos MENSUALES en anuales ---
const aggregateMonthlyToAnnual = (monthlyData: MonthlyPopulationState[]): AggregatedAnnualData[] => {
    const annualData: AggregatedAnnualData[] = [];
    if (!monthlyData || monthlyData.length === 0) return annualData;
    const years = Array.from(new Set(monthlyData.map(m => m.year))).filter(y => y > 0);
    years.forEach(year => {
        const monthsInYear = monthlyData.filter(m => m.year === year);
        const lastMonthOfYear = monthsInYear[monthsInYear.length - 1];
        if (!lastMonthOfYear) return;
        annualData.push({
            year: year, name: `Año ${year}`,
            Cabras: lastMonthOfYear.endCabras, Levante: lastMonthOfYear.endCabritonas, Crías: lastMonthOfYear.endCabritas,
            Litros: monthsInYear.reduce((sum, m) => sum + m.litrosLecheProducidos, 0),
            Hembras: Math.round(monthsInYear.reduce((sum, m) => sum + m.hembrasEnProduccion, 0) / monthsInYear.length),
            ingresosVentaLeche: monthsInYear.reduce((sum, m) => sum + m.ingresosVentaLeche, 0),
            ingresosVentaCabritos: monthsInYear.reduce((sum, m) => sum + m.ingresosVentaCabritos, 0),
            ingresosVentaDescartes: monthsInYear.reduce((sum, m) => sum + m.ingresosVentaDescartes, 0),
            ingresosTotales: monthsInYear.reduce((sum, m) => sum + m.ingresosTotales, 0), // Plural
        });
    });
    return annualData;
};

// --- Helper para agrupar flujo de caja quincenal ---
const aggregateCashFlow = (cashFlowData: CashFlowDataPoint[], groupBy: 'semestral' | 'anual'): { name: string, ingresoLeche: number }[] => {
     const aggregated: { [key: string]: number } = {};
    cashFlowData.forEach(cfItem => { // Renombrado cf a cfItem
        const yearMatch = cfItem.name.match(/Y(\d+)/);
        const monthMatch = cfItem.name.match(/M(\d+)/);
        if (!yearMatch || !monthMatch) return;
        const year = parseInt(yearMatch[1]);
        const month = parseInt(monthMatch[1]);
        const semester = Math.ceil(month / 6);
        let key = '';
        if (groupBy === 'semestral') key = `Año ${year}-S${semester}`;
        else key = `Año ${year}`;
        aggregated[key] = (aggregated[key] || 0) + cfItem.ingresoLeche;
    });
    return Object.entries(aggregated).map(([name, ingresoLeche]) => ({ name, ingresoLeche: parseFloat(ingresoLeche.toFixed(0)) }));
};

// --- Helper para agrupar datos MENSUALES en semestrales ---
const aggregateMonthlyToSemestral = (monthlyData: MonthlyPopulationState[], projectionYears: number, simConfig: SimulationConfig | null): AggregatedSemestralData[] => {
    const semestralData: AggregatedSemestralData[] = [];
    if (!monthlyData || monthlyData.length === 0 || !simConfig) return semestralData;
    const numSemesters = projectionYears * 2;
    for(let s=1; s <= numSemesters; s++) {
         const year = Math.ceil(s / 2);
         const startMonth = (s - 1) * 6 + 1;
         const endMonth = s * 6;
         const monthsInSemester = monthlyData.filter(m => m.monthIndex >= startMonth && m.monthIndex <= endMonth);
         if(monthsInSemester.length === 0) continue;
         const firstMonthOfSemester = monthsInSemester[0];
         const lastMonthOfSemester = monthsInSemester[monthsInSemester.length-1];
         const ingresosCabritosSem = monthsInSemester.reduce((sum, m) => sum + m.ingresosVentaCabritos, 0);
         const ventasCabritosNum = simConfig.precioVentaCabritoKg > 0 ? (ingresosCabritosSem / simConfig.precioVentaCabritoKg / 15) : 0;
         const descartesAdultasNum = monthsInSemester.reduce((sum, m) => sum + m.descartesAdultas, 0);

         semestralData.push({
            semesterIndex: s, year: year, name: `S${s} (A${year})`,
            startCabras: firstMonthOfSemester.startCabras, startCabritonas: firstMonthOfSemester.startCabritonas, startCabritas: firstMonthOfSemester.startCabritas, startPadres: firstMonthOfSemester.startPadres,
            nacimientosH: monthsInSemester.reduce((sum, m) => sum + m.nacimientosHembras, 0),
            nacimientosM: monthsInSemester.reduce((sum, m) => sum + m.nacimientosMachos, 0),
            muertesCrias: monthsInSemester.reduce((sum, m) => sum + m.muertesCrías, 0),
            muertesLevante: monthsInSemester.reduce((sum, m) => sum + m.muertesLevante, 0),
            muertesAdultas: monthsInSemester.reduce((sum, m) => sum + m.muertesAdultas, 0),
            ventasCabritos: ventasCabritosNum,
            ventasDescartes: descartesAdultasNum,
            descartesAdultas: descartesAdultasNum,
            comprasVientres: monthsInSemester.reduce((sum, m) => sum + m.comprasVientres, 0),
            promocionCriasLevante: monthsInSemester.reduce((sum, m) => sum + m.cabritasACabritonas, 0),
            promocionLevanteAdultas: monthsInSemester.reduce((sum, m) => sum + m.cabritonasACabras, 0),
            endCabras: lastMonthOfSemester.endCabras, endCabritonas: lastMonthOfSemester.endCabritonas, endCabritas: lastMonthOfSemester.endCabritas, endPadres: lastMonthOfSemester.endPadres,
            endTotal: lastMonthOfSemester.endTotal,
            Cabras: lastMonthOfSemester.endCabras, Levante: lastMonthOfSemester.endCabritonas, Crías: lastMonthOfSemester.endCabritas,
            Litros: monthsInSemester.reduce((sum, m) => sum + m.litrosLecheProducidos, 0),
            Hembras: monthsInSemester.length > 0 ? Math.round(monthsInSemester.reduce((sum, m) => sum + m.hembrasEnProduccion, 0) / monthsInSemester.length) : 0, // Evitar división por cero
            ingresosVentaLeche: monthsInSemester.reduce((sum, m) => sum + m.ingresosVentaLeche, 0),
            ingresosVentaCabritos: ingresosCabritosSem,
            ingresosVentaDescartes: monthsInSemester.reduce((sum, m) => sum + m.ingresosVentaDescartes, 0),
            ingresosTotales: monthsInSemester.reduce((sum, m) => sum + m.ingresosTotales, 0), // Plural
         });
    }
    return semestralData;
};

// --- Helper para agrupar flujo de caja QUINCENAL en MENSUAL ---
const aggregateCashFlowMonthly = (cashFlowData: CashFlowDataPoint[]): { name: string, ingresoLeche: number }[] => {
    const aggregated: { [key: string]: { name: string, ingresoLeche: number, monthIndex: number } } = {};
    cashFlowData.forEach(cfItem => { // Renombrado cf a cfItem
        const yearMatch = cfItem.name.match(/Y(\d+)/);
        const monthMatch = cfItem.name.match(/M(\d+)/);
        if (!yearMatch || !monthMatch) return;
        const year = parseInt(yearMatch[1]);
        const month = parseInt(monthMatch[1]);
        const monthIndex = (year - 1) * 12 + month;
        const key = `Año ${year}-M${month}`;
        if (!aggregated[key]) {
            aggregated[key] = { name: key, ingresoLeche: 0, monthIndex: monthIndex };
        }
        aggregated[key].ingresoLeche += cfItem.ingresoLeche;
    });
    return Object.values(aggregated)
                 .sort((a,b) => a.monthIndex - b.monthIndex)
                 .map(item => ({ name: item.name, ingresoLeche: parseFloat(item.ingresoLeche.toFixed(0)) }));
};

// --- Componente Principal ---
interface EvolucionRebanoPageProps {
    simulationConfig: SimulationConfig;
    mode: 'simulacion' | 'real';
}

export default function EvolucionRebanoPage({ simulationConfig, mode }: EvolucionRebanoPageProps) {
    const [projectionYears, setProjectionYears] = useState(3);
    const [timeView, setTimeView] = useState<TimeView>('anual');
    const [cashFlowView, setCashFlowView] = useState<CashFlowView>('semestral');
    const [tableView, setTableView] = useState<TableView>('anual-detailed');

    // 1. Correr Simulación MENSUAL
    const monthlyProjection = useHerdEvolution(simulationConfig, projectionYears);
    const initialState = monthlyProjection.length > 0 ? monthlyProjection[0] : null;

    // 2. Correr Simulación de Flujo de Caja QUINCENAL
    const { cashFlow: quincenalCashFlow } = useMilkCashFlow(monthlyProjection.slice(1));

    const { monedaSimbolo, nombreFinca } = simulationConfig;

    // 3. Calcular KPIs Totales
    const startPop = initialState ? initialState.startTotal : 0;
    const lastMonthData = monthlyProjection.length > 1 ? monthlyProjection[monthlyProjection.length - 1] : initialState;
    const endPop = lastMonthData ? lastMonthData.endTotal : startPop;
    const endGoats = lastMonthData ? lastMonthData.endCabras : (initialState ? initialState.startCabras : 0);
    const totalIncome = monthlyProjection.slice(1).reduce((sum, month) => sum + month.ingresosTotales, 0);

    // 4. Preparar Datos Agregados
    const annualProjection = useMemo(() => aggregateMonthlyToAnnual(monthlyProjection.slice(1)), [monthlyProjection]);
    const semestralProjection = useMemo(() => aggregateMonthlyToSemestral(monthlyProjection.slice(1), projectionYears, simulationConfig), [monthlyProjection, projectionYears, simulationConfig]);
    const monthlyCashFlow = useMemo(() => aggregateCashFlowMonthly(quincenalCashFlow), [quincenalCashFlow]);
    const semestralCashFlow = useMemo(() => aggregateCashFlow(quincenalCashFlow, 'semestral'), [quincenalCashFlow]);
    const annualCashFlow = useMemo(() => aggregateCashFlow(quincenalCashFlow, 'anual'), [quincenalCashFlow]);

    // Seleccionar datos según la vista
    const populationChartData = timeView === 'anual' ? annualProjection : semestralProjection;
    const milkChartData = timeView === 'anual' ? annualProjection : semestralProjection;
    const incomeChartData = timeView === 'anual' ? annualProjection : semestralProjection;
    let cashFlowChartData: any[] = [];
    if (cashFlowView === 'anual') cashFlowChartData = annualCashFlow;
    else if (cashFlowView === 'semestral') cashFlowChartData = semestralCashFlow;
    else if (cashFlowView === 'mensual') cashFlowChartData = monthlyCashFlow;
    else cashFlowChartData = quincenalCashFlow;

    // Formatters
    const populationTooltipTitleFormatter = (label: string) => label.startsWith('Año') ? label : label.replace('S', 'Semestre ').replace(' (A', ' (Año ');
    const cashFlowXAxisFormatter = (tick: string) => {
        if(cashFlowView === 'quincenal') return tick.substring(tick.indexOf('M'));
        if(cashFlowView === 'mensual') return tick.substring(tick.indexOf('M'));
        if(cashFlowView === 'semestral') return tick.substring(tick.indexOf('-S')+1);
        return tick;
    };
     const cashFlowTooltipTitleFormatter = (label: string) => {
        if (cashFlowView === 'quincenal') { const parts = label.split('-'); if (parts.length < 2) return label; const yearMonth = parts[0]; const quincena = parts[1]; const year = yearMonth.substring(1, yearMonth.indexOf('M')); const month = yearMonth.substring(yearMonth.indexOf('M') + 1); return `Año ${year} Mes ${month} - ${quincena}`; }
        if (cashFlowView === 'mensual') { const parts = label.split('-'); if (parts.length < 2) return label; const year = parts[0].replace('Año ', ''); const month = parts[1].replace('M',''); return `Año ${year} Mes ${month}`; }
        return label;
    };


    // --- FUNCIÓN EXPORTAR PDF ---
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const tableBody: (string | number)[][] = [];
        let tableHeaders: string[][] = [];

        const title = `Proyección Evolución Rebaño - ${nombreFinca} (${projectionYears} Años)`;
        const subtitle = mode === 'simulacion' ? 'Modo: Simulación' : 'Modo: Proyección Real';
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(subtitle, 14, 20);

        if (tableView === 'anual-detailed') {
             tableHeaders = [
                ["Año", "Sem", "I.Cabras", "I.Lev", "I.Crías", "I.Padr", "Nac.H", "Nac.M", "M.Cría", "M.Lev", "M.Adul", "V.Cabri", "V.Desc", "Comp.V", "C→L", "L→A", "F.Cabras", "F.Lev", "F.Crías", "F.Padr", "F.Total", "L.Leche", `Ing.Tot (${monedaSimbolo})`]
             ];
             if (initialState) { tableBody.push([ "Inicial", "", initialState.startCabras, initialState.startCabritonas, initialState.startCabritas, initialState.startPadres, "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", initialState.endCabras, initialState.endCabritonas, initialState.endCabritas, initialState.endPadres, initialState.endTotal, "-", "-" ]); }
            semestralProjection.forEach(p => {
                 tableBody.push([
                    p.year, p.semesterIndex % 2 === 1 ? 1 : 2,
                    p.startCabras, p.startCabritonas, p.startCabritas, p.startPadres,
                    Math.round(p.nacimientosH), Math.round(p.nacimientosM),
                    Math.round(p.muertesCrias), Math.round(p.muertesLevante), Math.round(p.muertesAdultas),
                    Math.round(p.ventasCabritos), Math.round(p.ventasDescartes), Math.round(p.comprasVientres),
                    Math.round(p.promocionCriasLevante), Math.round(p.promocionLevanteAdultas),
                    p.endCabras, p.endCabritonas, p.endCabritas, p.endPadres, p.endTotal,
                    Math.round(p.Litros), p.ingresosTotales.toFixed(0)
                 ]);
            });

        } else { // semestral-summary
             tableHeaders = [["Semestre", "Año", "Fin Cabras", "Fin Levante", "Fin Crías", "Fin Padres", "Fin Total", "L. Leche", `Ing. Total (${monedaSimbolo})`]];
             if (initialState) { tableBody.push([ "Inicial", "", initialState.endCabras, initialState.endCabritonas, initialState.endCabritas, initialState.endPadres, initialState.endTotal, "-", "-" ]); }
            semestralProjection.forEach(p => {
                tableBody.push([ `S${p.semesterIndex}`, p.year, p.endCabras, p.endCabritonas, p.endCabritas, p.endPadres, p.endTotal, Math.round(p.Litros), p.ingresosTotales.toFixed(0) ]);
            });
        }

        autoTable(doc, {
            head: tableHeaders, body: tableBody, startY: 25, theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 6, halign: 'center', cellPadding: 1 },
            styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: { /* ...Alineación derecha... */ },
        });

        doc.save(`proyeccion_evolucion_${tableView === 'anual-detailed' ? 'anual_det' : 'sem_res'}.pdf`);
    };


    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in p-4">

            <h2 className="text-center text-xl font-semibold text-indigo-400 -mb-4">
                {mode === 'simulacion' ? 'Resultados de Simulación' : 'Proyección Basada en Datos Reales'}
            </h2>

             {/* Controles Superiores */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <SegmentedControl value={projectionYears} onChange={setProjectionYears} options={[ { label: '1 Año', value: 1 }, { label: '3 Años', value: 3 }, { label: '5 Años', value: 5 }, { label: '10 Años', value: 10 } ]}/>
                <div className='flex items-center gap-2'>
                    <Calendar size={16} className='text-zinc-400'/>
                    <p className='text-sm font-semibold text-zinc-400 whitespace-nowrap'>Vista Gráficos:</p>
                    <SegmentedControl<TimeView> value={timeView} onChange={setTimeView} options={[ { label: 'Semestral', value: 'semestral' }, { label: 'Anual', value: 'anual' } ]}/>
                </div>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <KpiCard title="Población Inicial" value={startPop} icon={Users} unit="Animales" />
                <KpiCard title={`Población Final (${timeView === 'anual' ? `Año ${projectionYears}` : `Sem. ${projectionYears*2}`})`} value={endPop} icon={TrendingUp} unit="Animales" color={endPop >= startPop ? 'text-brand-green' : 'text-brand-red'}/>
                <KpiCard title={`Vientres Finales`} value={endGoats} icon={GiGoat} unit="Cabras" />
                <KpiCard title={`Ingresos Totales (${projectionYears} Años Est.)`} value={totalIncome.toFixed(0)} icon={DollarSign} unit={monedaSimbolo} color="text-brand-green"/>
            </div>

             {/* Fila de Gráficos 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Población */}
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border h-80 relative">
                     <h3 className="text-sm font-semibold text-zinc-300 absolute top-4 left-4 z-20">Composición Rebaño ({timeView === 'anual' ? 'Anual' : 'Semestral'})</h3>
                     <CustomLegend items={[ { name: 'Cabras', color: '#34C759' }, { name: 'Levante', color: '#FF9500' }, { name: 'Crías', color: '#007AFF' } ]} />
                     <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={populationChartData} margin={{ top: 50, right: 10, left: -25, bottom: 0 }}>
                            <defs> <linearGradient id="colorCabras" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34C759" stopOpacity={0.7}/><stop offset="95%" stopColor="#34C759" stopOpacity={0.1}/></linearGradient> <linearGradient id="colorCabritonas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF9500" stopOpacity={0.7}/><stop offset="95%" stopColor="#FF9500" stopOpacity={0.1}/></linearGradient> <linearGradient id="colorCabritas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007AFF" stopOpacity={0.7}/><stop offset="95%" stopColor="#007AFF" stopOpacity={0.1}/></linearGradient> </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="name" interval="preserveStartEnd" minTickGap={20} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
                            {/* --- CORRECCIÓN: No pasar formatter --- */}
                            <Tooltip content={<CustomTooltip titleFormatter={populationTooltipTitleFormatter} />} />
                            <Area type="monotone" dataKey="Cabras" name="Cabras" stackId="1" stroke="#34C759" fill="url(#colorCabras)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Levante" name="Levante" stackId="1" stroke="#FF9500" fill="url(#colorCabritonas)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Crías" name="Crías" stackId="1" stroke="#007AFF" fill="url(#colorCabritas)" strokeWidth={2} />
                        </AreaChart>
                     </ResponsiveContainer>
                 </div>
                 {/* Gráfico de Producción de Leche */}
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border h-80 relative">
                     <h3 className="text-sm font-semibold text-zinc-300 absolute top-4 right-4 z-20">Producción Leche ({timeView === 'anual' ? 'Anual' : 'Semestral'})</h3>
                     <CustomLegend items={[ { name: 'Litros', color: '#A0A0A0' }, { name: 'Hembras Prod.', color: '#FF2D55' } ]} />
                     <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={milkChartData} margin={{ top: 50, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="name" interval="preserveStartEnd" minTickGap={20} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}/>
                            <YAxis yAxisId="left" orientation="left" stroke="#A0A0A0" tick={{ fill: 'rgba(200,200,200,0.7)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#FF2D55" tick={{ fill: 'rgba(255, 100, 100, 0.7)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip titleFormatter={populationTooltipTitleFormatter} />} />
                            <Area yAxisId="left" type="monotone" dataKey="Litros" name="Litros" stroke="#A0A0A0" fill="rgba(200,200,200,0.1)" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="Hembras" name="Hembras Prod." stroke="#FF2D55" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                        </ComposedChart>
                     </ResponsiveContainer>
                 </div>
             </div>
             {/* Fila de Gráficos 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Flujo de Caja */}
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border h-80">
                    <div className='flex items-center justify-between mb-2'>
                        <h3 className="text-sm font-semibold text-zinc-300">Flujo de Caja (Leche)</h3>
                        <SegmentedControl<CashFlowView> value={cashFlowView} onChange={setCashFlowView} options={[ { label: 'Q', value: 'quincenal' }, { label: 'M', value: 'mensual' }, { label: 'S', value: 'semestral' }, { label: 'A', value: 'anual' } ]}/>
                    </div>
                    <ResponsiveContainer width="100%" height="calc(100% - 30px)">
                        <BarChart data={cashFlowChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="name" tickFormatter={cashFlowXAxisFormatter} interval="preserveStartEnd" minTickGap={cashFlowView === 'quincenal' ? 0 : (cashFlowView === 'mensual' ? 5 : 10)} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: cashFlowView === 'quincenal' ? 7 : (cashFlowView === 'mensual' ? 9 : 10), fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
                            {/* --- CORRECCIÓN: Pasar monedaSimbolo a CustomTooltip --- */}
                            <Tooltip content={<CustomTooltip titleFormatter={cashFlowTooltipTitleFormatter} monedaSimbolo={monedaSimbolo} />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                            <Bar dataKey="ingresoLeche" name={`Ingreso (${monedaSimbolo})`} fill="#34C759" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 {/* Gráfico de Ingresos Totales */}
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border h-80 relative">
                     <h3 className="text-sm font-semibold text-zinc-300 absolute top-4 left-4 z-20">Ingresos Totales ({timeView === 'anual' ? 'Anual' : 'Semestral'})</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeChartData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false}/>
                            <XAxis dataKey="name" interval="preserveStartEnd" minTickGap={20} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}/>
                             {/* --- CORRECCIÓN: Pasar monedaSimbolo a CustomTooltip --- */}
                            <Tooltip content={<CustomTooltip titleFormatter={populationTooltipTitleFormatter} monedaSimbolo={monedaSimbolo} />}/>
                            <Legend wrapperStyle={{fontSize: "10px", paddingTop: "10px"}}/>
                            <Bar dataKey="ingresosVentaLeche" name="V. Leche" stackId="a" fill="#34C759" />
                            <Bar dataKey="ingresosVentaCabritos" name="V. Cabritos" stackId="a" fill="#007AFF" />
                            <Bar dataKey="ingresosVentaDescartes" name="V. Descartes" stackId="a" fill="#FF9500" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabla de Datos */}
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl border border-brand-border overflow-hidden">
                <div className="flex justify-between items-center p-4">
                     <h3 className="text-lg font-semibold text-white">Datos Detallados</h3>
                     <div className="flex items-center gap-4">
                        <SegmentedControl<TableView> value={tableView} onChange={setTableView} options={[ { label: 'Anual Det.', value: 'anual-detailed' }, { label: 'Semestral Res.', value: 'semestral-summary' } ]}/>
                        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg" title="Exportar tabla a PDF">
                            <Download size={16}/> PDF
                        </button>
                     </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                    {/* --- CORRECCIÓN: Eliminar whitespace dentro de <table> --- */}
                    <table className="w-full min-w-max text-left">
                        {tableView === 'anual-detailed' && (
                            <thead className="border-b border-brand-border bg-black/20 sticky top-0 z-10">
                                <tr className="text-[10px] text-zinc-400 uppercase font-sans">
                                    <th className="p-2 sticky left-0 bg-black/20">Año</th><th className="p-2 sticky left-12 bg-black/20">Sem</th><th className="p-2 text-right">I.Cabras</th><th className="p-2 text-right">I.Lev</th><th className="p-2 text-right">I.Crías</th><th className="p-2 text-right">I.Padr</th><th className="p-2 text-right text-sky-400">Nac.H</th><th className="p-2 text-right text-sky-400">Nac.M</th><th className="p-2 text-right text-red-400">M.Cría</th><th className="p-2 text-right text-red-400">M.Lev</th><th className="p-2 text-right text-red-400">M.Adul</th><th className="p-2 text-right text-orange-400">V.Cabri</th><th className="p-2 text-right text-orange-400">V.Desc</th><th className="p-2 text-right text-purple-400">Comp.V</th><th className="p-2 text-right text-green-400">C→L</th><th className="p-2 text-right text-green-400">L→A</th><th className="p-2 text-right font-bold">F.Cabras</th><th className="p-2 text-right font-bold">F.Lev</th><th className="p-2 text-right font-bold">F.Crías</th><th className="p-2 text-right font-bold">F.Padr</th><th className="p-2 text-right font-bold">F.Total</th><th className="p-2 text-right text-teal-300">L.Leche</th><th className="p-2 text-right text-emerald-300">Ing.Tot ({monedaSimbolo})</th>
                                </tr>
                            </thead>
                        )}
                        {tableView === 'semestral-summary' && (
                             <thead className="border-b border-brand-border bg-black/20 sticky top-0 z-10">
                                <tr className="text-[10px] text-zinc-400 uppercase font-sans">
                                    <th className="p-2 sticky left-0 bg-black/20">Semestre</th><th className="p-2 text-right font-bold">Fin Cabras</th><th className="p-2 text-right font-bold">Fin Levante</th><th className="p-2 text-right font-bold">Fin Crías</th><th className="p-2 text-right font-bold">Fin Padres</th><th className="p-2 text-right font-bold">Fin Total</th><th className="p-2 text-right text-teal-300">L. Leche</th><th className="p-2 text-right text-emerald-300">Ing. Total ({monedaSimbolo})</th>
                                </tr>
                            </thead>
                        )}
                        {/* --- CORRECCIÓN: Eliminar whitespace --- */}
                        <tbody className="divide-y divide-brand-border text-xs">
                            {initialState && (
                                <tr className="bg-zinc-800/50 group">
                                     {tableView === 'anual-detailed' ? ( <>
                                        <td className="p-2 font-semibold text-white sticky left-0 bg-zinc-800/50" colSpan={2}>Inicial</td>
                                        <td className="p-2 text-right font-mono text-white">{initialState.startCabras}</td><td className="p-2 text-right font-mono text-white">{initialState.startCabritonas}</td><td className="p-2 text-right font-mono text-white">{initialState.startCabritas}</td><td className="p-2 text-right font-mono text-white">{initialState.startPadres}</td>
                                        <td colSpan={10} className="p-2 text-center font-mono text-zinc-500">-</td>
                                        <td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabras}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabritonas}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabritas}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endPadres}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endTotal}</td>
                                        <td className="p-2 text-right font-mono text-zinc-500">-</td><td className="p-2 text-right font-mono text-zinc-500">-</td>
                                     </>) : (<>
                                        <td className="p-2 font-semibold text-white sticky left-0 bg-zinc-800/50">Inicial</td>
                                        <td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabras}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabritonas}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endCabritas}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endPadres}</td><td className="p-2 text-right font-mono font-bold text-white">{initialState.endTotal}</td>
                                        <td className="p-2 text-right font-mono text-zinc-500">-</td><td className="p-2 text-right font-mono text-zinc-500">-</td>
                                     </>)}
                                </tr>
                            )}
                            {semestralProjection.map((p: AggregatedSemestralData) => (
                                <tr key={p.semesterIndex} className={`hover:bg-zinc-800/60 group ${tableView === 'anual-detailed' && p.semesterIndex % 2 === 0 ? 'border-b-2 border-b-zinc-600' : ''}`}>
                                    {tableView === 'anual-detailed' ? (<>
                                        <td className="p-2 font-semibold text-white sticky left-0 bg-brand-glass group-hover:bg-zinc-800/60">{p.year}</td>
                                        <td className="p-2 font-semibold text-white sticky left-12 bg-brand-glass group-hover:bg-zinc-800/60">{p.semesterIndex % 2 === 1 ? 1 : 2}</td>
                                        <td className="p-2 text-right font-mono text-zinc-400">{p.startCabras}</td><td className="p-2 text-right font-mono text-zinc-400">{p.startCabritonas}</td><td className="p-2 text-right font-mono text-zinc-400">{p.startCabritas}</td><td className="p-2 text-right font-mono text-zinc-400">{p.startPadres}</td>
                                        <td className="p-2 text-right font-mono text-sky-400">{Math.round(p.nacimientosH)}</td><td className="p-2 text-right font-mono text-sky-400">{Math.round(p.nacimientosM)}</td>
                                        <td className="p-2 text-right font-mono text-red-400">{Math.round(p.muertesCrias)}</td><td className="p-2 text-right font-mono text-red-400">{Math.round(p.muertesLevante)}</td><td className="p-2 text-right font-mono text-red-400">{Math.round(p.muertesAdultas)}</td>
                                        <td className="p-2 text-right font-mono text-orange-400">{Math.round(p.ventasCabritos)}</td><td className="p-2 text-right font-mono text-orange-400">{Math.round(p.ventasDescartes)}</td><td className="p-2 text-right font-mono text-purple-400">{Math.round(p.comprasVientres)}</td>
                                        <td className="p-2 text-right font-mono text-green-400">{Math.round(p.promocionCriasLevante)}</td><td className="p-2 text-right font-mono text-green-400">{Math.round(p.promocionLevanteAdultas)}</td>
                                        <td className="p-2 text-right font-mono font-bold text-white">{p.endCabras}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endCabritonas}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endCabritas}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endPadres}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endTotal}</td>
                                        <td className="p-2 text-right font-mono text-teal-300">{Math.round(p.Litros)}</td><td className="p-2 text-right font-mono text-emerald-300">{p.ingresosTotales.toFixed(0)}</td>
                                    </>) : (<>
                                        <td className="p-2 font-semibold text-white sticky left-0 bg-brand-glass group-hover:bg-zinc-800/60">{`S${p.semesterIndex} (A${p.year})`}</td>
                                        <td className="p-2 text-right font-mono font-bold text-white">{p.endCabras}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endCabritonas}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endCabritas}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endPadres}</td><td className="p-2 text-right font-mono font-bold text-white">{p.endTotal}</td>
                                        <td className="p-2 text-right font-mono text-teal-300">{Math.round(p.Litros)}</td><td className="p-2 text-right font-mono text-emerald-300">{p.ingresosTotales.toFixed(0)}</td>
                                    </>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}