import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
    Save, CheckCircle, Loader2, Percent, Baby, Milk,
    TrendingUp, Syringe, DollarSign, Cog, ArrowLeft
} from 'lucide-react';
import type { PageState } from '../types/navigation';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';

// --- COMPONENTES DE UI INTERNOS (Estilo iOS) ---

const SettingsGroup: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2 mb-2 px-4">
            <Icon size={16} />
            {title}
        </h2>
        <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
            {children}
        </div>
    </div>
);

interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
}

const SettingsInput = React.forwardRef<HTMLInputElement, SettingsInputProps>(({ label, unit, ...props }, ref) => (
    <div className="p-3 bg-ios-modal-bg flex justify-between items-center">
        <label htmlFor={props.id || props.name} className="text-white text-base">
            {label}
        </label>
        <div className="flex items-center gap-2">
            <input
                ref={ref}
                {...props}
                className={`w-24 bg-zinc-700/80 rounded-lg p-2 text-white text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-orange ${props.type === 'text' ? 'font-sans' : ''}`}
            />
            {unit && <span className="text-zinc-400 w-6 text-left">{unit}</span>}
        </div>
    </div>
));

interface SettingsToggleProps {
    label: string;
    value: boolean;
    onChange: (checked: boolean) => void;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, value, onChange }) => (
    <div className="p-3 bg-ios-modal-bg flex justify-between items-center">
        <label className="text-white text-base">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${value ? 'bg-brand-green' : 'bg-zinc-700'}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-6' : 'translate-x-0'}`}
            />
        </button>
    </div>
);


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

interface ConfiguracionPageProps {
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function ConfiguracionPage({ onBack }: ConfiguracionPageProps) {
    // Asumimos que useData ahora provee esto
    const { appConfig: savedConfig, updateAppConfig, isLoadingConfig } = useData();
    const [config, setConfig] = useState<AppConfig>(savedConfig || DEFAULT_CONFIG);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

    // Sincronizar estado local si la configuración de useData cambia
    useEffect(() => {
        if (savedConfig) {
            setConfig(savedConfig);
        }
    }, [savedConfig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean = value;

        if (type === 'number') {
            // Permitir borrar antes de escribir un nuevo número
            processedValue = value === '' ? 0 : parseFloat(value); 
        }
        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        setConfig(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };
    
    const handleThemeChange = (isDark: boolean) => {
        setConfig(prev => ({ ...prev, theme: isDark ? 'dark' : 'light' }));
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            await updateAppConfig(config); // Asumimos que esta función existe en useData
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                onBack(); // Volver a la página anterior después de guardar
            }, 1500);
        } catch (error) {
            console.error("Error al guardar configuración:", error);
            setSaveStatus('idle');
            // Aquí podríamos mostrar un modal de error
        }
    };

