// --- ARCHIVO: src/pages/modules/evolucion/EvolucionShell.tsx ---
// (Actualizado para V8.5 - Errores TS2741 corregidos)

import { useState, useEffect } from 'react'; // CORRECCIÓN: Imports no usados eliminados
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import { EvolucionRebanoPage } from './EvolucionRebanoPage';
import { SimulationSetupPage } from './SimulationSetupPage'; 
import { GanaGeniusPage } from './GanaGeniusPage'; 
import { TrendingUp, Settings, BarChartHorizontal, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import { SimulationConfig } from '../../../hooks/useHerdEvolution'; 
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { useRealtimeKpiCalculator } from '../../../hooks/useRealtimeKpiCalculator';

type EvolucionView = 'setup' | 'sim-results' | 'real-results' | 'genius-analysis';

interface EvolucionShellProps {
  onSwitchModule: (module: AppModule) => void;
}

// --- VALORES POR DEFECTO PARA SIMULACIÓN (Fallback) ---
const defaultSimulationParams: Omit<SimulationConfig, 'initialCabras'|'initialLevanteTardio'|'initialLevanteMedio'|'initialLevanteTemprano'|'initialCriaH'|'initialCriaM'|'initialPadres'> = {
    comprasVientresAnual: 0,
    duracionMontaDias: 45,
    diasGestacion: 150,
    litrosPromedioPorAnimal: 1.8,
    litrosPicoPorAnimal: 2.6,
    diasLactanciaObjetivo: 305,
    porcentajePrenez: 90,
    porcentajeProlificidad: 120,
    mortalidadCrias: 5,
    mortalidadLevante: 3,
    mortalidadCabras: 3,
    tasaReemplazo: 20,
    eliminacionCabritos: 100,
    precioLecheLitro: 0.5,
    precioVentaCabritoKg: 3,
    precioVentaDescarteAdulto: 50,
    monedaSimbolo: "$",
};


export default function EvolucionShell({ onSwitchModule }: EvolucionShellProps) {
  const { syncStatus, appConfig, isLoading: isDataLoading } = useData();
  const [activeView, setActiveView] = useState<EvolucionView>('setup');
  
  const { realConfig, isLoading: isRealConfigLoading } = useRealtimeKpiCalculator();
  
  const [simConfig, setSimConfig] = useState<SimulationConfig | null>(() => {
    try {
      const savedConfig = localStorage.getItem('ganaderoOS_simConfig');
      if (savedConfig) {
        return JSON.parse(savedConfig) as SimulationConfig;
      }
    } catch (error) {
      console.error("Error al cargar simulación guardada de localStorage:", error);
      localStorage.removeItem('ganaderoOS_simConfig');
    }
    return null;
  });

  const [activeSimData, setActiveSimData] = useState<SimulationConfig | null>(simConfig);
  const isGlobalLoading = isDataLoading || isRealConfigLoading;

  const handleRunSimulation = (config: SimulationConfig) => { 
    console.log("[EvolucionShell] Corriendo nueva simulación...", config);
    
    setActiveSimData(config); 
    
    const isManualSim = config.initialCabras !== realConfig?.initialCabras;

    if (isManualSim) {
        console.log("[EvolucionShell] Guardando simulación manual en localStorage.");
        setSimConfig(config); 
    } else {
        console.log("[EvolucionShell] Corriendo simulación 'Real' (no se guarda).");
    }
    
    setActiveView('sim-results'); 
  };

  const handleSaveOptimizedPlan = (optimizedConfig: SimulationConfig) => {
    console.log("[EvolucionShell] GanaGenius guardó un nuevo plan optimizado.");
    setSimConfig(optimizedConfig); 
    setActiveSimData(optimizedConfig); 
    setActiveView('sim-results'); 
  };
  
  const handleViewChange = (view: EvolucionView) => { 
      setActiveView(view); 
  }; 
  
  const navItems = [ 
      { view: 'setup', label: 'Setup', icon: Settings }, 
      { view: 'sim-results', label: 'Simulación', icon: BarChartHorizontal }, 
      { view: 'real-results', label: 'Real', icon: CheckCircle },
      { view: 'genius-analysis', label: 'GanaGenius', icon: Sparkles } 
  ] as const;

   const fallbackConfig: SimulationConfig = {
      ...defaultSimulationParams,
      initialCabras: 0,
      initialLevanteTardio: 0,
      initialLevanteMedio: 0,
      initialLevanteTemprano: 0,
      initialCriaH: 0,
      initialCriaM: 0,
      initialPadres: 1,
      ...(appConfig || {}), 
   };
   fallbackConfig.monedaSimbolo = appConfig?.monedaSimbolo ?? defaultSimulationParams.monedaSimbolo;

  useEffect(() => {
    try {
      if (simConfig) {
        localStorage.setItem('ganaderoOS_simConfig', JSON.stringify(simConfig));
      } else {
        localStorage.removeItem('ganaderoOS_simConfig');
      }
    } catch (error) {
      console.error("Error al guardar simulación en localStorage:", error);
    }
  }, [simConfig]);


  return (
    <div className="font-sans text-gray-200 min-h-screen animate-fade-in">
        {/* Header */}
        <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
            <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                 <div className="flex items-center gap-2 min-w-0">
                    {activeView !== 'setup' && (
                         <button onClick={() => handleViewChange('setup')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0" aria-label="Volver a Configuración">
                             <ArrowLeft size={24} />
                         </button>
                    )}
                    <TrendingUp className={`text-indigo-400 ${activeView === 'setup' ? '' : 'hidden sm:block'} flex-shrink-0`} size={28}/>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-bold text-white leading-none truncate">GanaderoOS</h1>
                        <p className="text-xs text-zinc-400 leading-none truncate">
                            Evolución - {
                                activeView === 'setup' ? 'Configurar Simulación' :
                                activeView === 'sim-results' ? 'Resultados Simulación' :
                                activeView === 'real-results' ? 'Proyección Real' :
                                'Asistente GanaGenius'
                            }
                        </p>
                    </div>
                 </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <SyncStatusIcon status={syncStatus} />
                </div>
            </div>
        </header>

        <main className="pt-16 pb-16">
            {activeView === 'setup' && (
                <SimulationSetupPage
                    initialConfig={simConfig || fallbackConfig}
                    realConfig={realConfig}
                    onSimulate={handleRunSimulation}
                />
            )}
            
            {activeView === 'sim-results' && activeSimData && ( 
                <EvolucionRebanoPage 
                  key="sim-results" 
                  simulationConfig={activeSimData}
                  mode="simulacion" 
                  // CORRECCIÓN: 'onSimulate' eliminado
                /> 
            )}
            
            {activeView === 'sim-results' && !activeSimData && ( <div className="text-center p-10 text-zinc-400">Primero configura y corre una simulación.</div> )}
            
            {activeView === 'real-results' && realConfig && ( 
                <EvolucionRebanoPage 
                  key="real-results" 
                  simulationConfig={realConfig}
                  mode="real" 
                  // CORRECCIÓN: 'onSimulate' eliminado
                /> 
            )}
            
            {activeView === 'real-results' && !realConfig && isGlobalLoading && <LoadingOverlay />}
            {activeView === 'real-results' && !realConfig && !isGlobalLoading && ( <div className="text-center p-10 text-zinc-400">No hay suficientes datos reales para una proyección.</div> )}
            
            {activeView === 'genius-analysis' && realConfig && (
              <GanaGeniusPage
                baseConfig={realConfig}
                horizonInYears={3} 
                onSaveOptimizedPlan={handleSaveOptimizedPlan}
              />
            )}
            {activeView === 'genius-analysis' && !realConfig && isGlobalLoading && <LoadingOverlay />}
            {activeView === 'genius-analysis' && !realConfig && !isGlobalLoading && ( 
                <div className="text-center p-10 text-zinc-400 max-w-sm mx-auto">
                    <Sparkles className="mx-auto text-sky-500" size={48} />
                    <h2 className="text-lg font-semibold text-white mt-4">Asistente GanaGenius</h2>
                    <p>GanaGenius requiere datos reales para funcionar. Registra partos, servicios y pesajes de leche para activar el "Switch de Realidad" en el Setup.</p>
                </div> 
            )}

        </main>

         {/* Nav (V8.5: Lógica de 'disabled' actualizada) */}
         <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
            {navItems.map((item) => {
                 const isDisabled = (item.view === 'sim-results' && !simConfig) || 
                                    (item.view === 'real-results' && !realConfig) ||
                                    (item.view === 'genius-analysis' && !realConfig);
                 const isActive = activeView === item.view;
                 return ( <button key={item.view} onClick={() => handleViewChange(item.view)} disabled={isDisabled} className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${ isActive ? 'text-indigo-400 font-semibold' : 'text-gray-500 hover:text-white'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`} aria-current={isActive ? 'page' : undefined}> <item.icon className="w-6 h-6" /> <span className="text-xs font-semibold mt-1">{item.label}</span> </button> );
            })}
         </nav>

        {/* ModuleSwitcher */}
        <div style={{ position: 'fixed', bottom: 'calc(4rem + 1rem)', right: '1rem', zIndex: 40 }}>
             <ModuleSwitcher onSwitchModule={onSwitchModule} />
        </div>
    </div>
  );
}