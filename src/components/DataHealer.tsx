import { useState } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory } from '../utils/calculations';
import { RefreshCcw, HeartHandshake, Droplets } from 'lucide-react';
import { Animal } from '../db/local';

export const DataHealer = () => {
    const { animals, parturitions, bulkUpdateAnimals, setLactationAsDry, appConfig, normalizeReproductiveState } = useData();
    const [isHealing, setIsHealing] = useState(false);
    const [report, setReport] = useState<string[]>([]);
    const [isReproHealing, setIsReproHealing] = useState(false);
    const [reproReport, setReproReport] = useState<string | null>(null);
    const [reproDiag, setReproDiag] = useState<string[]>([]);
    const [isDryHealing, setIsDryHealing] = useState(false);
    const [dryReport, setDryReport] = useState<string[]>([]);

    // Normaliza el estado de las hembras dejando TODO en valores canónicos:
    //  - Lactancia 'en-secado' (estado "Secando" eliminado del flujo) -> 'seca'.
    //  - Estado reproductivo inválido/faltante ('Lactante', 'Seca', vacío) -> canónico
    //    ('Vacía' para vientres, 'No Aplica' para jóvenes/machos).
    const handleDryRepair = async () => {
        setIsDryHealing(true);
        setDryReport([]);
        const logs: string[] = [];
        try {
            // 1) LACTANCIA: 'en-secado' -> 'seca'
            const enSecado = parturitions.filter(p => p.status === 'en-secado');
            for (const p of enSecado) {
                await setLactationAsDry(p.id, (p as any).dryingStartDate);
            }

            // 2) ESTADO REPRODUCTIVO inválido/faltante -> canónico
            const statusUpdates: { id: string; changes: Partial<Animal> }[] = [];
            for (const a of animals) {
                if (a.status !== 'Activo' || a.isReference) continue;
                const rs = (a.reproductiveStatus as string) || '';
                const isInvalidOrMissing = rs === 'Lactante' || rs === 'Seca' || rs === '';
                if (!isInvalidOrMissing) continue;
                let target: Animal['reproductiveStatus'];
                if (a.sex === 'Macho') {
                    target = 'No Aplica';
                } else {
                    const hasParto = parturitions.some(p => p.goatId === a.id);
                    const isVientre = hasParto || a.lifecycleStage === 'Cabra' || a.lifecycleStage === 'Cabritona';
                    target = isVientre ? 'Vacía' : 'No Aplica';
                }
                statusUpdates.push({ id: a.id, changes: { reproductiveStatus: target } });
            }
            if (statusUpdates.length) await bulkUpdateAnimals(statusUpdates);

            logs.push('🎉 NORMALIZACIÓN COMPLETADA');
            logs.push(`- Lactancias 'en-secado' → Seca: ${enSecado.length}`);
            logs.push(`- Estados reproductivos corregidos: ${statusUpdates.length}`);

            // DIAGNÓSTICO del estado YA NORMALIZADO: aplicamos en memoria los cambios
            // recién hechos para que el reporte refleje el resultado, sin re-tocar.
            const enSecadoIds = new Set(enSecado.map(p => p.id));
            const adjParts = parturitions.map(p => enSecadoIds.has(p.id) ? { ...p, status: 'seca' as const } : p);
            const updById = new Map(statusUpdates.map(u => [u.id, u.changes.reproductiveStatus]));
            const adjAnimals = animals.map(a => updById.has(a.id) ? { ...a, reproductiveStatus: updById.get(a.id) as Animal['reproductiveStatus'] } : a);
            const latestPart = (id: string) =>
                adjParts.filter(p => p.goatId === id).sort((x, y) => new Date(y.parturitionDate).getTime() - new Date(x.parturitionDate).getTime())[0];

            const hembras = adjAnimals.filter(a => a.status === 'Activo' && !a.isReference && a.sex === 'Hembra');
            const part: Record<string, number> = { activa: 0, 'en-secado': 0, seca: 0, finalizada: 0, 'sin-parto': 0 };
            const repro: Record<string, number> = {};
            hembras.forEach(a => {
                const lp = latestPart(a.id);
                const ps = lp ? lp.status : 'sin-parto';
                part[ps] = (part[ps] || 0) + 1;
                const rs = (a.reproductiveStatus as string) || '(vacío)';
                repro[rs] = (repro[rs] || 0) + 1;
            });
            logs.push('──────────');
            logs.push(`🔎 DIAGNÓSTICO (ya normalizado) — hembras activas: ${hembras.length}`);
            logs.push(`Lactancia → activa:${part.activa} · en-secado:${part['en-secado']} · seca:${part.seca} · aborto:${part.finalizada} · sin parto:${part['sin-parto']}`);
            logs.push('Estado repro → ' + (Object.entries(repro).map(([k, v]) => `${k}:${v}`).join(' · ') || '—'));
            logs.push(`Secas (parto seca/en-secado): ${part.seca + part['en-secado']}`);
        } catch (e: any) {
            logs.push(`❌ Error: ${e?.message || 'no se pudo reparar/diagnosticar'}`);
        }
        setDryReport(logs);
        setIsDryHealing(false);
    };

    const handleReproRepair = async () => {
        setIsReproHealing(true);
        setReproReport(null);
        setReproDiag([]);
        try {
            const { released, report } = await normalizeReproductiveState({ aggressive: true, diagnostic: true });
            setReproReport(
                released > 0
                    ? `🎉 Listo: ${released} ${released === 1 ? 'hembra liberada' : 'hembras liberadas'} de temporadas terminadas.`
                    : 'No se liberó ninguna hembra. Detalle abajo (compártelo si el problema sigue):'
            );
            setReproDiag(report);
        } catch (e: any) {
            setReproReport(`❌ Error: ${e?.message || 'no se pudo reparar'}`);
        }
        setIsReproHealing(false);
    };

    const handleHealData = async () => {
        const confirm = window.confirm(
            "¿Ejecutar saneamiento EXCLUSIVAMENTE en animales ACTIVOS?\n\nEsto corregirá categorías (Cabra/Cabritona) basándose en edad, partos y producción actual."
        );
        if (!confirm) return;

        setIsHealing(true);
        setReport([]);
        const logs: string[] = [];
        let skippedCount = 0;

        try {
            // 1. FASE DE ANÁLISIS (sin escribir nada): se calculan todas las correcciones.
            const updates: { id: string; changes: { lifecycleStage: any } }[] = [];

            for (const animal of animals) {
                // --- FILTRO DE SEGURIDAD ESTRICTO ---
                // Ignorar si no es Activo O si es Referencia (Muerto/Vendido/Histórico)
                if (animal.status !== 'Activo' || animal.isReference) {
                    skippedCount++;
                    continue;
                }

                // Categoría biológica real (se pasa 'animals' para detectar progenie)
                const correctCategory = getAnimalZootecnicCategory(animal, parturitions, appConfig, animals);
                const currentCategory = animal.lifecycleStage;

                // Lógica extra: Si es Cabrita pero ya tiene datos de destete -> Cabritona
                const hasWeaningData = animal.weaningDate || animal.weaningWeight;
                const needsUpgradeToCabritona = currentCategory === 'Cabrita' && hasWeaningData;

                const needsUpdate = (currentCategory !== correctCategory) || needsUpgradeToCabritona;

                if (needsUpdate) {
                    const newStage = needsUpgradeToCabritona && correctCategory === 'Cabrita' ? 'Cabritona' : correctCategory;
                    updates.push({ id: animal.id, changes: { lifecycleStage: newStage } });
                    logs.push(`✅ ${animal.id}: ${currentCategory} -> ${newStage}`);
                }
            }

            // 2. FASE DE ESCRITURA: UNA sola actualización en lote (una transacción,
            //    un refresco, sincronización en cola). No satura la app aunque el
            //    rebaño sea grande.
            if (updates.length > 0) {
                await bulkUpdateAnimals(updates);
            }

            if (updates.length === 0) {
                logs.push("✨ El rebaño activo está perfectamente sincronizado.");
            } else {
                logs.push(`🎉 SANEAMIENTO COMPLETADO.`);
                logs.push(`- Corregidos: ${updates.length}`);
                logs.push(`- Omitidos (Referencia/Bajas): ${skippedCount}`);
            }

        } catch (error: any) {
            console.error("Error en saneamiento:", error);
            logs.push(`❌ Error crítico: ${error.message}`);
        }

        setReport(logs);
        setIsHealing(false);
    };

    return (
        <div className="p-6 bg-c-surface border border-c-border rounded-2xl my-6 shadow-sm">
            <h3 className="text-c-text-strong font-bold text-lg mb-2 flex items-center gap-2">
                <RefreshCcw className={isHealing ? "animate-spin text-c-accent-sky" : "text-c-accent-sky"} size={24}/>
                Saneador de Rebaño Activo
            </h3>
            <p className="text-c-text-muted text-sm mb-6 leading-relaxed">
                Esta herramienta verifica solo a los animales <strong>ACTIVOS</strong> y corrige su categoría.
                <br/>
                Ignorará animales vendidos, muertos o de referencia.
            </p>

            <button
                onClick={handleHealData}
                disabled={isHealing}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all
                    ${isHealing ? 'bg-c-surface-2 text-c-text-muted cursor-not-allowed' : 'bg-c-accent-sky hover:bg-c-accent-sky/90 shadow-lg shadow-c-accent-sky/20 active:scale-95'}
                `}
            >
                {isHealing ? 'Analizando...' : 'Sanear Solo Activos'}
            </button>

            {report.length > 0 && (
                <div className="mt-6 bg-c-surface-2 p-4 rounded-xl border border-c-border max-h-80 overflow-y-auto">
                    <h4 className="text-c-text-muted text-xs font-bold uppercase tracking-wider mb-2 sticky top-0 bg-c-surface-2 py-1">Reporte:</h4>
                    <div className="font-mono text-xs space-y-1">
                        {report.map((line, i) => (
                            <div key={i} className={line.includes('Error') ? 'text-brand-red' : 'text-c-accent border-b border-c-border pb-1'}>
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reparación de estados de monta */}
            <div className="mt-8 pt-6 border-t border-c-border">
                <h3 className="text-c-text-strong font-bold text-lg mb-2 flex items-center gap-2">
                    <HeartHandshake className={isReproHealing ? "animate-pulse text-c-accent" : "text-c-accent"} size={24} />
                    Reparar Estados de Monta
                </h3>
                <p className="text-c-text-muted text-sm mb-6 leading-relaxed">
                    Libera a las hembras que quedaron asignadas a una <strong>temporada de monta ya terminada</strong>
                    {' '}(cerrada o vencida por fecha). Las servidas recientes quedan gestando; las que ya parieron o
                    superaron los ~150 días de gestación vuelven a Vacías. No borra servicios ni partos.
                </p>
                <button
                    onClick={handleReproRepair}
                    disabled={isReproHealing}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all
                        ${isReproHealing ? 'bg-c-surface-2 text-c-text-muted cursor-not-allowed' : 'bg-c-accent hover:bg-c-accent/90 shadow-lg shadow-c-accent/20 active:scale-95'}
                    `}
                >
                    {isReproHealing ? 'Reparando...' : 'Liberar hembras de montas terminadas'}
                </button>
                {reproReport && (
                    <div className={`mt-4 p-4 rounded-xl border text-sm font-semibold ${reproReport.includes('Error') ? 'bg-brand-red/10 border-brand-red/20 text-brand-red' : 'bg-c-surface-2 border-c-border text-c-text'}`}>
                        {reproReport}
                    </div>
                )}
                {reproDiag.length > 0 && (
                    <div className="mt-3 bg-c-surface-2 p-3 rounded-xl border border-c-border max-h-72 overflow-y-auto">
                        <div className="font-mono text-[11px] leading-relaxed space-y-1">
                            {reproDiag.map((line, i) => (
                                <div key={i} className={i === 0 ? 'text-c-text-strong font-bold pb-1 border-b border-c-border' : 'text-c-text-muted'}>{line}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Reparación de animales secos (declarados con el flujo viejo) */}
            <div className="mt-8 pt-6 border-t border-c-border">
                <h3 className="text-c-text-strong font-bold text-lg mb-2 flex items-center gap-2">
                    <Droplets className={isDryHealing ? "animate-pulse text-cyan-400" : "text-cyan-400"} size={24} />
                    Normalizar Estados
                </h3>
                <p className="text-c-text-muted text-sm mb-6 leading-relaxed">
                    Pone todos los estados en orden: pasa las lactancias <strong>"en-secado"</strong> (estado
                    "Secando" eliminado) a <strong>Seca</strong>, y corrige los estados reproductivos inválidos o
                    vacíos (<strong>Lactante</strong>, sin estado) a su valor correcto (Vacía / No Aplica).
                    Muestra un diagnóstico. No borra partos ni pesajes.
                </p>
                <button
                    onClick={handleDryRepair}
                    disabled={isDryHealing}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all
                        ${isDryHealing ? 'bg-c-surface-2 text-c-text-muted cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 active:scale-95'}
                    `}
                >
                    {isDryHealing ? 'Normalizando...' : 'Normalizar estados y diagnosticar'}
                </button>
                {dryReport.length > 0 && (
                    <div className="mt-4 bg-c-surface-2 p-4 rounded-xl border border-c-border max-h-80 overflow-y-auto">
                        <div className="font-mono text-xs space-y-1">
                            {dryReport.map((line, i) => (
                                <div key={i} className={line.includes('Error') ? 'text-brand-red' : 'text-c-text-muted'}>{line}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};