// src/pages/BatchImportPage.tsx

import React, { useRef, useState, useMemo } from 'react';
import { ArrowLeft, Camera, FileImage, Loader, AlertTriangle, ChevronRight, Info } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { useData } from '../context/DataContext';
import { functions } from '../firebaseConfig';
import { Weighing, BodyWeighing } from '../db/local';

// --- Tipos e Interfaces ---
export interface OcrResult {
    id: string;
    weight: string; 
    date?: string; 
}

interface BatchImportPageProps {
    onBack: () => void;
    onImportSuccess: (results: OcrResult[], defaultDate: string) => void;
    importType: 'leche' | 'corporal'; 
}

// --- CONSTANTES DE NEGOCIO ---
// Reproductores VIP que la IA debe conocer sí o sí para desempates visuales.
const KEY_SIRES = [
    { name: 'Quantum', char: 'Q' },
    { name: 'Mercurio', char: 'M' },
    { name: 'Venus', char: 'V' },
    { name: 'Urano', char: 'U' },
    { name: 'Atom', char: 'A' },
    { name: 'Tabaco', char: 'T' }
];

// --- Helper: Convertir archivo a Base64 ---
// Devuelve el base64 Y el tipo real de la imagen. En iPhone las fotos suelen
// ser HEIC; si se envía como "image/jpeg" Gemini puede rechazarlas.
const toBase64 = (file: File): Promise<{ data: string; mimeType: string }> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string; // data:<mime>;base64,<data>
        const match = /^data:([^;]+);base64,(.*)$/.exec(result);
        const mimeType = (match && match[1]) || file.type || 'image/jpeg';
        const data = match ? match[2] : result.split(',')[1];
        resolve({ data, mimeType });
    };
    reader.onerror = error => reject(error);
});

// --- Componente Visual: Botones de Captura ---
const CaptureView = ({ onImageSelect }: { onImageSelect: (file: File) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) onImageSelect(event.target.files[0]);
    };

    const buttonClass = "group w-full bg-c-surface border border-c-border hover:border-c-accent-sky/50 hover:bg-c-surface-2 p-4 rounded-xl flex items-center transition-all duration-200 active:scale-[0.98]";

    return (
        <div className="flex flex-col gap-3 animate-fade-in mt-2">
             <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />

            <button
                onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'environment');
                    fileInputRef.current?.click();
                }}
                className={buttonClass}
            >
                <div className="bg-c-accent-sky/10 p-3 rounded-lg mr-4 group-hover:bg-c-accent-sky/20 transition-colors">
                    <Camera className="w-6 h-6 text-c-accent-sky" />
                </div>
                <div className="flex-grow text-left">
                    <span className="block text-base font-semibold text-c-text-strong">Tomar Foto</span>
                    <span className="block text-xs text-c-text-muted">Usar la cámara ahora</span>
                </div>
                <ChevronRight className="w-5 h-5 text-c-text-faint group-hover:text-c-text-muted" />
            </button>

            <button
                onClick={() => {
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                }}
                className={buttonClass}
            >
                <div className="bg-c-accent/10 p-3 rounded-lg mr-4 group-hover:bg-c-accent/20 transition-colors">
                    <FileImage className="w-6 h-6 text-c-accent" />
                </div>
                <div className="flex-grow text-left">
                    <span className="block text-base font-semibold text-c-text-strong">Seleccionar Archivo</span>
                    <span className="block text-xs text-c-text-muted">Desde la galería</span>
                </div>
                <ChevronRight className="w-5 h-5 text-c-text-faint group-hover:text-c-text-muted" />
            </button>
        </div>
    );
};

