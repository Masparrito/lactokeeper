import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
    Save, CheckCircle, Loader2, Baby, Milk,
    TrendingUp, Cog, ArrowLeft,
    ChevronDown,
    LogOut // <-- (NUEVO) Importar ícono de Salir
} from 'lucide-react';
import type { PageState } from '../types/navigation';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';
import { auth } from '../firebaseConfig'; // <-- (NUEVO) Importar 'auth'

// --- (Helpers: configToFormState, formStateToConfig - Sin cambios) ---
const configToFormState = (config: AppConfig): Record<string, string | boolean> => {
    const stringState: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'number') {
            stringState[key] = String(value); 
        } else {
            stringState[key] = value; 
        }
    }
    return stringState;
};

const formStateToConfig = (formState: Record<string, string | boolean>): AppConfig => {
    const newConfig: any = { ...formState }; 
    
    for (const [key, defaultValue] of Object.entries(DEFAULT_CONFIG)) {
        if (typeof defaultValue === 'number') {
            const stringValue = String(formState[key]);
            let parsedValue = parseFloat(stringValue);
            if (isNaN(parsedValue)) {
                parsedValue = DEFAULT_CONFIG[key as keyof AppConfig] as number; 
            }
            newConfig[key] = parsedValue;
        }
    }
    return newConfig as AppConfig;
};


