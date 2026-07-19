// src/pages/modules/lactokeeper/LactoKeeperHistoryPage.tsx
// Historial de Producción (v1): indicadores del rebaño + listado de animales con
// sus lactancias. Interruptor Activos/Total. KPIs de ranking que filtran el
// listado. Todo se alimenta del motor único useLactationHistory.

import { useState } from 'react';
import {
    ArrowLeft, Trophy, Medal, Award, CalendarDays, Droplet, Snowflake,
    ChevronRight, Milk, TrendingUp
} from 'lucide-react';
import type { PageState as RebanoPageState } from '../../../types/navigation';
import { useLactationHistory, HistoryScope } from '../../../hooks/useLactationHistory';
import { AnimalLactationSummary, LactationRecord } from '../../../utils/lactationMetrics';

interface LactoKeeperHistoryPageProps {
    navigateToRebano: (page: RebanoPageState) => void;
}

type RankKey = 'general' | 'primi' | 'multi';

const fmtKg = (n: number) => `${Math.round(n).toLocaleString('es')} Kg`;
const fmtDays = (n: number | null) => (n == null ? '—' : `${Math.round(n)} d`);

// --- Interruptor Activos / Total ---
const ScopeToggle = ({ scope, setScope }: { scope: HistoryScope; setScope: (s: HistoryScope) => void }) => (
    <div className="flex bg-c-surface-2 rounded-xl p-1 border border-c-border">
        {(['active', 'all'] as HistoryScope[]).map(s => (
            <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${scope === s ? 'bg-c-accent-sky text-white shadow' : 'text-c-text-muted'}`}
            >
                {s === 'active' ? 'Activos' : 'Total histórico'}
            </button>
        ))}
    </div>
);

// --- Tarjeta de media ponderada ---
const StatTile = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
    <div className="bg-c-surface-2 rounded-xl p-3 border border-c-border flex flex-col items-center text-center">
        <Icon className={color} size={18} />
        <p className="text-lg font-bold text-c-text mt-1">{value}</p>
        <p className="text-[10px] text-c-text-faint uppercase tracking-wide leading-tight mt-0.5">{label}</p>
    </div>
);

// --- KPI de ranking (clicable, filtra el listado) ---
const RankTile = ({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count: number }) => (
    <button
        onClick={onClick}
        className={`rounded-xl p-3 border flex flex-col items-center text-center transition-colors ${active ? 'bg-c-accent-sky/15 border-c-accent-sky/50' : 'bg-c-surface-2 border-c-border'}`}
    >
        <Icon className={active ? 'text-c-accent-sky' : 'text-c-text-muted'} size={18} />
        <p className={`text-sm font-bold mt-1 ${active ? 'text-c-accent-sky' : 'text-c-text'}`}>{label}</p>
        <p className="text-[10px] text-c-text-faint">{count} animales</p>
    </button>
);

const ParityBadge = ({ parity }: { parity: AnimalLactationSummary['parity'] }) => {
    if (parity === '—') return null;
    const isPrimi = parity === 'Primípara';
    return (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${isPrimi ? 'text-sky-400 bg-sky-400/12 border border-sky-400/30' : 'text-purple-400 bg-purple-400/12 border border-purple-400/30'}`}>
            {parity}
        </span>
    );
};

// --- Tarjeta de animal en el ranking ---
const AnimalRankCard = ({ rankPos, summary, onClick }: { rankPos: number; summary: AnimalLactationSummary; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full text-left bg-c-surface rounded-2xl p-4 border border-c-border hover:border-c-accent-sky/40 transition-colors flex items-center gap-3"
    >
        <div className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${rankPos <= 3 ? 'bg-c-accent-gold/20 text-c-accent-gold' : 'bg-c-surface-2 text-c-text-muted'}`}>
            {rankPos}
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold font-mono text-c-text">{summary.animalId}</span>
                {summary.name && <span className="text-xs text-c-text-muted truncate max-w-[110px]">{summary.name}</span>}
                <ParityBadge parity={summary.parity} />
                {summary.isReference && <span className="text-[9px] text-c-text-faint uppercase">Ref.</span>}
            </div>
            <p className="text-[11px] text-c-text-faint mt-0.5">
                {summary.numLactations} {summary.numLactations === 1 ? 'lactancia' : 'lactancias'} · media {fmtKg(summary.avgStandardized)}
            </p>
        </div>
        <div className="text-right flex-none">
            <p className="text-lg font-bold text-c-accent-sky leading-none">{fmtKg(summary.bestStandardized)}</p>
            <p className="text-[9px] text-c-text-faint uppercase mt-0.5">mejor lact.</p>
        </div>
        <ChevronRight className="text-c-text-faint flex-none" size={18} />
    </button>
);

const EmptyState = ({ scope }: { scope: HistoryScope }) => (
    <div className="text-center py-10 text-c-text-faint">
        <Milk size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">
            {scope === 'active' ? 'No hay animales activos con lactancias registradas.' : 'No hay lactancias registradas todavía.'}
        </p>
    </div>
);

// --- Tarjeta de una lactancia individual (estilo perfil de "Leche") ---
const lactStatusPill = (l: LactationRecord) => {
    if (l.status === 'activa') return { txt: 'Actual', cls: 'text-brand-green bg-brand-green/12 border-brand-green/30' };
    if (l.status === 'finalizada') return { txt: 'Aborto', cls: 'text-red-500 bg-red-500/12 border-red-500/30' };
    if (l.status === 'seca' || l.status === 'en-secado') return { txt: 'Seca', cls: 'text-orange-400 bg-orange-400/12 border-orange-400/30' };
    return null;
};

const LactationCard = ({ lact, standardDays, onClick }: { lact: LactationRecord; standardDays: number; onClick: () => void }) => {
    const year = new Date(lact.parturitionDate + 'T00:00:00Z').getUTCFullYear();
    const pill = lactStatusPill(lact);
    return (
        <button onClick={onClick} className="w-full text-left bg-c-surface rounded-2xl p-4 border border-c-border hover:border-c-accent-sky/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                <div className="flex-none w-9 h-9 rounded-lg bg-c-accent-gold/15 text-c-accent-gold flex items-center justify-center font-bold">
                    {lact.lactationNumber}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-c-text">Lactancia {lact.lactationNumber}</h4>
                        <span className="text-xs text-c-text-faint">{year}</span>
                        {pill && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${pill.cls}`}>{pill.txt}</span>}
                    </div>
                    <p className="text-[11px] text-c-text-faint">
                        {lact.weighingsCount > 0 ? `${lact.weighingsCount} pesajes` : 'Sin pesajes'}
                    </p>
                </div>
                <ChevronRight className="text-c-text-faint flex-none" size={18} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                    <p className="text-[10px] text-c-text-faint flex items-center justify-center gap-0.5"><Droplet size={10} />Prom</p>
                    <p className="text-sm font-bold text-c-text">{lact.averageKg.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-c-text-faint flex items-center justify-center gap-0.5"><TrendingUp size={10} />Pico</p>
                    <p className="text-sm font-bold text-c-text">{lact.peakKg.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-c-text-faint flex items-center justify-center gap-0.5"><CalendarDays size={10} />Días</p>
                    <p className="text-sm font-bold text-c-text">{lact.durationDays}</p>
                </div>
                <div>
                    <p className="text-[10px] text-c-text-faint">a {standardDays}d</p>
                    <p className="text-sm font-bold text-c-accent-sky">{Math.round(lact.standardizedProduction)}</p>
                </div>
            </div>
        </button>
    );
};

// --- Vista de detalle de un animal (sus lactancias) ---
const AnimalDetail = ({
    summary, standardDays, onBack, onOpenLactation
}: {
    summary: AnimalLactationSummary;
    standardDays: number;
    onBack: () => void;
    onOpenLactation: (l: LactationRecord) => void;
}) => (
    <div className="p-4 space-y-4 pb-24">
        <button onClick={onBack} className="flex items-center gap-2 text-c-text-muted hover:text-c-text">
            <ArrowLeft size={20} /> <span className="font-semibold">Volver al ranking</span>
        </button>

        <div className="bg-c-surface rounded-2xl p-4 border border-c-border">
            <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-mono text-c-text">{summary.animalId}</h2>
                {summary.name && <span className="text-sm text-c-text-muted">{summary.name}</span>}
                <ParityBadge parity={summary.parity} />
                {summary.isReference && <span className="text-[9px] text-c-text-faint uppercase">Ref.</span>}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div><p className="text-sm font-bold text-c-text">{fmtKg(summary.totalMilkAllTime)}</p><p className="text-[9px] text-c-text-faint uppercase">Total</p></div>
                <div><p className="text-sm font-bold text-c-text">{fmtDays(summary.avgDuration || null)}</p><p className="text-[9px] text-c-text-faint uppercase">D. Lactancia</p></div>
                <div><p className="text-sm font-bold text-c-text">{fmtDays(summary.avgDryDays)}</p><p className="text-[9px] text-c-text-faint uppercase">D. Secos</p></div>
                <div><p className="text-sm font-bold text-c-text">{fmtDays(summary.avgOpenDays)}</p><p className="text-[9px] text-c-text-faint uppercase">D. Abiertos</p></div>
            </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-c-text-faint">
            Lactancias ({summary.numLactations})
        </p>
        <div className="space-y-2">
            {[...summary.lactations].reverse().map(l => (
                <LactationCard key={l.lactationNumber} lact={l} standardDays={standardDays} onClick={() => onOpenLactation(l)} />
            ))}
        </div>
    </div>
);

export default function LactoKeeperHistoryPage({ navigateToRebano }: LactoKeeperHistoryPageProps) {
    const [scope, setScope] = useState<HistoryScope>('active');
    const [rank, setRank] = useState<RankKey>('general');
    const [selected, setSelected] = useState<AnimalLactationSummary | null>(null);
    const data = useLactationHistory(scope);

    if (selected) {
        // refrescar el resumen seleccionado desde los datos actuales del scope
        const fresh = data.summaries.find(s => s.animalId === selected.animalId) || selected;
        return (
            <AnimalDetail
                summary={fresh}
                standardDays={data.standardDays}
                onBack={() => setSelected(null)}
                onOpenLactation={(l) => navigateToRebano({ name: 'lactation-weighings', animalId: fresh.animalId, parturitionDate: l.parturitionDate })}
            />
        );
    }

    const list = rank === 'primi' ? data.rankingPrimiparas : rank === 'multi' ? data.rankingMultiparas : data.rankingGeneral;

    return (
        <div className="p-4 space-y-5 pb-24">
            <h1 className="text-2xl font-bold text-c-text">Historial de Producción</h1>
            <ScopeToggle scope={scope} setScope={setScope} />

            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-c-text-faint mb-2">Medias ponderadas del rebaño</p>
                <div className="grid grid-cols-3 gap-3">
                    <StatTile icon={CalendarDays} label="Días Lactancia" value={fmtDays(data.avgLactationDays)} color="text-blue-300" />
                    <StatTile icon={Snowflake} label="Días Secos" value={fmtDays(data.avgDryDays)} color="text-orange-400" />
                    <StatTile icon={Droplet} label="Días Abiertos" value={fmtDays(data.avgOpenDays)} color="text-emerald-400" />
                </div>
            </div>

            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-c-text-faint mb-2">Ranking de productoras · toca para filtrar</p>
                <div className="grid grid-cols-3 gap-3">
                    <RankTile active={rank === 'general'} onClick={() => setRank('general')} icon={Trophy} label="General" count={data.rankingGeneral.length} />
                    <RankTile active={rank === 'primi'} onClick={() => setRank('primi')} icon={Medal} label="Primíparas" count={data.rankingPrimiparas.length} />
                    <RankTile active={rank === 'multi'} onClick={() => setRank('multi')} icon={Award} label="Multíparas" count={data.rankingMultiparas.length} />
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-semibold text-c-text-muted">
                    {list.length} animales · producción estandarizada a {data.standardDays} días
                </p>
                {list.length === 0 ? <EmptyState scope={scope} /> : list.map((s, i) => (
                    <AnimalRankCard key={s.animalId} rankPos={i + 1} summary={s} onClick={() => setSelected(s)} />
                ))}
            </div>
        </div>
    );
}
