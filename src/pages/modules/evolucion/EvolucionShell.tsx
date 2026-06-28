import { useState, useEffect } from 'react';
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import { EvolucionRebanoPage } from './EvolucionRebanoPage';
import { SimulationSetupPage } from './SimulationSetupPage'; 
import { GanaGeniusPage } from './GanaGeniusPage'; 
// --- (NUEVO) Importar 'Grid' ---
import { TrendingUp, Settings, BarChartHorizontal, CheckCircle, ArrowLeft, Sparkles, Grid } from 'lucide-react';
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
  
  // --- (NUEVO) Estado para el modal de Módulos ---
  const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);
  
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
      // Liberado: la simulación arranca con los precios económicos globales de la finca.
      monedaSimbolo: appConfig?.monedaSimbolo ?? defaultSimulationParams.monedaSimbolo,
      precioLecheLitro: appConfig?.precioLecheKg ?? defaultSimulationParams.precioLecheLitro,
      precioVentaCabritoKg: appConfig?.precioVentaCabritoKg ?? defaultSimulationParams.precioVentaCabritoKg,
      precioVentaDescarteAdulto: appConfig?.precioVentaDescarteAdulto ?? defaultSimulationParams.precioVentaDescarteAdulto,
      pesoVentaCabritoKg: appConfig?.pesoVentaCabritoKg ?? 10,
   };

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
    // --- (INICIO) CORRECCIÓN DE SCROLL ---
    // 1. Contenedor raíz con 'h-screen' y 'overflow-hidden'
    <div className="theme-light font-sans text-c-text h-full overflow-hidden animate-fade-in flex flex-col bg-c-bg">
        {/* 2. Header con safe-area superior */}
        <header className="flex-shrink-0 bg-c-bg/95 backdrop-blur-lg border-b border-c-border pt-[env(safe-area-inset-top)]">
            <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
                 <div className="flex items-center gap-2 min-w-0">
                    {activeView !== 'setup' && (
                         <button onClick={() => handleViewChange('setup')} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors flex-shrink-0" aria-label="Volver a Configuración">
                             <ArrowLeft size={24} />
                         </button>
                    )}
                    <TrendingUp className={`text-indigo-600 ${activeView === 'setup' ? '' : 'hidden sm:block'} flex-shrink-0`} size={28}/>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-bold text-c-text leading-none truncate">GanaderoOS</h1>
                        <p className="text-xs text-c-text-muted leading-none truncate">
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
                    {/* --- (NUEVO) Botón de Módulos --- */}
                    <button 
                        onClick={() => setIsModuleSwitcherOpen(true)}
                        className="p-2 text-c-text-muted hover:text-c-text transition-colors"
                        title="Módulos"
                    >
                        <Grid size={20} />
                    </button>
                </div>
            </div>
        </header>

        {/* 3. <main> es el ÚNICO scroll, con 'flex-1', 'overflow-y-auto' y padding */}
        <main className="flex-1 overflow-y-auto">
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
                /> 
            )}
            
            {activeView === 'sim-results' && !activeSimData && ( <div className="text-center p-10 text-c-text-muted">Primero configura y corre una simulación.</div> )}
            
            {activeView === 'real-results' && realConfig && ( 
                <EvolucionRebanoPage 
                  key="real-results" 
                  simulationConfig={realConfig}
                  mode="real" 
                /> 
            )}
            
            {activeView === 'real-results' && !realConfig && isGlobalLoading && <LoadingOverlay />}
            {activeView === 'real-results' && !realConfig && !isGlobalLoading && ( <div className="text-center p-10 text-c-text-muted">No hay suficientes datos reales para una proyección.</div> )}
            
            {activeView === 'genius-analysis' && realConfig && (
              <GanaGeniusPage
                baseConfig={realConfig}
                horizonInYears={3} 
                onSaveOptimizedPlan={handleSaveOptimizedPlan}
              />
            )}
            {activeView === 'genius-analysis' && !realConfig && isGlobalLoading && <LoadingOverlay />}
            {activeView === 'genius-analysis' && !realConfig && !isGlobalLoading && ( 
                <div className="text-center p-10 text-c-text-muted max-w-sm mx-auto">
                    <Sparkles className="mx-auto text-sky-500" size={48} />
                    <h2 className="text-lg font-semibold text-c-text mt-4">Asistente GanaGenius</h2>
                    <p>GanaGenius requiere datos reales para funcionar. Registra partos, servicios y pesajes de leche para activar el "Switch de Realidad" en el Setup.</p>
                </div> 
            )}

        </main>
        {/* --- (FIN) CORRECCIÓN DE SCROLL --- */}

         {/* 4. Nav con safe-area inferior */}
         <nav className="flex-shrink-0 bg-c-surface border-t border-c-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
                 const isDisabled = (item.view === 'sim-results' && !simConfig) || 
                                    (item.view === 'real-results' && !realConfig) ||
                                    (item.view === 'genius-analysis' && !realConfig);
                 const isActive = activeView === item.view;
                 return ( <button key={item.view} onClick={() => handleViewChange(item.view)} disabled={isDisabled} className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${ isActive ? 'text-indigo-600 font-semibold' : 'text-c-text-faint hover:text-c-text'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`} aria-current={isActive ? 'page' : undefined}> <item.icon className="w-6 h-6" /> <span className="text-xs font-semibold mt-1">{item.label}</span> </button> );
            })}
          </div>
         </nav>

        {/* --- (NUEVO) ModuleSwitcher actualizado a modal --- */}
        <ModuleSwitcher 
            isOpen={isModuleSwitcherOpen}
            onClose={() => setIsModuleSwitcherOpen(false)}
            onSwitchModule={onSwitchModule} 
        />
    </div>
  );
}