// --- Componente de UI colapsable (Sin cambios) ---
const SettingsGroup: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode, startOpen?: boolean }> = ({ title, icon: Icon, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen); 

    return (
        <div className="mb-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2 px-4"
            >
                <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {title}
                </span>
                <ChevronDown 
                    size={20} 
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>
            {isOpen && (
                <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- Componente SettingsInput (Sin cambios) ---
interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
}

const SettingsInput = React.forwardRef<HTMLInputElement, SettingsInputProps>(({ label, unit, ...props }, ref) => (
    <div className={`p-3 bg-ios-modal-bg flex justify-between items-center ${props.disabled ? 'opacity-50' : ''}`}>
        <label htmlFor={props.id || props.name} className="text-white text-base">
            {label}
        </label>
        <div className="flex items-center gap-2">
            <input
                ref={ref}
                {...props}
                type={props.type === 'number' ? 'text' : props.type}
                inputMode={props.type === 'number' ? 'decimal' : 'text'}
                className={`w-24 bg-zinc-700/80 rounded-lg p-2 text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-orange ${props.type === 'text' ? 'font-sans' : ''} ${props.disabled ? 'text-zinc-400' : 'text-white'}`}
            />
            {unit && <span className="text-zinc-400 w-6 text-left">{unit}</span>}
        </div>
    </div>
));

// --- Interfaz 'SettingsToggleProps' (Sin cambios) ---
interface SettingsToggleProps {
    label: string;
    value: boolean;
    onChange: (checked: boolean) => void;
}

const SettingsToggle: React.FC<SettingsToggleProps & { disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => (
    <div className={`p-3 bg-ios-modal-bg flex justify-between items-center ${disabled ? 'opacity-50' : ''}`}>
        <label className="text-white text-base">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={() => !disabled && onChange(!value)}
            disabled={disabled}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${value ? 'bg-brand-green' : 'bg-zinc-700'} ${disabled ? 'cursor-not-allowed' : ''}`}
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
    const { appConfig: savedConfig, updateAppConfig, isLoadingConfig } = useData();
    
    const [formState, setFormState] = useState(configToFormState(savedConfig || DEFAULT_CONFIG));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

    useEffect(() => {
        if (savedConfig) {
            setFormState(configToFormState(savedConfig));
        }
    }, [savedConfig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | boolean = value;

        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        setFormState(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };
    
    const handleThemeChange = (isDark: boolean) => {
        setFormState(prev => ({ ...prev, theme: isDark ? 'dark' : 'light' }));
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            const configToSave = formStateToConfig(formState);
            await updateAppConfig(configToSave); 
            
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                onBack(); 
            }, 1500);
        } catch (error) {
            console.error("Error al guardar configuración:", error);
            setSaveStatus('idle');
        }
    };
    
    // --- (NUEVO) Handler para Cerrar Sesión ---
    const handleSignOut = () => {
        // Podríamos añadir un modal de confirmación aquí si quieres
        auth.signOut();
    };

    if (isLoadingConfig) {
         return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando configuración...</h1></div>;
    }

    return (
        // --- CORRECCIÓN SCROLL: Eliminado 'height: 100vh' ---
        // El padding lo gestiona el <main> del Shell
        <div className="w-full max-w-2xl mx-auto flex flex-col">
            {/* Header Fijo (Eliminado - ahora lo maneja el Shell) */}
            {/* <header> ... </header> */}
            
            {/* --- (NUEVO) Header Fijo Interno (adaptado de tu versión anterior) --- */}
            {/* Este header se pega al 'top-16' del <main> */}
            <header className="flex-shrink-0 flex items-center justify-between pt-4 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-lg z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-white">Configuración</h1>
                <button
                    onClick={handleSave}
                    disabled={saveStatus !== 'idle'}
                    className={`px-4 py-2 rounded-xl font-bold transition-colors text-base flex items-center gap-2 ${
                        saveStatus === 'idle' ? 'bg-brand-orange text-black' :
                        saveStatus === 'saving' ? 'bg-zinc-600 text-white' :
                        'bg-brand-green text-white'
                    }`}
                >
                    {saveStatus === 'idle' && <Save size={16} />}
                    {saveStatus === 'saving' && <Loader2 size={16} className="animate-spin" />}
                    {saveStatus === 'success' && <CheckCircle size={16} />}
                    {saveStatus === 'saving' ? 'Guardando...' : (saveStatus === 'success' ? 'Guardado' : 'Guardar')}
                </button>
            </header>

            {/* Contenido (ya no necesita 'flex-1 overflow-y-auto') */}
            <main className="pb-24 pt-4 px-4">
                
                <div className="bg-brand-glass rounded-2xl border border-brand-border p-4 mb-6">
                    <label htmlFor="nombreFinca" className="text-sm font-medium text-zinc-400">
                        Nombre de la Finca
                    </label>
                    <input
                        id="nombreFinca"
                        type="text"
                        name="nombreFinca"
                        value={String(formState.nombreFinca)}
                        onChange={handleChange}
                        className="w-full bg-transparent text-2xl font-bold text-white p-0 border-0 focus:outline-none focus:ring-0"
                    />
                </div>

                <SettingsGroup title="General" icon={Cog}>
                    <SettingsToggle 
                        label="Modo Oscuro"
                        value={formState.theme === 'dark'}
                        onChange={(isDark) => handleThemeChange(isDark)}
                    />
                </SettingsGroup>
                
                <SettingsGroup title="Manejo Reproductivo" icon={Baby}>
                    <SettingsInput label="Edad 1er Servicio" type="number" name="edadPrimerServicioMeses" value={String(formState.edadPrimerServicioMeses)} onChange={handleChange} unit="meses" />
                    <SettingsInput label="Peso 1er Servicio" type="number" name="pesoPrimerServicioKg" value={String(formState.pesoPrimerServicioKg)} onChange={handleChange} unit="Kg" />
                    <SettingsInput label="Días de Gestación" type="number" name="diasGestacion" value={String(formState.diasGestacion)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días Confirmar Preñez" type="number" name="diasConfirmarPrenez" value={String(formState.diasConfirmarPrenez)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Días de Pre-parto" type="number" name="diasPreParto" value={String(formState.diasPreParto)} onChange={handleChange} unit="días" />
                </SettingsGroup>
                
                <SettingsGroup title="Manejo Productivo (Leche)" icon={Milk}>
                    <SettingsInput label="Días Lactancia (Larga)" type="number" name="diasLactanciaObjetivo" value={String(formState.diasLactanciaObjetivo)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Alerta Iniciar Secado" type="number" name="diasAlertaInicioSecado" value={String(formState.diasAlertaInicioSecado)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Meta Secado Completo" type="number" name="diasMetaSecadoCompleto" value={String(formState.diasMetaSecadoCompleto)} onChange={handleChange} unit="días" />
                </SettingsGroup>

                <SettingsGroup title="Manejo Crecimiento (Kilos)" icon={TrendingUp}>
                    <SettingsInput label="Alerta Pesar Destete" type="number" name="diasAlertaPesarDestete" value={String(formState.diasAlertaPesarDestete)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Peso Mín. Pesar Destete" type="number" name="pesoMinimoPesarDestete" value={String(formState.pesoMinimoPesarDestete)} onChange={handleChange} unit="Kg" />
                    <SettingsInput label="Meta Edad Destete Final" type="number" name="diasMetaDesteteFinal" value={String(formState.diasMetaDesteteFinal)} onChange={handleChange} unit="días" />
                    <SettingsInput label="Peso Mín. Destete Final" type="number" name="pesoMinimoDesteteFinal" value={String(formState.pesoMinimoDesteteFinal)} onChange={handleChange} unit="Kg" />
                </SettingsGroup>
                
                {/* --- (NUEVO) Botón Cerrar Sesión --- */}
                <div className="mt-8">
                     <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 bg-red-600/20 text-brand-red font-semibold py-3 px-4 rounded-xl transition-colors hover:bg-red-600/40"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </main>
        </div>
    );
}