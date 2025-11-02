import React, { useState, useEffect, ForwardedRef, ChangeEvent, FormEvent } from 'react';
// Importación V5.0
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
// Imports necesarios (V7.0: Añadido Database)
import { Sliders, Users, Percent, DollarSign, TrendingUp, Calendar, Database } from 'lucide-react';

// --- Componente SettingsGroup (V4.4 - Sin Info) ---
interface SettingsGroupProps { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean; }
const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="mb-4">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center justify-between gap-2 mb-2 px-4 w-full">
                <span className="flex items-center gap-2"> <Icon size={16} /> {title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {isOpen && ( <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden animate-fade-in">{children}</div> )}
        </div>
    );
};

// --- Componente SettingsInput (V7.0: Añadido disabled) ---
interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> { 
  label: string; 
  unit?: string; 
}
const SettingsInput = React.forwardRef<HTMLInputElement, SettingsInputProps>(({ label, unit, disabled, ...props }: SettingsInputProps, ref: ForwardedRef<HTMLInputElement>) => ( 
  <div className={`p-3 bg-ios-modal-bg flex justify-between items-center ${disabled ? 'opacity-60' : ''}`}> 
    <label htmlFor={props.id || props.name} className="text-white text-base">{label}</label> 
    <div className="flex items-center gap-2"> 
      <input 
        ref={ref} 
        {...props} 
        disabled={disabled}
        className={`w-24 bg-zinc-700/80 rounded-lg p-2 text-white text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-orange ${disabled ? 'text-zinc-400' : 'text-white'}`} 
      /> 
      {unit && <span className="text-zinc-400 w-8 text-left">{unit}</span>} 
    </div> 
  </div> 
));

// --- Componente MonthSelector (V7.0: Añadido disabled) ---
type MonthKey = 'mesInicioMonta1' | 'mesInicioMonta2' | 'mesInicioMonta3' | 'mesInicioMonta4';
interface MonthSelectorProps { 
  label: string; 
  name: MonthKey; 
  value: number | undefined; 
  onChange: (name: MonthKey, value: number | undefined) => void; 
  disabled?: boolean;
}
const MonthSelector: React.FC<MonthSelectorProps> = ({ label, name, value, onChange, disabled }) => { 
  const meses = ["No Usar", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]; 
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => { 
    const selectedMonth = parseInt(e.target.value, 10); 
    onChange(name, selectedMonth === 0 ? undefined : selectedMonth); 
  }; 
  return ( 
    <div className={`p-3 bg-ios-modal-bg flex justify-between items-center ${disabled ? 'opacity-60' : ''}`}> 
      <label htmlFor={name} className="text-white text-base">{label}</label> 
      <select 
        id={name} 
        name={name} 
        value={value ?? 0} 
        onChange={handleChange} 
        disabled={disabled}
        className={`w-28 bg-zinc-700/80 rounded-lg p-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none text-center ${disabled ? 'text-zinc-400' : 'text-white'}`}
      > 
        {meses.map((mes, index) => ( <option key={index} value={index}>{mes}</option> ))} 
      </select> 
    </div> 
  ); 
};

// --- Componente SettingsSelector (V7.0: Añadido disabled) ---
type SelectorKey = 'diasLactanciaObjetivo';
interface SettingsSelectorProps { 
  label: string; 
  name: SelectorKey; 
  value: number | string | undefined; 
  onChange: (name: SelectorKey, value: number) => void;
  options: { label: string; value: number }[];
  disabled?: boolean;
}
const SettingsSelector: React.FC<SettingsSelectorProps> = ({ label, name, value, onChange, options, disabled }) => { 
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => { 
    onChange(name, parseInt(e.target.value, 10)); 
  }; 
  return ( 
    <div className={`p-3 bg-ios-modal-bg flex justify-between items-center ${disabled ? 'opacity-60' : ''}`}> 
      <label htmlFor={name} className="text-white text-base">{label}</label> 
      <select 
        id={name} 
        name={name} 
        value={value ?? ''} 
        onChange={handleChange} 
        disabled={disabled}
        className={`w-40 bg-zinc-700/80 rounded-lg p-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none text-center ${disabled ? 'text-zinc-400' : 'text-white'}`}
      > 
        {options.map((opt) => ( 
          <option key={opt.value} value={opt.value}>{opt.label}</option> 
        ))} 
      </select> 
    </div> 
  ); 
};

// --- V7.0: NUEVO Componente SettingsSwitch ---
interface SettingsSwitchProps {
  label: string;
  description: string;
  icon: React.ElementType;
  isChecked: boolean;
  onToggle: (isChecked: boolean) => void;
  disabled?: boolean;
}
const SettingsSwitch: React.FC<SettingsSwitchProps> = ({ label, description, icon: Icon, isChecked, onToggle, disabled = false }) => (
  <div className={`p-4 bg-brand-glass rounded-2xl border border-brand-border flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-700 text-sky-400">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={() => !disabled && onToggle(!isChecked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        isChecked ? 'bg-sky-500' : 'bg-gray-600'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isChecked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);


// --- Página del Formulario (V7.0: Actualizada) ---
interface SimulationSetupPageProps {
    initialConfig: SimulationConfig | null | undefined; // Simulación guardada (manual)
    realConfig: SimulationConfig | null | undefined; // Simulación con datos reales
    onSimulate: (config: SimulationConfig) => void;
}

// Default mínimo FUERA del componente
const minimalDefaultConfig: SimulationConfig = {
    initialCabras: 0, initialLevanteTardio: 0, initialLevanteMedio: 0, initialLevanteTemprano: 0, initialCriaH: 0, initialCriaM: 0, initialPadres: 1,
    diasLactanciaObjetivo: 305, // V5.0 - Valor por defecto
};

export const SimulationSetupPage: React.FC<SimulationSetupPageProps> = ({ initialConfig, realConfig, onSimulate }) => {
    
    // El 'config' del state SIEMPRE representa lo que se ve en el formulario
    const [config, setConfig] = useState<SimulationConfig>(() => ({
         ...minimalDefaultConfig,
         ...(initialConfig || {})
    }));
    
    // V7.0: Estado para el interruptor
    const [useRealData, setUseRealData] = useState(false);

    // Sincronizar si initialConfig (simulación guardada) cambia
    useEffect(() => {
        // Si el modo "Real" NO está activo, y el initialConfig (simConfig) cambia,
        // actualiza el formulario para reflejar el simConfig.
        if (!useRealData && initialConfig && JSON.stringify(initialConfig) !== JSON.stringify(config)) {
             setConfig({ ...minimalDefaultConfig, ...initialConfig });
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialConfig, useRealData]);

    // Recalcular padres (solo si estamos en modo manual)
     useEffect(() => {
        if (useRealData) return; // Si usamos datos reales, no recalcular
        
        const cabras = config.initialCabras ?? 0; const lt = config.initialLevanteTemprano ?? 0; const lm = config.initialLevanteMedio ?? 0; const ltd = config.initialLevanteTardio ?? 0; const currentPadres = config.initialPadres;
        const hembrasTotales = cabras + ltd + lm + lt; const padresNecesarios = Math.max(1, Math.ceil(hembrasTotales / 30));
        if (currentPadres === undefined || currentPadres !== padresNecesarios) { setConfig(prev => ({ ...prev, initialPadres: padresNecesarios })); }
     }, [config.initialCabras, config.initialLevanteTemprano, config.initialLevanteMedio, config.initialLevanteTardio, config.initialPadres, useRealData]);

    // Handlers
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, value, type } = e.target; let processedValue: string | number | undefined = value; if (type === 'number') { if (value === '') { processedValue = undefined; } else { processedValue = parseFloat(value); if (isNaN(processedValue)) processedValue = undefined; } } setConfig((prev: SimulationConfig) => ({ ...prev, [name]: processedValue })); };
    const handleMonthChange = (name: MonthKey, value: number | undefined) => { setConfig((prev: SimulationConfig) => ({ ...prev, [name]: value })); };
    const handleSelectorChange = (name: SelectorKey, value: number) => { setConfig((prev: SimulationConfig) => ({ ...prev, [name]: value })); };
    
    // --- V7.0: Handler para el "Switch de Realidad" ---
    const handleSwitchToggle = (isUsingReal: boolean) => {
        setUseRealData(isUsingReal);
        if (isUsingReal && realConfig) {
            // MODO REAL: Cargar config real y bloquear formulario
            setConfig(realConfig); 
        } else {
            // MODO MANUAL: Cargar config de simulación (la guardada por el usuario)
            setConfig({ ...minimalDefaultConfig, ...(initialConfig || {}) });
        }
    };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        // Si el switch está ON, pero realConfig no cargó, es un error.
        if (useRealData && !realConfig) {
            alert("Error: No se pudieron cargar los datos reales. Desactiva el modo 'Usar Datos Reales' para continuar.");
            return;
        }

        // Si está en modo manual, validar las montas
        if (!useRealData && !config.mesInicioMonta1 && !config.mesInicioMonta2 && !config.mesInicioMonta3 && !config.mesInicioMonta4) { 
            alert("Debes seleccionar al menos un mes de inicio para la Temporada de Monta 1."); 
            return; 
        }
        
        // V5.0 - Validar que el pico sea mayor que el promedio (solo en modo manual)
        if (!useRealData) {
            const promedio = config.litrosPromedioPorAnimal ?? 0;
            const pico = config.litrosPicoPorAnimal ?? 0;
            if (pico > 0 && pico <= promedio) {
                alert("Error: La Producción (Pico) debe ser mayor que la Producción (Promedio).");
                return;
            }
        }

        // onSimulate simplemente envía lo que esté en el 'config' state
        console.log(`Ejecutando simulación con (Modo Real: ${useRealData}):`, config);
        onSimulate(config);
    };
    
    const isRealConfigReady = !!realConfig;

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in p-4 pb-32">
            <header className="text-center mb-6"> <h1 className="text-3xl font-bold tracking-tight text-white">Modo Simulación</h1> <p className="text-lg text-zinc-400">Define tus parámetros de partida</p> </header>

            {/* --- V7.0: "SWITCH DE REALIDAD" AÑADIDO --- */}
            <SettingsSwitch
              label="Usar Datos Reales de mi Finca"
              description={isRealConfigReady ? "Poblará el setup con KPIs reales" : "Calculando KPIs reales..."}
              icon={Database}
              isChecked={useRealData}
              onToggle={handleSwitchToggle}
              disabled={!isRealConfigReady}
            />

            {/* --- GRUPOS DE ENTRADA (V7.0: Añadido disabled={useRealData}) --- */}
            <SettingsGroup title="Población Inicial" icon={Users} defaultOpen={true}>
                <SettingsInput label="Cabras (>18m)" type="number" name="initialCabras" value={config.initialCabras ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="L. Tardío (12-18m)" type="number" name="initialLevanteTardio" value={config.initialLevanteTardio ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="L. Medio (6-12m)" type="number" name="initialLevanteMedio" value={config.initialLevanteMedio ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="L. Temprano (3-6m)" type="number" name="initialLevanteTemprano" value={config.initialLevanteTemprano ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="Crías H (0-3m)" type="number" name="initialCriaH" value={config.initialCriaH ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="Crías M (0-3m)" type="number" name="initialCriaM" value={config.initialCriaM ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
                <SettingsInput label="Reproductores (>12m)" type="number" name="initialPadres" value={config.initialPadres ?? ''} onChange={handleChange} min="1" step="1" unit="N°" disabled={useRealData} />
                {!useRealData && <p className="text-xs text-zinc-500 px-3 py-2 text-center">Nota: Reproductores calculados (1/30 hembras).</p>}
                <SettingsInput label="Compras Vientres/Año" type="number" name="comprasVientresAnual" value={config.comprasVientresAnual ?? ''} onChange={handleChange} min="0" step="1" unit="N°" disabled={useRealData} />
            </SettingsGroup>
            
            <SettingsGroup title="Temporadas de Monta" icon={Calendar} defaultOpen={true}>
                  <MonthSelector label="Inicio Temporada 1" name="mesInicioMonta1" value={config.mesInicioMonta1} onChange={handleMonthChange} disabled={useRealData} />
                  <MonthSelector label="Inicio Temporada 2" name="mesInicioMonta2" value={config.mesInicioMonta2} onChange={handleMonthChange} disabled={useRealData} />
                  <MonthSelector label="Inicio Temporada 3" name="mesInicioMonta3" value={config.mesInicioMonta3} onChange={handleMonthChange} disabled={useRealData} />
                  <MonthSelector label="Inicio Temporada 4" name="mesInicioMonta4" value={config.mesInicioMonta4} onChange={handleMonthChange} disabled={useRealData} />
                  <SettingsInput label="Duración Monta" type="number" name="duracionMontaDias" value={config.duracionMontaDias ?? ''} onChange={handleChange} min="1" step="1" unit="días" disabled={useRealData} />
            </SettingsGroup>

            <SettingsGroup title="Parámetros de Gestación" icon={Sliders} defaultOpen={false}>
                 <SettingsInput label="Días Gestación" type="number" name="diasGestacion" value={config.diasGestacion ?? ''} onChange={handleChange} min="140" max="160" step="1" unit="días" disabled={useRealData} />
            </SettingsGroup>

            {/* --- GRUPO MANEJO PRODUCTIVO (V7.0: Añadido disabled={useRealData}) --- */}
            <SettingsGroup title="Manejo Productivo" icon={Sliders} defaultOpen={false}>
                 <SettingsInput 
                   label="Producción Leche (Prom.)" 
                   type="number" 
                   name="litrosPromedioPorAnimal" 
                   value={config.litrosPromedioPorAnimal ?? ''} 
                   onChange={handleChange} 
                   min="0" step="0.1" unit="L/día" 
                   disabled={useRealData}
                 />
                 <SettingsInput 
                   label="Producción Leche (Pico)" 
                   type="number" 
                   name="litrosPicoPorAnimal" 
                   value={config.litrosPicoPorAnimal ?? ''} 
                   onChange={handleChange} 
                   min="0" step="0.1" unit="L/día" 
                   disabled={useRealData}
                 />
                 <SettingsSelector 
                   label="Días de Lactancia"
                   name="diasLactanciaObjetivo"
                   value={config.diasLactanciaObjetivo}
                   onChange={handleSelectorChange}
                   options={[
                       { label: '305 Días (10 Meses)', value: 305 },
                       { label: '210 Días (7 Meses)', value: 210 }
                   ]}
                   disabled={useRealData}
                 />
            </SettingsGroup>

            <SettingsGroup title="Índices Biológicos" icon={Percent} defaultOpen={true}>
                 <SettingsInput label="% de Preñez" type="number" name="porcentajePrenez" value={config.porcentajePrenez ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
                 <SettingsInput label="% Prolificidad" type="number" name="porcentajeProlificidad" value={config.porcentajeProlificidad ?? ''} onChange={handleChange} min="0" step="1" unit="%" disabled={useRealData} />
                 <SettingsInput label="% Mortalidad Crías (0-3m)" type="number" name="mortalidadCrias" value={config.mortalidadCrias ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
                 <SettingsInput label="% Mortalidad Levante (3-18m)" type="number" name="mortalidadLevante" value={config.mortalidadLevante ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
                 <SettingsInput label="% Mortalidad Cabras (>18m)" type="number" name="mortalidadCabras" value={config.mortalidadCabras ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
            </SettingsGroup>
            
            <SettingsGroup title="Parámetros de Manejo" icon={Sliders} defaultOpen={false}>
                 <SettingsInput label="% Reemplazo (Anual)" type="number" name="tasaReemplazo" value={config.tasaReemplazo ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
                 <SettingsInput label="% Eliminación Crías M (0-3m)" type="number" name="eliminacionCabritos" value={config.eliminacionCabritos ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" disabled={useRealData} />
            </SettingsGroup>
            
            <SettingsGroup title="Parámetros Económicos" icon={DollarSign} defaultOpen={false}>
                 <SettingsInput label="Precio Venta Leche" type="number" name="precioLecheLitro" value={config.precioLecheLitro ?? ''} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo ?? '$'}/L`} disabled={useRealData} />
                 <SettingsInput label="Precio Venta Cabrito" type="number" name="precioVentaCabritoKg" value={config.precioVentaCabritoKg ?? ''} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo ?? '$'}/Kg`} disabled={useRealData} />
                 <SettingsInput label="Precio Venta Descarte" type="number" name="precioVentaDescarteAdulto" value={config.precioVentaDescarteAdulto ?? ''} onChange={handleChange} min="0" step="1" unit={config.monedaSimbolo ?? '$'} disabled={useRealData} />
            </SettingsGroup>

            {/* Botón de Envío Fijo (V7.0: Texto dinámico) */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-lg border-t border-brand-border z-10" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                 <button 
                   type="submit" 
                   className="w-full max-w-2xl mx-auto bg-brand-orange text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-orange-400 transition-colors"
                 > 
                    <TrendingUp size={20} /> 
                    {useRealData ? 'Correr Simulación (con Datos Reales)' : 'Correr Simulación (Manual)'}
                 </button>
            </div>
        </form>
    );
};