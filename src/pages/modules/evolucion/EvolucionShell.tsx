import { useState, useCallback, useEffect } from 'react';
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import EvolucionRebanoPage from './EvolucionRebanoPage';
import SimulationSetupPage from './SimulationSetupPage';
import { TrendingUp, Settings, BarChartHorizontal, CheckCircle, ArrowLeft } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
// Importar tipos de lifecycleStage si es necesario para claridad
// import type { FemaleLifecycleStage, MaleLifecycleStage } from '../../../db/local';

// Tipo para las vistas internas del módulo
type EvolucionView = 'setup' | 'sim-results' | 'real-results';

interface EvolucionShellProps {
  onSwitchModule: (module: AppModule) => void;
}

export default function EvolucionShell({ onSwitchModule }: EvolucionShellProps) {
  const { syncStatus, appConfig, animals, parturitions, isLoading: isDataLoading } = useData();
  const [activeView, setActiveView] = useState<EvolucionView>('setup');
  const [simConfig, setSimConfig] = useState<SimulationConfig | null>(null);
  const [realConfig, setRealConfig] = useState<SimulationConfig | null>(null);

  const prepareRealConfig = useCallback(() => {
    if (isDataLoading || !appConfig || !animals || animals.length === 0) {
      console.warn("prepareRealConfig: Datos insuficientes o cargando.");
      return null;
    }

    let initialCabras = 0;
    let initialCabritonas = 0;
    let initialCabritas = 0;
    let initialPadres = 0;
    const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);

    activeAnimals.forEach(animal => {
        const stage = animal.lifecycleStage;
         if (stage === 'Cabra Adulta' || stage === 'Cabra Multípara' || stage === 'Cabra Primípara') {
            initialCabras++;
         }
         else if (stage === 'Cabritona') {
            initialCabritonas++;
         }
         else if (stage === 'Cabrita') {
            initialCabritas++;
         }
         else if (stage === 'Macho Cabrío') {
            initialPadres++;
         }
    });
     initialPadres = Math.max(1, initialPadres);

    // --- CORRECCIÓN: Añadir comprasVientresAnual al config ---
    const config: SimulationConfig = {
      ...appConfig,
      initialCabras,
      initialCabritonas,
      initialCabritas,
      initialPadres,
      temporadasMontaPorAno: 1,
      duracionMontaDias: 45,
      distribucionPartosPorcentaje: 60,
      distribucionPartosDias: 20,
      litrosPromedioPorAnimal: 1.5,
      comprasVientresAnual: 0, // Default 0 para proyección real
    };
    console.log("Real config prepared:", config);
    return config;
  }, [appConfig, animals, parturitions, isDataLoading]);

  // Recalcular realConfig si los datos base cambian
  useEffect(() => {
    if (activeView === 'real-results') {
      const config = prepareRealConfig();
      if (JSON.stringify(config) !== JSON.stringify(realConfig)) {
          setRealConfig(config);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appConfig, animals, parturitions, isDataLoading, activeView]);


  const handleRunSimulation = (config: SimulationConfig) => {
    console.log("Running simulation with config:", config);
    setSimConfig(config);
    setActiveView('sim-results');
  };

  const handleViewChange = (view: EvolucionView) => {
    console.log(`handleViewChange: Clic en botón '${view}'. Vista actual: ${activeView}`);
    if (view === 'real-results' && !realConfig) {
      console.log("handleViewChange: Intentando preparar config real para vista 'Real'...");
      const config = prepareRealConfig();
      setRealConfig(config);
       if (!config) {
         console.error("handleViewChange: No se pudo preparar config real.");
       }
    }
    setActiveView(view);
    console.log("handleViewChange: Nuevo estado de activeView debería ser:", view);
  };

   const navItems = [
     { view: 'setup', label: 'Setup', icon: Settings },
     { view: 'sim-results', label: 'Simulación', icon: BarChartHorizontal },
     { view: 'real-results', label: 'Real', icon: CheckCircle },
   ] as const;

   console.log("Renderizando EvolucionShell. Vista activa:", activeView);
   console.log("simConfig:", simConfig ? "LISTO" : "NO LISTO");
   console.log("realConfig:", realConfig ? "LISTO" : "NO LISTO");
   console.log("isDataLoading:", isDataLoading);


  return (
    <div className="font-sans text-gray-200 min-h-screen animate-fade-in">
        <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
            <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                 <div className="flex items-center gap-2 min-w-0">
                    {activeView !== 'setup' && (
                         <button onClick={() => { console.log("Clic en botón Volver"); handleViewChange('setup'); }} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0" aria-label="Volver a Configuración">
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
                    // --- CORRECCIÓN: Añadir comprasVientresAnual al fallback ---
                    initialConfig={simConfig || realConfig || prepareRealConfig() || { ...appConfig, initialCabras: 0, initialCabritonas: 0, initialCabritas: 0, initialPadres: 1, temporadasMontaPorAno: 1, litrosPromedioPorAnimal: 1, duracionMontaDias: 45, distribucionPartosPorcentaje: 60, distribucionPartosDias: 20, comprasVientresAnual: 0 }}
                    onSimulate={handleRunSimulation}
                />
            )}
            {activeView === 'sim-results' && simConfig && (
                <EvolucionRebanoPage
                    key="sim-results"
                    simulationConfig={simConfig}
                    mode="simulacion"
                />
            )}
             {activeView === 'sim-results' && !simConfig && (
                 <div className="text-center p-10 text-zinc-400">Primero configura y corre una simulación en la pestaña 'Setup'.</div>
            )}
             {activeView === 'real-results' && realConfig && (
                <EvolucionRebanoPage
                    key="real-results"
                    simulationConfig={realConfig}
                    mode="real"
                />
            )}
            {activeView === 'real-results' && !realConfig && isDataLoading && <LoadingOverlay />}
            {activeView === 'real-results' && !realConfig && !isDataLoading && (
                 <div className="text-center p-10 text-zinc-400">No hay suficientes datos reales (animales activos o configuración) para generar la proyección. Revisa los permisos de Firebase si persiste.</div>
            )}
        </main>

         <nav className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
            {navItems.map((item) => {
                 const isDisabled = (item.view === 'sim-results' && !simConfig) || (item.view === 'real-results' && !realConfig);
                 const isActive = activeView === item.view;
                 // console.log(`Botón Nav: ${item.label}, Vista: ${item.view}, Deshabilitado: ${isDisabled}, Activo: ${isActive}`);
                 return (
                    <button
                        key={item.view}
                        onClick={() => handleViewChange(item.view)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors ${
                             isActive ? 'text-indigo-400 font-semibold' : 'text-gray-500 hover:text-white'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                         aria-current={isActive ? 'page' : undefined}
                    >
                         <item.icon className="w-6 h-6" />
                         <span className="text-xs font-semibold mt-1">{item.label}</span>
                    </button>
                 );
            })}
         </nav>

        <div style={{ position: 'fixed', bottom: 'calc(4rem + 1rem)', right: '1rem', zIndex: 40 }}>
             <ModuleSwitcher onSwitchModule={onSwitchModule} />
        </div>
    </div>
  );
}