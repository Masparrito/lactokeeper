import React, { useState, useEffect, ForwardedRef } from 'react';
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
import { Sliders, Users, Percent, DollarSign, TrendingUp } from 'lucide-react'; // Añadido ShoppingCart

// --- Componentes de UI Internos ---

interface SettingsGroupProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="mb-4">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center justify-between gap-2 mb-2 px-4 w-full">
                <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {title}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {isOpen && (
                <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
}

const SettingsInput = React.forwardRef<HTMLInputElement, SettingsInputProps>(({ label, unit, ...props }: SettingsInputProps, ref: ForwardedRef<HTMLInputElement>) => (
    <div className="p-3 bg-ios-modal-bg flex justify-between items-center">
        <label htmlFor={props.id || props.name} className="text-white text-base">
            {label}
        </label>
        <div className="flex items-center gap-2">
            <input
                ref={ref}
                {...props}
                className="w-24 bg-zinc-700/80 rounded-lg p-2 text-white text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-orange"
                // --- CORRECCIÓN BUG '0': Permitir string vacío temporalmente ---
                // El valor se convierte a número en handleChange
            />
            {unit && <span className="text-zinc-400 w-8 text-left">{unit}</span>}
        </div>
    </div>
));


// --- Página del Formulario de Simulación ---

interface SimulationSetupPageProps {
    initialConfig: SimulationConfig;
    onSimulate: (config: SimulationConfig) => void;
}

export default function SimulationSetupPage({ initialConfig, onSimulate }: SimulationSetupPageProps) {
    const [config, setConfig] = useState<SimulationConfig>(initialConfig);

    // Recalcular padres si cambian las hembras
    useEffect(() => {
        const hembras = config.initialCabras + config.initialCabritonas;
        const padresNecesarios = Math.max(1, Math.ceil(hembras / 30));
        if (config.initialPadres !== padresNecesarios) {
            setConfig((prev: SimulationConfig) => ({ ...prev, initialPadres: padresNecesarios }));
        }
    }, [config.initialCabras, config.initialCabritonas, config.initialPadres]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number = value;

        // --- CORRECCIÓN BUG '0': Manejar campo vacío y conversión ---
        if (type === 'number') {
            // Si el campo está vacío, guardar 0 (o manejar como null si prefieres)
            // Si no está vacío, convertir a número flotante
            processedValue = value === '' ? 0 : parseFloat(value);
            // Prevenir NaN si la conversión falla
            if (isNaN(processedValue)) {
                processedValue = 0;
            }
        }

        setConfig((prev: SimulationConfig) => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSimulate(config);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in p-4 pb-32"> {/* Aumentado pb */}
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white">Modo Simulación</h1>
                <p className="text-lg text-zinc-400">Define tus parámetros de partida</p>
            </header>

            {/* --- GRUPOS DE ENTRADA --- */}

            <SettingsGroup title="Población Inicial" icon={Users} defaultOpen={true}>
                 {/* --- CORRECCIÓN BUG '0': Usar value={config.prop || ''} si se quiere campo vacío --- */}
                 {/* O mantener value={config.prop} que mostrará 0 si es 0 */}
                <SettingsInput label="Cabras (Adultas)" type="number" name="initialCabras" value={config.initialCabras} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Levante (1-2a)" type="number" name="initialCabritonas" value={config.initialCabritonas} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Crías (0-1a)" type="number" name="initialCabritas" value={config.initialCabritas} onChange={handleChange} min="0" step="1" unit="N°" />
                <SettingsInput label="Reproductores" type="number" name="initialPadres" value={config.initialPadres} onChange={handleChange} min="1" step="1" unit="N°" />
                <p className="text-xs text-zinc-500 px-3 py-2 text-center">Nota: Reproductores calculados automáticamente (1/30 hembras).</p>
                {/* --- NUEVO CAMPO --- */}
                <SettingsInput label="Compras Vientres/Año" type="number" name="comprasVientresAnual" value={config.comprasVientresAnual} onChange={handleChange} min="0" step="1" unit="N°" />
            </SettingsGroup>

            <SettingsGroup title="Manejo Reproductivo" icon={Sliders} defaultOpen={true}>
                 <div className="p-3 bg-ios-modal-bg flex justify-between items-center">
                    <label className="text-white text-base">Temporadas Monta/Año</label>
                    <div className="flex bg-zinc-700/80 rounded-lg p-1">
                        {[1, 2, 3, 4].map(num => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setConfig((prev: SimulationConfig) => ({ ...prev, temporadasMontaPorAno: num as 1 | 2 | 3 | 4}))}
                                className={`px-3 py-1 text-sm rounded ${config.temporadasMontaPorAno === num ? 'bg-brand-orange text-black font-semibold' : 'text-white'}`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
                <SettingsInput label="Duración Monta" type="number" name="duracionMontaDias" value={config.duracionMontaDias} onChange={handleChange} min="1" step="1" unit="días" />
                <SettingsInput label="Días Gestación" type="number" name="diasGestacion" value={config.diasGestacion} onChange={handleChange} min="140" max="160" step="1" unit="días" />
                 <SettingsInput label="Concentración Partos" type="number" name="distribucionPartosPorcentaje" value={config.distribucionPartosPorcentaje} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="Duración 1ra Fase Partos" type="number" name="distribucionPartosDias" value={config.distribucionPartosDias} onChange={handleChange} min="1" step="1" unit="días" />
            </SettingsGroup>

            <SettingsGroup title="Manejo Productivo" icon={Sliders}>
                <SettingsInput label="Producción Leche (Prom.)" type="number" name="litrosPromedioPorAnimal" value={config.litrosPromedioPorAnimal} onChange={handleChange} min="0" step="0.1" unit="L/día" />
                <SettingsInput label="Días de Lactancia" type="number" name="diasLactanciaObjetivo" value={config.diasLactanciaObjetivo} onChange={handleChange} min="1" step="1" unit="días" />
            </SettingsGroup>

            <SettingsGroup title="Índices Biológicos" icon={Percent}>
                <SettingsInput label="% de Preñez" type="number" name="porcentajePrenez" value={config.porcentajePrenez} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="% Prolificidad" type="number" name="porcentajeProlificidad" value={config.porcentajeProlificidad} onChange={handleChange} min="0" step="1" unit="%" />
                <SettingsInput label="% Mortalidad Crías (0-6m)" type="number" name="mortalidadCrias" value={config.mortalidadCrias} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="% Mortalidad Levante (6-12m)" type="number" name="mortalidadLevante" value={config.mortalidadLevante} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="% Mortalidad Cabras (>12m)" type="number" name="mortalidadCabras" value={config.mortalidadCabras} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="% Reemplazo (Anual)" type="number" name="tasaReemplazo" value={config.tasaReemplazo} onChange={handleChange} min="0" max="100" step="1" unit="%" />
                <SettingsInput label="% Eliminación Cabritos" type="number" name="eliminacionCabritos" value={config.eliminacionCabritos} onChange={handleChange} min="0" max="100" step="1" unit="%" />
            </SettingsGroup>

            <SettingsGroup title="Parámetros Económicos" icon={DollarSign}>
                <SettingsInput label="Precio Venta Leche" type="number" name="precioLecheLitro" value={config.precioLecheLitro} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo}/L`} />
                <SettingsInput label="Precio Venta Cabrito" type="number" name="precioVentaCabritoKg" value={config.precioVentaCabritoKg} onChange={handleChange} min="0" step="0.01" unit={`${config.monedaSimbolo}/Kg`} />
                <SettingsInput label="Precio Venta Descarte" type="number" name="precioVentaDescarteAdulto" value={config.precioVentaDescarteAdulto} onChange={handleChange} min="0" step="1" unit={config.monedaSimbolo} />
            </SettingsGroup>

            {/* Botón de Envío Fijo (bottom-16) */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-lg border-t border-brand-border z-10" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <button
                    type="submit"
                    className="w-full max-w-2xl mx-auto bg-brand-orange text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-orange-400 transition-colors"
                >
                    <TrendingUp size={20} />
                    Correr Simulación
                </button>
            </div>
        </form>
    );
}