// --- LÓGICA PRINCIPAL DE LA API (GEMINI VISION) ---
async function callGeminiVisionAPI(
    base64Image: string,
    mimeType: string,
    defaultDateISO: string,
    importType: 'leche' | 'corporal',
    activePrefixes: string[],
    previousSessionIds: string[]
): Promise<OcrResult[]> {
    
    // 1. La clave de Gemini YA NO viaja en el cliente: la llamada se hace a la
    //    Cloud Function segura 'scanNotebook', que la guarda del lado servidor.

    // 2. Preparar Contexto Enriquecido
    const [year, month, day] = defaultDateISO.split('-');
    const formattedDate = `${day}/${month}/${year.slice(2)}`; 
    
    // Lista de padres VIP formateada
    const vipSiresText = KEY_SIRES.map(s => `${s.name} (${s.char})`).join(', ');
    
    // Historial reciente (limitado a 60 para no saturar prompt)
    const historyContext = previousSessionIds.slice(0, 60).join(', ');
    
    // Prefijos válidos
    const prefixesText = activePrefixes.join(', ');

    // 3. Prompt de Ingeniería (System Prompt)
    const prompt = `
        Actúa como un experto digitador de datos ganaderos usando el sistema GanaderoOS.
        Tu tarea es digitalizar una hoja de registro manuscrita de ${importType === 'leche' ? 'PESAJE DE LECHE' : 'PESO CORPORAL'}.
        La fecha del registro es ${formattedDate}.

        INFORMACIÓN CRÍTICA DEL REBAÑO (Úsala para corregir errores de OCR):
        
        1. **HISTORIAL RECIENTE:** Estos animales se pesaron la última vez. Si tienes duda entre dos caracteres, y uno de estos IDs coincide, ELIGE ESTE:
           [${historyContext}...]
        
        2. **PADRES VIP:** Los IDs suelen iniciar con la letra del padre. Los más comunes son: 
           ${vipSiresText}.
        
        3. **PREFIJOS VÁLIDOS:** Los animales en este rebaño inician con: [${prefixesText}].

        4. **REGLAS DE DESEMPATE VISUAL:**
           - **0 vs Q:** Existe el animal "0016" (Cero) y "Q016" (Quantum). Si el círculo está cerrado sin cola es '0'. Si tiene un trazo abajo es 'Q'. Revisa el Historial Reciente para decidir cuál es más probable.
           - **A vs 4:** 'A' es de Atom. '4' es un número.
           - **T vs 7:** 'T' es de Tabaco.

        5. **FORMATO DE ID:** Letra (o número 0) + Año (ej. 23, 24) + Consecutivo. Ejemplos: Q232, A105, 0016.

        INSTRUCCIONES DE EXTRACCIÓN:
        - Devuelve SOLAMENTE un array JSON válido: [{ "id": "STRING", "weight": "STRING" }]
        - **ID:** Limpia espacios (ej. "Q 232" -> "Q232").
        - **Weight:** ${importType === 'leche' 
            ? '- Son números pequeños (0.50 a 6.00). Ignora enteros grandes como "30" (son fechas o totales).' 
            : '- Son números de 3 a 100 kg. Ignora diferenciales pequeños como "+0.5" o "-1.2".'}
        - Ignora filas de "Total" o "Suma".

        Imagen a procesar:
    `;
    
    // 4. Llamada a la Cloud Function segura (el prompt no es secreto; la clave
    //    de Gemini vive en el servidor). Requiere usuario autenticado.
    // timeout amplio (5 min): el análisis de la hoja puede tardar; el default de
    // 70s del SDK cortaba la llamada y devolvía un genérico "internal".
    const scanNotebook = httpsCallable<{ prompt: string; imageBase64: string; mimeType: string }, { text: string }>(functions, 'scanNotebook', { timeout: 300000 });

    let textResponse: string;
    try {
        const result = await scanNotebook({ prompt, imageBase64: base64Image, mimeType });
        textResponse = result.data?.text ?? '';
    } catch (e: any) {
        // Se muestra código + mensaje + detalle para diagnosticar sin adivinar.
        const code = e?.code ? `[${e.code}] ` : '';
        const detail = e?.details ? ` — ${typeof e.details === 'string' ? e.details : JSON.stringify(e.details)}` : '';
        throw new Error(`${code}${e?.message || 'Error de conexión con el servicio de IA.'}${detail}`);
    }

    if (!textResponse) {
        throw new Error('La IA no devolvió datos legibles. Intenta con mejor iluminación.');
    }

    try {
        // Limpieza de bloques de código markdown si la IA los incluye
        const cleanJsonText = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '').replace(/^```/, '').replace(/```$/, '');
        const results: OcrResult[] = JSON.parse(cleanJsonText);
        return results.filter(r => r.id && r.id.trim() !== '' && r.weight && r.weight.trim() !== '');
    } catch (e) {
        console.error("Error parseo IA:", e);
        throw new Error("La IA no devolvió datos legibles. Intenta con mejor iluminación.");
    }
}

