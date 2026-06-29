import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, ListChecks, Upload, ChevronDown, FileDown } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { reconcile } from '../../../utils/famachaReconcile';
import { FAMACHA_INVENTORY_SNAPSHOT, type FamachaInventoryItem } from './famachaInventory';

const scoreColor: Record<number, string> = {
    1: 'bg-emerald-600', 2: 'bg-green-600', 3: 'bg-yellow-600', 4: 'bg-orange-600', 5: 'bg-red-600',
};

function ScoreDot({ score }: { score: number | null }) {
    if (!score) return <span className="text-c-text-faint text-xs">—</span>;
    return (
        <span className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-white text-xs font-bold ${scoreColor[score] || 'bg-c-surface-3'}`}>
            {score}
        </span>
    );
}

function Section({
    title, count, color, icon, hint, defaultOpen = false, children,
}: {
    title: string; count: number; color: string; icon: React.ReactNode; hint: string;
    defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-c-surface rounded-2xl border border-c-border overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className={color}>{icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-c-text-strong">{title}</h3>
                        <span className={`text-sm font-bold ${color}`}>{count}</span>
                    </div>
                    <p className="text-xs text-c-text-muted mt-0.5">{hint}</p>
                </div>
                <ChevronDown size={18} className={`text-c-text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-4 pb-4">{children}</div>}
        </div>
    );
}

