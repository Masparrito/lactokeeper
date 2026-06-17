import { useState } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory } from '../utils/calculations';
import { RefreshCcw } from 'lucide-react';

export const DataHealer = () => {
    const { animals, parturitions, bulkUpdateAnimals, appConfig } = useData();
    const [isHealing, setIsHealing] = useState(false);
    const [report, setReport] = useState<string[]>([]);

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
        <div className="p-6 bg-zinc-900 border border-zinc-700 rounded-xl my-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <RefreshCcw className={isHealing ? "animate-spin text-brand-blue" : "text-brand-blue"} size={24}/> 
                Saneador de Rebaño Activo
            </h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Esta herramienta verifica solo a los animales <strong>ACTIVOS</strong> y corrige su categoría.
                <br/>
                Ignorará animales vendidos, muertos o de referencia.
            </p>
            
            <button 
                onClick={handleHealData}
                disabled={isHealing}
                className={`w-full py-4 rounded-lg flex items-center justify-center gap-3 font-bold text-white transition-all
                    ${isHealing ? 'bg-zinc-700 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-600 shadow-lg shadow-blue-900/20 active:scale-95'}
                `}
            >
                {isHealing ? 'Analizando...' : 'Sanear Solo Activos'}
            </button>

            {report.length > 0 && (
                <div className="mt-6 bg-black p-4 rounded-lg border border-zinc-800 max-h-80 overflow-y-auto">
                    <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 sticky top-0 bg-black py-1">Reporte:</h4>
                    <div className="font-mono text-xs space-y-1">
                        {report.map((line, i) => (
                            <div key={i} className={line.includes('Error') ? 'text-red-400' : 'text-green-400 border-b border-zinc-900 pb-1'}>
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};