    if (isLoadingConfig) {
         return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando configuración...</h1></div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
            {/* Header Fijo */}
            <header className="flex-shrink-0 flex items-center justify-between pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-lg z-10 border-b border-brand-border">
                {/* Botón de Volver */}
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold tracking-tight text-white">Configuración</h1>
                <button
                    onClick={handleSave}
                    disabled={saveStatus !== 'idle'}
                    className={`px-5 py-2 rounded-xl font-bold transition-colors text-lg flex items-center gap-2 ${
                        saveStatus === 'idle' ? 'bg-brand-orange text-black' :
                        saveStatus === 'saving' ? 'bg-zinc-600 text-white' :
                        'bg-brand-green text-white'
                    }`}
                >
                    {saveStatus === 'idle' && <Save size={18} />}
                    {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                    {saveStatus === 'success' && <CheckCircle size={18} />}
                    {saveStatus === 'saving' ? 'Guardando...' : (saveStatus === 'success' ? 'Guardado' : 'Guardar')}
                </button>
            </header>

            {/* Contenido con Scroll */}
            <main className="flex-1 overflow-y-auto pb-24 pt-4">
                
                <SettingsGroup title="General" icon={Cog}>
                    <SettingsInput 
                        label="Nombre de la Finca"
                        type="text"
                        name="nombreFinca"
                        value={config.nombreFinca}
                        onChange={handleChange}
                    />
                    <SettingsToggle 
                        label="Modo Oscuro"
                        value={config.theme === 'dark'}
                        onChange={(isDark) => handleThemeChange(isDark)}
                    />
                </SettingsGroup>

                <SettingsGroup title="Índices Biológicos" icon={Percent}>
                    <SettingsInput label="% de Preñez" type="number" name="porcentajePrenez" value={config.porcentajePrenez} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Prolificidad" type="number" name="porcentajeProlificidad" value={config.porcentajeProlificidad} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Mortalidad Crías (0-3m)" type="number" name="mortalidadCrias" value={config.mortalidadCrias} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Mortalidad Levante (3-12m)" type="number" name="mortalidadLevante" value={config.mortalidadLevante} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Mortalidad Cabras (Adultas)" type="number" name="mortalidadCabras" value={config.mortalidadCabras} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Reemplazo (Anual)" type="number" name="tasaReemplazo" value={config.tasaReemplazo} onChange={handleChange} unit="%" />
                    <SettingsInput label="% Eliminación Cabritos" type="number" name="eliminacionCabritos" value={config.eliminacionCabritos} onChange={handleChange} unit="%" />
                </SettingsGroup>
                
                <SettingsGroup title="Manejo Reproductivo" icon={Baby}>
                    <SettingsInput label="Peso 1er Servicio" type="number" name="pesoPrimerServicioKg" value={config.pesoPrimerServicioKg} onChange={handleChange} unit="Kg" />
                    <SettingsInput label="Días de Gestación" type="number" name="diasGestacion" value={config.diasGestacion} onChange={handleChange} unit="días" />
                    {/* --- LÍNEA ELIMINADA --- La siguiente línea causaba el error y ha sido removida */}
                    {/* <SettingsInput label="Intervalo Entre Partos" type="number" name="intervaloPartosDias" value={config.intervaloPartosDias} onChange={handleChange} unit="días" /> */}
                    <SettingsInput label="Días Confirmar Preñez" type="number" name="diasConfirmarPrenez" value={config.diasConfirmarPrenez} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días de Pre-parto" type="number" name="diasPreParto" value={config.diasPreParto} onChange={handleChange} unit="días" />
                </SettingsGroup>
                
                <SettingsGroup title="Manejo Productivo (Leche)" icon={Milk}>
                    <SettingsInput label="Días de Lactancia (Meta)" type="number" name="diasLactanciaObjetivo" value={config.diasLactanciaObjetivo} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días Secado (Meta)" type="number" name="diasSecadoObjetivo" value={config.diasSecadoObjetivo} onChange={handleChange} unit="días" />
                </SettingsGroup>

                <SettingsGroup title="Manejo Crecimiento (Kilos)" icon={TrendingUp}>
                    <SettingsInput label="Edad Destete (Meta)" type="number" name="edadDesteteDias" value={config.edadDesteteDias} onChange={handleChange} unit="días" />
                    <SettingsInput label="Peso Destete (Meta)" type="number" name="pesoDesteteMetaKg" value={config.pesoDesteteMetaKg} onChange={handleChange} unit="Kg" />
                </SettingsGroup>

                <SettingsGroup title="Manejo Sanitario (StockCare)" icon={Syringe}>
                    <SettingsInput label="Días Alerta (Atraso)" type="number" name="diasAlertaAtraso" value={config.diasAlertaAtraso} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días Retiro Leche" type="number" name="diasRetiroLecheDefault" value={config.diasRetiroLecheDefault} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días Retiro Carne" type="number" name="diasRetiroCarneDefault" value={config.diasRetiroCarneDefault} onChange={handleChange} unit="días" />
                </SettingsGroup>

                <SettingsGroup title="Economía (Cents)" icon={DollarSign}>
                    <SettingsInput label="Símbolo Moneda" type="text" name="monedaSimbolo" value={config.monedaSimbolo} onChange={handleChange} />
                    <SettingsInput label="Costo Saco Alimento" type="number" name="costoSacoAlimento" value={config.costoSacoAlimento} onChange={handleChange} unit={config.monedaSimbolo} />
                    <SettingsInput label="Peso Saco Alimento" type="number" name="pesoSacoAlimentoKg" value={config.pesoSacoAlimentoKg} onChange={handleChange} unit="Kg" />
                    <SettingsInput label="Precio Venta Leche" type="number" name="precioLecheLitro" value={config.precioLecheLitro} onChange={handleChange} unit={`${config.monedaSimbolo}/L`} />
                    <SettingsInput label="Precio Venta Cabrito" type="number" name="precioVentaCabritoKg" value={config.precioVentaCabritoKg} onChange={handleChange} unit={`${config.monedaSimbolo}/Kg`} />
                    <SettingsInput label="Precio Venta Descarte" type="number" name="precioVentaDescarteAdulto" value={config.precioVentaDescarteAdulto} onChange={handleChange} unit={config.monedaSimbolo} />
                </SettingsGroup>

            </main>
        </div>
    );
}