// --- COMPONENTE PRINCIPAL ---
export default function BatchImportPage({ onBack, onImportSuccess, importType }: BatchImportPageProps) {
    const { animals, weighings, bodyWeighings, fathers } = useData();
    
    const [status, setStatus] = useState<'capture' | 'loading' | 'error'>('capture');
    const [errorMessage, setErrorMessage] = useState('');
    const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
    
    // 1. Calcular Prefijos Válidos (Dinámico + Estático)
    const activePrefixes = useMemo(() => {
        const prefixes = new Set<string>();
        
        // A. Siempre permitir '0' (para animales como 0016)
        prefixes.add('0');

        // B. Iniciales de Animales Activos (Hijas de Quantum, Hijas de Atom, etc.)
        animals.forEach(a => {
            if (a.status === 'Activo' && a.id.length > 0) {
                const char = a.id.charAt(0).toUpperCase();
                // Solo agregar si es letra o si es número diferente a lo estándar (por seguridad)
                prefixes.add(char);
            }
        });

        // C. Iniciales de Padres de Referencia (Atom, Tabaco que quizás ya no están activos pero sus hijas sí)
        if (fathers) {
            fathers.forEach(f => prefixes.add(f.name.charAt(0).toUpperCase()));
        }

        // D. Asegurar que los VIP estén presentes
        KEY_SIRES.forEach(s => prefixes.add(s.char));

        return Array.from(prefixes);
    }, [animals, fathers]);


    // 2. Obtener Contexto de Sesión Anterior (Historial)
    const previousSessionContext = useMemo(() => {
        const sourceData = (importType === 'leche' ? weighings : bodyWeighings) as (Weighing[] | BodyWeighing[]);
        
        if (!sourceData || sourceData.length === 0) return { ids: [], date: null };

        // Buscar la última fecha registrada
        const uniqueDates = [...new Set(sourceData.map(w => w.date))];
        const sortedDates = uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        // Filtramos para que la fecha sea anterior a la seleccionada actualmente (por si editan fecha)
        const selectedTime = new Date(defaultDate + 'T00:00:00Z').getTime();
        const previousDate = sortedDates.find(d => new Date(d + 'T00:00:00Z').getTime() < selectedTime);
        
        if (!previousDate) return { ids: [], date: null };

        // Extraer los IDs de esa fecha
        const ids = sourceData
            .filter(w => w.date === previousDate)
            .map(w => (w as any).goatId || (w as any).animalId); // goatId para leche, animalId para kilos

        return { ids, date: previousDate };
            
    }, [defaultDate, weighings, bodyWeighings, importType]);


    // Manejador de selección de imagen
    const handleImageSelect = async (file: File) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const { data: base64Image, mimeType } = await toBase64(file);

            // Llamada a la IA con todo el contexto
            const newResults = await callGeminiVisionAPI(
                base64Image,
                mimeType,
                defaultDate,
                importType,
                activePrefixes,
                previousSessionContext.ids
            );

            if (newResults && newResults.length > 0) {
                onImportSuccess(newResults, defaultDate);
            } else {
                throw new Error('La IA no encontró registros válidos.');
            }

        } catch (error: any) {
            setErrorMessage(error.message || 'Error desconocido.');
            setStatus('error');
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center pt-8 px-4">
                <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors rounded-full hover:bg-c-surface-2">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-grow ml-2">
                    <h1 className="text-2xl font-bold text-c-text-strong">Escanear Cuaderno</h1>
                    <p className="text-sm text-c-text-muted">Digitalización Asistida ({importType === 'leche' ? 'Leche' : 'Corporal'})</p>
                </div>
            </header>

            {/* Configuración */}
            {status === 'capture' && (
                <div className="px-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-c-text-faint mb-2">
                            Fecha del Registro
                        </label>
                        <input
                        type="date"
                        value={defaultDate}
                        onChange={e => setDefaultDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full bg-c-surface-2 border border-c-border rounded-xl p-3 text-c-text focus:ring-2 focus:ring-c-accent-sky focus:outline-none"
                        />
                    </div>

                    {/* Feedback de Contexto Inteligente */}
                    {previousSessionContext.ids.length > 0 ? (
                         <div className="bg-c-accent-sky/10 border border-c-accent-sky/20 rounded-lg p-3 flex gap-3 items-start">
                            <Info className="w-5 h-5 text-c-accent-sky flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-c-text-strong">Contexto Activo</p>
                                <p className="text-xs text-c-text-muted mt-0.5">
                                    La IA usará el pesaje del <strong>{previousSessionContext.date}</strong> ({previousSessionContext.ids.length} animales) para corregir errores de lectura (ej. 0016 vs Q016).
                                </p>
                            </div>
                         </div>
                    ) : (
                        <div className="bg-c-surface-2 border border-c-border rounded-lg p-3 flex gap-3 items-start">
                             <Info className="w-5 h-5 text-c-text-faint flex-shrink-0 mt-0.5" />
                             <div>
                                <p className="text-sm font-semibold text-c-text">Sin Contexto Previo</p>
                                <p className="text-xs text-c-text-muted mt-0.5">
                                    No se detectó un pesaje inmediatamente anterior. La IA leerá los IDs tal cual están escritos.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Botones de Captura */}
            {status === 'capture' && (
                <div className="px-4 pb-8">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-c-text-faint mb-2">
                        Capturar
                    </label>
                    <CaptureView onImageSelect={handleImageSelect} />
                </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
                <div className="text-center py-20 animate-fade-in px-4">
                    <div className="bg-c-surface rounded-2xl p-8 border border-c-border">
                        <Loader className="w-12 h-12 text-c-accent-sky mx-auto animate-spin mb-4" />
                        <p className="text-lg font-medium text-c-text-strong">Analizando Hoja...</p>
                        <p className="text-sm text-c-text-muted mt-1">Identificando IDs y comparando con historial.</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {status === 'error' && (
                 <div className="px-4 animate-fade-in">
                     <div className="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-6 text-center">
                        <AlertTriangle className="w-10 h-10 text-brand-red mx-auto mb-4" />
                        <h2 className="text-base font-semibold text-c-text-strong mb-2">Error de Lectura</h2>
                        <p className="text-sm text-brand-red mb-6 break-words">{errorMessage}</p>
                        <button
                            onClick={() => setStatus('capture')}
                            className="w-full bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-medium py-3 px-4 rounded-xl transition-colors"
                        >
                            Intentar de Nuevo
                        </button>
                     </div>
                 </div>
            )}
        </div>
    );
}