export function FamachaBalancePage() {
    const { animals } = useData();
    const [inventory, setInventory] = useState<FamachaInventoryItem[]>(FAMACHA_INVENTORY_SNAPSHOT);
    const [importInfo, setImportInfo] = useState<string | null>(null);

    const result = useMemo(() => reconcile(inventory, animals), [inventory, animals]);
    const { enAmbosActivos, enFamachaPeroBaja, soloFamacha, soloGanaderoActivos, totals } = result;

    const buildReport = (): string => {
        const L: string[] = [];
        L.push('COTEJO FAMACHA <-> GANADEROOS');
        L.push(`Famacha: ${totals.famacha} | GanaderoOS reales: ${totals.ganaderoTotal} (activos ${totals.ganaderoActivos}, baja ${totals.ganaderoBaja})`);
        L.push('');
        L.push(`### FALTAN EN GANADEROOS (solo en Famacha) — ${soloFamacha.length}`);
        soloFamacha.forEach(({ fam, sugerencias }) =>
            L.push(`- ${fam.arete}${sugerencias.length ? `   (¿será? ${sugerencias.map(s => s.id).join(', ')})` : ''}`));
        L.push('');
        L.push(`### SOBRAN EN GANADEROOS (activos sin Famacha) — ${soloGanaderoActivos.length}`);
        soloGanaderoActivos.forEach(a => L.push(`- ${a.id} (${a.sex})`));
        L.push('');
        L.push(`### EN FAMACHA PERO DADOS DE BAJA — ${enFamachaPeroBaja.length}`);
        enFamachaPeroBaja.forEach(({ fam, animal }) => L.push(`- ${fam.arete} -> ${animal.status}`));
        L.push('');
        L.push(`### EN AMBAS (activos) — ${enAmbosActivos.length}`);
        enAmbosActivos.forEach(({ fam }) => L.push(`- ${fam.arete}`));
        return L.join('\n');
    };

    const exportReport = () => {
        const txt = buildReport();
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotejo_famacha_ganaderoos_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : json.animals;
            if (!Array.isArray(list)) throw new Error('Formato no reconocido');
            const parsed: FamachaInventoryItem[] = list.map((a: any) => {
                const revs = a.revs || [];
                const sorted = revs.length ? [...revs].sort((x: any, y: any) => (x.fecha < y.fecha ? -1 : 1)) : [];
                const last = sorted.length ? sorted[sorted.length - 1] : null;
                return { arete: String(a.arete ?? a.id ?? ''), lastScore: last?.score ?? null, lastFecha: last?.fecha ?? null, revCount: revs.length };
            }).filter((x: FamachaInventoryItem) => x.arete);
            setInventory(parsed);
            setImportInfo(`Respaldo importado: ${parsed.length} animales.`);
        } catch (err: any) {
            setImportInfo(`No se pudo leer el archivo: ${err.message}`);
        }
        e.target.value = '';
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            {/* Resumen */}
            <div className="bg-c-surface rounded-2xl border border-c-border p-4">
                <h2 className="font-semibold text-c-text-strong mb-3">Cotejo Famacha ↔ GanaderoOS</h2>
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-c-surface-2 rounded-xl p-3">
                        <div className="text-2xl font-bold text-c-text-strong">{totals.famacha}</div>
                        <div className="text-[11px] text-c-text-muted uppercase tracking-wide">En Famacha</div>
                    </div>
                    <div className="bg-c-surface-2 rounded-xl p-3">
                        <div className="text-2xl font-bold text-c-text-strong">{totals.ganaderoActivos}</div>
                        <div className="text-[11px] text-c-text-muted uppercase tracking-wide">Activos GanaderoOS</div>
                    </div>
                </div>
                <p className="text-[11px] text-c-text-faint mt-3 leading-relaxed">
                    GanaderoOS: {totals.ganaderoTotal} reales ({totals.ganaderoActivos} activos, {totals.ganaderoBaja} de baja)
                    {totals.ganaderoReferencia > 0 && ` + ${totals.ganaderoReferencia} de referencia`}.
                    El cotejo usa el arete (= ID del animal). Solo lectura: no se modifica nada.
                </p>
                <button
                    onClick={exportReport}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl"
                >
                    <FileDown size={18} /> Exportar listas (.txt) y copiar
                </button>
            </div>

            {/* En ambos (activos) */}
            <Section
                title="En ambas bases (activos)"
                count={enAmbosActivos.length}
                color="text-emerald-400"
                icon={<CheckCircle2 size={22} />}
                hint="Coinciden y están activos. Todo en orden."
            >
                <div className="flex flex-wrap gap-2 pt-1">
                    {enAmbosActivos.map(({ fam }) => (
                        <span key={fam.arete} className="inline-flex items-center gap-1.5 bg-c-surface-2 rounded-lg px-2 py-1 text-sm text-c-text-strong">
                            {fam.arete} <ScoreDot score={fam.lastScore} />
                        </span>
                    ))}
                    {enAmbosActivos.length === 0 && <p className="text-sm text-c-text-faint">Ninguno.</p>}
                </div>
            </Section>

            {/* Solo en Famacha (faltan en GanaderoOS) */}
            <Section
                title="Solo en Famacha (no están en GanaderoOS)"
                count={soloFamacha.length}
                color="text-rose-400"
                icon={<AlertTriangle size={22} />}
                hint="Revisados en campo pero sin registro en GanaderoOS (o con arete distinto)."
                defaultOpen
            >
                <div className="space-y-2 pt-1">
                    {soloFamacha.map(({ fam, sugerencias }) => (
                        <div key={fam.arete} className="bg-c-surface-2 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-c-text-strong">{fam.arete}</span>
                                <ScoreDot score={fam.lastScore} />
                                <span className="text-[11px] text-c-text-faint ml-auto">{fam.revCount} rev.</span>
                            </div>
                            {sugerencias.length > 0 && (
                                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-300/90">
                                    <HelpCircle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>¿Será el mismo que en GanaderoOS?: <b>{sugerencias.map(s => s.id).join(', ')}</b> (diferencia de formato)</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {soloFamacha.length === 0 && <p className="text-sm text-c-text-faint">Ninguno: todos los de Famacha existen en GanaderoOS. 🎉</p>}
                </div>
            </Section>

            {/* En Famacha pero dados de baja en GanaderoOS */}
            <Section
                title="En Famacha pero dados de baja en GanaderoOS"
                count={enFamachaPeroBaja.length}
                color="text-amber-400"
                icon={<AlertTriangle size={22} />}
                hint="Existen en GanaderoOS pero como Venta/Muerte/Descarte. Revisar si es correcto."
            >
                <div className="space-y-2 pt-1">
                    {enFamachaPeroBaja.map(({ fam, animal }) => (
                        <div key={fam.arete} className="flex items-center gap-2 bg-c-surface-2 rounded-xl p-3">
                            <span className="font-semibold text-c-text-strong">{fam.arete}</span>
                            <ScoreDot score={fam.lastScore} />
                            <span className="text-xs text-amber-300 ml-auto px-2 py-0.5 rounded-full bg-amber-500/15">{animal.status}</span>
                        </div>
                    ))}
                    {enFamachaPeroBaja.length === 0 && <p className="text-sm text-c-text-faint">Ninguno.</p>}
                </div>
            </Section>

            {/* Solo en GanaderoOS activos (sobran respecto a Famacha) */}
            <Section
                title="Activos en GanaderoOS sin revisión Famacha"
                count={soloGanaderoActivos.length}
                color="text-sky-400"
                icon={<ListChecks size={22} />}
                hint="Animales activos del rebaño que aún no aparecen en el inventario Famacha."
            >
                <div className="flex flex-wrap gap-2 pt-1">
                    {soloGanaderoActivos.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 bg-c-surface-2 rounded-lg px-2 py-1 text-sm text-c-text-strong">
                            {a.id}
                            <span className="text-[10px] text-c-text-faint">{a.sex === 'Macho' ? '♂' : '♀'}</span>
                        </span>
                    ))}
                    {soloGanaderoActivos.length === 0 && <p className="text-sm text-c-text-faint">Ninguno.</p>}
                </div>
            </Section>

            {/* Importar respaldo */}
            <div className="bg-c-surface rounded-2xl border border-c-border p-4">
                <label className="w-full flex items-center justify-center gap-2 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-semibold py-3 rounded-xl cursor-pointer">
                    <Upload size={18} /> Importar otro respaldo Famacha (.json)
                    <input type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
                </label>
                {importInfo && <p className="text-xs text-c-text-muted mt-2 text-center">{importInfo}</p>}
                <p className="text-[11px] text-c-text-faint mt-2 text-center">
                    Por defecto se compara con la evaluación Famacha del 27/06/2026 ({FAMACHA_INVENTORY_SNAPSHOT.length} animales).
                </p>
            </div>
        </div>
    );
}
