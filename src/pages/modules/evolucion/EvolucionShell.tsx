import { useState, useCallback, useEffect } from 'react';
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import { EvolucionRebanoPage } from './EvolucionRebanoPage';
import { SimulationSetupPage } from './SimulationSetupPage'; 
import { TrendingUp, Settings, BarChartHorizontal, CheckCircle, ArrowLeft } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import { SimulationConfig } from '../../../hooks/useHerdEvolution'; 
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';

type EvolucionView = 'setup' | 'sim-results' | 'real-results';

interface EvolucionShellProps {
  onSwitchModule: (module: AppModule) => void;
}

// --- VALORES POR DEFECTO PARA SIMULACIÓN ---
const defaultSimulationParams: Omit<SimulationConfig, 'initialCabras'|'initialLevanteTardio'|'initialLevanteMedio'|'initialLevanteTemprano'|'initialCriaH'|'initialCriaM'|'initialPadres'> = {
    comprasVientresAnual: 0,
    // mesInicioMonta1: 1, // Default a Enero si no hay nada más
    duracionMontaDias: 45,
    diasGestacion: 150,
    // distribucionPartosPorcentaje: 100, // Estos pueden venir de appConfig? Asumimos defaults
    // distribucionPartosDias: 30,
    litrosPromedioPorAnimal: 1.8, // V5.0
    litrosPicoPorAnimal: 2.6, // V5.0
    diasLactanciaObjetivo: 305, // V5.0
    porcentajePrenez: 90, // V5.0
    porcentajeProlificidad: 120,
    mortalidadCrias: 5,       // 0-3m
    mortalidadLevante: 3,     // 3-18m
    mortalidadCabras: 3,      // >18m + Padres
    tasaReemplazo: 20,
    eliminacionCabritos: 100,   // 0-3m
    precioLecheLitro: 0.5,
    precioVentaCabritoKg: 3,
    precioVentaDescarteAdulto: 50,
    monedaSimbolo: "$",
};


export default function EvolucionShell({ onSwitchModule }: EvolucionShellProps) {
  const { syncStatus, appConfig, animals, isLoading: isDataLoading } = useData();
  const [activeView, setActiveView] = useState<EvolucionView>('setup');
  
  // --- MODIFICACIÓN V6.0: PERSISTENCIA (CARGAR ESTADO) ---
  // Al cargar el componente, intenta leer la simulación guardada de localStorage.
  const [simConfig, setSimConfig] = useState<SimulationConfig | null>(() => {
    try {
      const savedConfig = localStorage.getItem('ganaderoOS_simConfig');
      if (savedConfig) {
        // Si se encuentra, parsea el JSON y lo usa como estado inicial.
        return JSON.parse(savedConfig) as SimulationConfig;
      }
    } catch (error) {
      console.error("Error al cargar simulación guardada de localStorage:", error);
      // Si hay un error (ej. JSON corrupto), limpiar el storage.
      localStorage.removeItem('ganaderoOS_simConfig');
    }
    // Si no hay nada guardado, o hubo un error, empezar en null.
    return null;
  });
  // --- FIN MODIFICACIÓN ---

  const [realConfig, setRealConfig] = useState<SimulationConfig | null>(null);

  const prepareRealConfig = useCallback((): SimulationConfig | null => { 
    if (isDataLoading || !animals || animals.length === 0) return null; 

    let initialCabras = 0, initialLevanteTardio = 0, initialLevanteMedio = 0, initialLevanteTemprano = 0, initialCriaH = 0, initialCriaM = 0, initialPadres = 0;
    const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);
    activeAnimals.forEach(animal => {
        const stage = animal.lifecycleStage;
         if (stage === 'Cabra Adulta' || stage === 'Cabra Multípara' || stage === 'Cabra Primípara') initialCabras++;
         else if (stage === 'Cabritona') initialLevanteTemprano++; // Asunción: 3-6m
         else if (stage === 'Cabrita') initialCriaH++;          // Asunción: 0-3m H
         else if (stage === 'Macho Cabrío') initialPadres++;
    });
     initialPadres = Math.max(1, initialPadres);

    const config: SimulationConfig = {
      ...defaultSimulationParams, 
      initialCabras,
      initialLevanteTardio,
      initialLevanteMedio,
      initialLevanteTemprano,
      initialCriaH,
      initialCriaM,
      initialPadres,
      ...(appConfig || {}), 
      comprasVientresAnual: 0, 
    };
    config.monedaSimbolo = appConfig?.monedaSimbolo ?? defaultSimulationParams.monedaSimbolo;

    console.log("Real config prepared (V3.12 - Defaults + Real Pop):", config);
    return config;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animals, isDataLoading, appConfig]); 

  useEffect(() => {
    if (activeView === 'real-results' && !realConfig) { 
        const config = prepareRealConfig();
        if (config) {
            setRealConfig(config);
        }
    }
  }, [activeView, realConfig, prepareRealConfig]); 

  const handleRunSimulation = (config: SimulationConfig) => { setSimConfig(config); setActiveView('sim-results'); };
  const handleViewChange = (view: EvolucionView) => { setActiveView(view); }; 
  const navItems = [ { view: 'setup', label: 'Setup', icon: Settings }, { view: 'sim-results', label: 'Simulación', icon: BarChartHorizontal }, { view: 'real-results', label: 'Real', icon: CheckCircle } ] as const;

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

  // --- MODIFICACIÓN V6.0: PERSISTENCIA (GUARDAR ESTADO) ---
  // Este efecto se ejecuta cada vez que 'simConfig' cambia.
  useEffect(() => {
    try {
      if (simConfig) {
        // Si hay una simulación, la guarda en localStorage.
        localStorage.setItem('ganaderoOS_simConfig', JSON.stringify(simConfig));
      } else {
        // Si simConfig es null (ej. el usuario la resetea), la elimina del storage.
        localStorage.removeItem('ganaderoOS_simConfig');
      }
    } catch (error) {
      console.error("Error al guardar simulación en localStorage:", error);
    }
  }, [simConfig]); // La dependencia clave
  // --- FIN MODIFICACIÓN ---


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
                            Evolución - {activeView === 'setup' ? 'Configurar Simulación' : (activeView === 'sim-results' ? 'Resultados Simulación' : 'Proyección Real')}
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
                    // Si hay un simConfig guardado, se usa. Si no, usa realConfig o fallback.
                    initialConfig={simConfig || realConfig || fallbackConfig} 
                    onSimulate={handleRunSimulation}
                />
            )}
            {activeView === 'sim-results' && simConfig && ( <EvolucionRebanoPage key="sim-results" simulationConfig={simConfig} mode="simulacion" /> )}
            {activeView === 'sim-results' && !simConfig && ( <div className="text-center p-10 text-zinc-400">Primero configura y corre una simulación.</div> )}
            {activeView === 'real-results' && realConfig && ( <EvolucionRebanoPage key="real-results" simulationConfig={realConfig} mode="real" /> )}
            {activeView === 'real-results' && !realConfig && isDataLoading && <LoadingOverlay />}
            {activeView === 'real-results' && !realConfig && !isDataLoading && ( <div className="text-center p-10 text-zinc-400">No hay suficientes datos reales.</div> )}
        </main>

         {/* Nav */}
         <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
            {navItems.map((item) => {
                 // El botón "Simulación" ahora estará activo si simConfig se carga desde localStorage
                 const isDisabled = (item.view === 'sim-results' && !simConfig) || (item.view === 'real-results' && !realConfig);
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