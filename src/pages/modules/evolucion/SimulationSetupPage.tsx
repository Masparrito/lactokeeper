import React, { useState, useEffect, ForwardedRef, ChangeEvent, FormEvent } from 'react';
// Importación V5.0
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
// Imports necesarios
import { Sliders, Users, Percent, DollarSign, TrendingUp, Calendar } from 'lucide-react';

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

// --- Componente SettingsInput (V3.13) ---
interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; unit?: string; }
const SettingsInput = React.forwardRef<HTMLInputElement, SettingsInputProps>(({ label, unit, ...props }: SettingsInputProps, ref: ForwardedRef<HTMLInputElement>) => ( <div className="p-3 bg-ios-modal-bg flex justify-between items-center"> <label htmlFor={props.id || props.name} className="text-white text-base">{label}</label> <div className="flex items-center gap-2"> <input ref={ref} {...props} className="w-24 bg-zinc-700/80 rounded-lg p-2 text-white text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-orange" /> {unit && <span className="text-zinc-400 w-8 text-left">{unit}</span>} </div> </div> ));

// --- Componente MonthSelector (V3.13) ---
type MonthKey = 'mesInicioMonta1' | 'mesInicioMonta2' | 'mesInicioMonta3' | 'mesInicioMonta4';
interface MonthSelectorProps { label: string; name: MonthKey; value: number | undefined; onChange: (name: MonthKey, value: number | undefined) => void; }
const MonthSelector: React.FC<MonthSelectorProps> = ({ label, name, value, onChange }) => { const meses = ["No Usar", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]; const handleChange = (e: ChangeEvent<HTMLSelectElement>) => { const selectedMonth = parseInt(e.target.value, 10); onChange(name, selectedMonth === 0 ? undefined : selectedMonth); }; return ( <div className="p-3 bg-ios-modal-bg flex justify-between items-center"> <label htmlFor={name} className="text-white text-base">{label}</label> <select id={name} name={name} value={value ?? 0} onChange={handleChange} className="w-28 bg-zinc-700/80 rounded-lg p-2 text-white text-base focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none text-center"> {meses.map((mes, index) => ( <option key={index} value={index}>{mes}</option> ))} </select> </div> ); };

// --- Componente SettingsSelector (NUEVO V5.0) ---
type SelectorKey = 'diasLactanciaObjetivo'; // Se puede expandir en el futuro
interface SettingsSelectorProps { 
  label: string; 
  name: SelectorKey; 
  value: number | string | undefined; 
  onChange: (name: SelectorKey, value: number) => void;
  options: { label: string; value: number }[];
}
const SettingsSelector: React.FC<SettingsSelectorProps> = ({ label, name, value, onChange, options }) => { 
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => { 
    onChange(name, parseInt(e.target.value, 10)); 
  }; 
  return ( 
    <div className="p-3 bg-ios-modal-bg flex justify-between items-center"> 
      <label htmlFor={name} className="text-white text-base">{label}</label> 
      <select id={name} name={name} value={value ?? ''} onChange={handleChange} className="w-40 bg-zinc-700/80 rounded-lg p-2 text-white text-base focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none text-center"> 
        {options.map((opt) => ( 
          <option key={opt.value} value={opt.value}>{opt.label}</option> 
        ))} 
      </select> 
    </div> 
  ); 
};


// --- Página del Formulario (V5.0) ---
interface SimulationSetupPageProps {
    initialConfig: SimulationConfig | null | undefined;
    onSimulate: (config: SimulationConfig) => void;
}

// Default mínimo FUERA del componente
const minimalDefaultConfig: SimulationConfig = {
    initialCabras: 0, initialLevanteTardio: 0, initialLevanteMedio: 0, initialLevanteTemprano: 0, initialCriaH: 0, initialCriaM: 0, initialPadres: 1,
    diasLactanciaObjetivo: 305, // V5.0 - Valor por defecto
};

