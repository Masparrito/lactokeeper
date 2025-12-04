import { useState } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory } from '../utils/calculations';
import { RefreshCcw } from 'lucide-react';

export const DataHealer = () => {
    const { animals, parturitions, updateAnimal, appConfig } = useData();
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
        let fixedCount = 0;
        let skippedCount = 0;

        try {
            // Recorremos TODOS los animales
            for (const animal of animals) {
                
                // --- FILTRO DE SEGURIDAD ESTRICTO ---
                // Ignorar si no es Activo O si es Referencia (Muerto/Vendido/Histórico)
                if (animal.status !== 'Activo' || animal.isReference) {
                    skippedCount++;
                    continue;
                }

                // 1. Calculamos la categoría biológica real
                // Pasamos 'animals' para que detecte hijos (Progenie)
                const correctCategory = getAnimalZootecnicCategory(animal, parturitions, appConfig, animals);

                // 2. Detectamos discrepancias
                const currentCategory = animal.lifecycleStage;
                
                // Lógica extra: Si es Cabrita pero ya tiene datos de destete -> Cabritona
                const hasWeaningData = animal.weaningDate || animal.weaningWeight;
                const needsUpgradeToCabritona = currentCategory === 'Cabrita' && hasWeaningData;
                
                const needsUpdate = (currentCategory !== correctCategory) || needsUpgradeToCabritona;

                if (needsUpdate) {
                    const newStage = needsUpgradeToCabritona && correctCategory === 'Cabrita' ? 'Cabritona' : correctCategory;
                    
                    // 3. Actualizamos SOLO si es necesario
                    await updateAnimal(animal.id, { 
                        lifecycleStage: newStage as any 
                    });
                    
                    logs.push(`✅ ${animal.id}: ${currentCategory} -> ${newStage}`);
                    fixedCount++;
                }
            }

            if (fixedCount === 0) {
                logs.push("✨ El rebaño activo está perfectamente sincronizado.");
            } else {
                logs.push(`🎉 SANEAMIENTO COMPLETADO.`);
                logs.push(`- Corregidos: ${fixedCount}`);
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