export const SimulationSetupPage: React.FC<SimulationSetupPageProps> = ({ initialConfig, onSimulate }) => {
    // Inicialización robusta
    const [config, setConfig] = useState<SimulationConfig>(() => ({
         ...minimalDefaultConfig,
         ...(initialConfig || {})
    }));

    // Sincronizar si initialConfig cambia
     useEffect(() => {
        if (initialConfig && JSON.stringify(initialConfig) !== JSON.stringify(config)) {
             setConfig({ ...minimalDefaultConfig, ...initialConfig });
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialConfig]);

    // Recalcular padres
     useEffect(() => {
        const cabras = config.initialCabras ?? 0; const lt = config.initialLevanteTemprano ?? 0; const lm = config.initialLevanteMedio ?? 0; const ltd = config.initialLevanteTardio ?? 0; const currentPadres = config.initialPadres;
        const hembrasTotales = cabras + ltd + lm + lt; const padresNecesarios = Math.max(1, Math.ceil(hembrasTotales / 30));
        if (currentPadres === undefined || currentPadres !== padresNecesarios) { setConfig(prev => ({ ...prev, initialPadres: padresNecesarios })); }
     }, [config.initialCabras, config.initialLevanteTemprano, config.initialLevanteMedio, config.initialLevanteTardio, config.initialPadres]);

    // Handlers
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, value, type } = e.target; let processedValue: string | number | undefined = value; if (type === 'number') { if (value === '') { processedValue = undefined; } else { processedValue = parseFloat(value); if (isNaN(processedValue)) processedValue = undefined; } } setConfig((prev: SimulationConfig) => ({ ...prev, [name]: processedValue })); };
    const handleMonthChange = (name: MonthKey, value: number | undefined) => { setConfig((prev: SimulationConfig) => ({ ...prev, [name]: value })); };
    // V5.0 - Handler para el nuevo selector
    const handleSelectorChange = (name: SelectorKey, value: number) => { setConfig((prev: SimulationConfig) => ({ ...prev, [name]: value })); };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!config.mesInicioMonta1 && !config.mesInicioMonta2 && !config.mesInicioMonta3 && !config.mesInicioMonta4) { alert("Debes seleccionar al menos un mes de inicio para la Temporada de Monta 1."); return; }
        
        // V5.0 - Validar que el pico sea mayor que el promedio
        const promedio = config.litrosPromedioPorAnimal ?? 0;
        const pico = config.litrosPicoPorAnimal ?? 0;
        if (pico > 0 && pico <= promedio) {
            alert("Error: La Producción (Pico) debe ser mayor que la Producción (Promedio).");
            return;
        }

        // --- V5.0: configToSend actualizado ---
        const configToSend: SimulationConfig = {
            initialCabras: config.initialCabras ?? 0, initialLevanteTardio: config.initialLevanteTardio ?? 0, initialLevanteMedio: config.initialLevanteMedio ?? 0, initialLevanteTemprano: config.initialLevanteTemprano ?? 0, initialCriaH: config.initialCriaH ?? 0, initialCriaM: config.initialCriaM ?? 0,
            initialPadres: config.initialPadres ?? 1,
            comprasVientresAnual: config.comprasVientresAnual ?? 0, mesInicioMonta1: config.mesInicioMonta1, mesInicioMonta2: config.mesInicioMonta2, mesInicioMonta3: config.mesInicioMonta3, mesInicioMonta4: config.mesInicioMonta4, duracionMontaDias: config.duracionMontaDias ?? 45, diasGestacion: config.diasGestacion ?? 150, 
            
            litrosPromedioPorAnimal: config.litrosPromedioPorAnimal ?? 1.8, 
            litrosPicoPorAnimal: config.litrosPicoPorAnimal ?? (config.litrosPromedioPorAnimal ?? 1.8) * 1.4, // V5.0: Añadir pico. Default 140% del prom. si no se setea.
            diasLactanciaObjetivo: config.diasLactanciaObjetivo ?? 305, // V5.0: Viene del selector
            
            porcentajePrenez: config.porcentajePrenez ?? 85, porcentajeProlificidad: config.porcentajeProlificidad ?? 120, mortalidadCrias: config.mortalidadCrias ?? 5, mortalidadLevante: config.mortalidadLevante ?? 3, mortalidadCabras: config.mortalidadCabras ?? 3, tasaReemplazo: config.tasaReemplazo ?? 20, eliminacionCabritos: config.eliminacionCabritos ?? 100, precioLecheLitro: config.precioLecheLitro ?? 0.5, precioVentaCabritoKg: config.precioVentaCabritoKg ?? 3, precioVentaDescarteAdulto: config.precioVentaDescarteAdulto ?? 50, monedaSimbolo: config.monedaSimbolo ?? "$",
        };
        console.log("Ejecutando simulación con (configToSend V5.0):", configToSend);
        onSimulate(configToSend);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in p-4 pb-32">
            <header className="text-center mb-6"> <h1 className="text-3xl font-bold tracking-tight text-white">Modo Simulación</h1> <p className="text-lg text-zinc-400">Define tus parámetros de partida</p> </header>

            {/* --- GRUPOS DE ENTRADA (Acceso Directo V3.14) --- */}
            <SettingsGroup title="Población Inicial" icon={Users} defaultOpen={true}>
                <SettingsInput label="Cabras (>18m)" type="number" name="initialCabras" value={config.initialCabras ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="L. Tardío (12-18m)" type="number" name="initialLevanteTardio" value={config.initialLevanteTardio ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="L. Medio (6-12m)" type="number" name="initialLevanteMedio" value={config.initialLevanteMedio ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="L. Temprano (3-6m)" type="number" name="initialLevanteTemprano" value={config.initialLevanteTemprano ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Crías H (0-3m)" type="number" name="initialCriaH" value={config.initialCriaH ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Crías M (0-3m)" type="number" name="initialCriaM" value={config.initialCriaM ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Reproductores (>12m)" type="number" name="initialPadres" value={config.initialPadres ?? ''} onChange={handleChange} min="1" step="1" unit="N°" />
                <p className="text-xs text-zinc-500 px-3 py-2 text-center">Nota: Reproductores calculados (1/30 hembras).</p>
                <SettingsInput label="Compras Vientres/Año" type="number" name="comprasVientresAnual" value={config.comprasVientresAnual ?? ''} onChange={handleChange} min="0" step="1" unit="N°" />
            </SettingsGroup>
            <SettingsGroup title="Temporadas de Monta" icon={Calendar} defaultOpen={true}>
                  <MonthSelector label="Inicio Temporada 1" name="mesInicioMonta1" value={config.mesInicioMonta1} onChange={handleMonthChange} />
                  <MonthSelector label="Inicio Temporada 2" name="mesInicioMonta2" value={config.mesInicioMonta2} onChange={handleMonthChange} />
                  <MonthSelector label="Inicio Temporada 3" name="mesInicioMonta3" value={config.mesInicioMonta3} onChange={handleMonthChange} />
                  <MonthSelector label="Inicio Temporada 4" name="mesInicioMonta4" value={config.mesInicioMonta4} onChange={handleMonthChange} />
                  <SettingsInput label="Duración Monta" type="number" name="duracionMontaDias" value={config.duracionMontaDias ?? ''} onChange={handleChange} min="1" step="1" unit="días" />
            </SettingsGroup>

            <SettingsGroup title="Parámetros de Gestación" icon={Sliders} defaultOpen={false}>
                 <SettingsInput label="Días Gestación" type="number" name="diasGestacion" value={config.diasGestacion ?? ''} onChange={handleChange} min="140" max="160" step="1" unit="días" />
            </SettingsGroup>

            {/* --- GRUPO MANEJO PRODUCTIVO (CORREGIDO V5.0) --- */}
            <SettingsGroup title="Manejo Productivo" icon={Sliders} defaultOpen={false}>
                 <SettingsInput 
                   label="Producción Leche (Prom.)" 
                   type="number" 
                   name="litrosPromedioPorAnimal" 
                   value={config.litrosPromedioPorAnimal ?? ''} 
                   onChange={handleChange} 
                   min="0" step="0.1" unit="L/día" 
                 />
                 <SettingsInput 
                   label="Producción Leche (Pico)" 
                   type="number" 
                   name="litrosPicoPorAnimal" 
                   value={config.litrosPicoPorAnimal ?? ''} 
                   onChange={handleChange} 
                   min="0" step="0.1" unit="L/día" 
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
                 />
            </SettingsGroup>

            <SettingsGroup title="Índices Biológicos" icon={Percent} defaultOpen={true}>
                 <SettingsInput label="% de Preñez" type="number" name="porcentajePrenez" value={config.porcentajePrenez ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                 <SettingsInput label="% Prolificidad" type="number" name="porcentajeProlificidad" value={config.porcentajeProlificidad ?? ''} onChange={handleChange} min="0" step="1" unit="%" />
                 <SettingsInput label="% Mortalidad Crías (0-3m)" type="number" name="mortalidadCrias" value={config.mortalidadCrias ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                 <SettingsInput label="% Mortalidad Levante (3-18m)" type="number" name="mortalidadLevante" value={config.mortalidadLevante ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                 <SettingsInput label="% Mortalidad Cabras (>18m)" type="number" name="mortalidadCabras" value={config.mortalidadCabras ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
            </SettingsGroup>
            <SettingsGroup title="Parámetros de Manejo" icon={Sliders} defaultOpen={false}>
                 <SettingsInput label="% Reemplazo (Anual)" type="number" name="tasaReemplazo" value={config.tasaReemplazo ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                 <SettingsInput label="% Eliminación Crías M (0-3m)" type="number" name="eliminacionCabritos" value={config.eliminacionCabritos ?? ''} onChange={handleChange} min="0" max="100" step="1" unit="%" />
            </SettingsGroup>
            <SettingsGroup title="Parámetros Económicos" icon={DollarSign} defaultOpen={false}>
                 <SettingsInput label="Precio Venta Leche" type="number" name="precioLecheLitro" value={config.precioLecheLitro ?? ''} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo ?? '$'}/L`} />
                 <SettingsInput label="Precio Venta Cabrito" type="number" name="precioVentaCabritoKg" value={config.precioVentaCabritoKg ?? ''} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo ?? '$'}/Kg`} />
                 <SettingsInput label="Precio Venta Descarte" type="number" name="precioVentaDescarteAdulto" value={config.precioVentaDescarteAdulto ?? ''} onChange={handleChange} min="0" step="1" unit={config.monedaSimbolo ?? '$'} />
            </SettingsGroup>

            {/* Botón de Envío Fijo */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-lg border-t border-brand-border z-10" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                 <button type="submit" className="w-full max-w-2xl mx-auto bg-brand-orange text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-orange-400 transition-colors"> <TrendingUp size={20} /> Correr Simulación </button>
            </div>
        </form>
    );
};