// src/pages/BatchImportPage.tsx (CORREGIDO)
// (Anteriormente OcrPage.tsx)

import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, FileImage, Loader, AlertTriangle } from 'lucide-react';

// (NUEVO) Esta será la estructura de salida de la IA
export interface OcrResult {
    id: string;
    weight: string;
    // La fecha es opcional; si no se detecta, usaremos la fecha por defecto
    date?: string; 
}

// --- Función para convertir el archivo a Base64 (SIN CAMBIOS) ---
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Quitamos el prefijo
    reader.onerror = error => reject(error);
});

// (CORREGIDO) La interfaz de props AHORA incluye 'importType'
interface BatchImportPageProps {
    onBack: () => void;
    onImportSuccess: (results: OcrResult[], defaultDate: string) => void;
    // (CORREGIDO) Tipos cambiados a español
    importType: 'leche' | 'corporal'; 
}

// --- Vista de Captura (SIN CAMBIOS) ---
const CaptureView = ({ onImageSelect }: { onImageSelect: (file: File) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) onImageSelect(event.target.files[0]);
    };
    return (
        <div className="space-y-4 animate-fade-in">
             <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
            <button
                onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'environment');
                    fileInputRef.current?.click();
                }}
                className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-blue-400 text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
                <Camera className="w-12 h-12 mb-2 text-blue-400" />
                <span className="text-lg font-semibold">Tomar Foto</span>
                <span className="text-sm font-normal text-zinc-400">Usa la cámara para escanear</span>
            </button>
            <button
                onClick={() => {
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                }}
                className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-green-400 text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105"
            >
                <FileImage className="w-12 h-12 mb-2 text-green-400" />
                <span className="text-lg font-semibold">Seleccionar Archivo</span>
                <span className="text-sm font-normal text-zinc-400">Elige una foto de tu galería</span>
            </button>
        </div>
    );
};

// --- (NUEVO) Función de llamada a Gemini Vision ---
async function callGeminiVisionAPI(base64Image: string, defaultDateISO: string): Promise<OcrResult[]> {
    
    // Convertir la fecha ISO (ej. 2024-12-12) a un formato legible (ej. 12-12-24)
    const [year, month, day] = defaultDateISO.split('-');
    const defaultDate = `${day}/${month}/${year.slice(2)}`; // ej. "12/12/24"

    const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY; // Necesitarás una API Key de Gemini
    if (!apiKey) {
        throw new Error("API Key de Gemini (VITE_GOOGLE_GEMINI_API_KEY) no encontrada.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

    const prompt = `
        Eres un asistente de entrada de datos para GanaderoOS. Analiza la imagen de esta libreta de pesaje.
        Extrae todos los registros de ID de animal y su peso.
        
        Reglas:
        1.  El ID del animal es alfanumérico (ej. "A 303", "Q107", "N 312"). Asegúrate de limpiar espacios. "A 303" debe ser "A303".
        2.  El peso es un número decimal (ej. "1.00", "0.60").
        3.  La fecha global por defecto para esta imagen es ${defaultDate} (formato DD/MM/YY).
        4.  Si una fila tiene su propia fecha (ej. "16/10" al lado de "A 303"), esa fecha ANULA la fecha global. Usa esa fecha en su lugar.
        5.  Si una fila no tiene fecha, usa la fecha global por defecto.
        6.  Ignora cualquier fila que no tenga un peso numérico (ej. "—").
        7.  Ignora cualquier texto que no sea un registro (ej. "Servicio", "Total", "Caney 1", "la 1726 se la llevo Jesús").
        8.  Devuelve SOLAMENTE un array JSON válido, sin markdown \`\`\`json \`\`\`, que siga esta estructura:
            [{ "id": "A303", "weight": "1.00", "date": "16/10/24" }, { "id": "Q107", "weight": null, "date": "12/12/24" }, ...]
        
        Si no puedes extraer nada, devuelve un array vacío [].
    `;

    const body = {
        contents: [
            {
                parts: [
                    { "text": prompt },
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": base64Image
                        }
                    }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en la API de Gemini:", errorData);
        throw new Error(errorData.error?.message || 'Error en la API de Gemini.');
    }

    const data = await response.json();
    
    try {
        const textResponse = data.candidates[0].content.parts[0].text;
        // Limpiar markdown si la IA lo añade por error
        const cleanJsonText = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
        const results: OcrResult[] = JSON.parse(cleanJsonText);
        
        // Filtrar pesos nulos (que la IA pudo haber incluido)
        return results.filter(r => r.weight);

    } catch (e) {
        console.error("Error al parsear JSON de Gemini:", e, data);
        throw new Error("La IA devolvió una respuesta inesperada. Intenta de nuevo.");
    }
}


export default function BatchImportPage({ onBack, onImportSuccess, importType }: BatchImportPageProps) {
    const [status, setStatus] = useState<'capture' | 'loading' | 'error'>('capture');
    const [errorMessage, setErrorMessage] = useState('');
    const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);

    const handleImageSelect = async (file: File) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const base64Image = await toBase64(file);
            const results = await callGeminiVisionAPI(base64Image, defaultDate);

            if (results && results.length > 0) {
                onImportSuccess(results, defaultDate);
            } else {
                throw new Error('La IA no pudo encontrar ningún registro de peso en la imagen.');
            }

        } catch (error: any) {
            setErrorMessage(error.message || 'Ocurrió un error inesperado.');
            setStatus('error');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            <header className="flex items-center pt-8 pb-4 px-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Escanear Cuaderno</h1>
                    {/* (CORREGIDO) Mostrar el tipo en español */}
                    <p className="text-xl text-zinc-400">Digitalización Asistida ({importType === 'leche' ? 'Leche' : 'Corporal'})</p>
                </div>
                <div className="w-8"></div>
            </header>
            
            {status === 'capture' && (
                <div className="px-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Fecha Global (si no está en la hoja)
                    </label>
                    <input
                      type="date"
                      value={defaultDate}
                      onChange={e => setDefaultDate(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
                    />
                </div>
            )}

            {status === 'capture' && <CaptureView onImageSelect={handleImageSelect} />}
            
            {status === 'loading' && (
                <div className="text-center py-20 animate-fade-in">
                    <Loader className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
                    <p className="mt-4 text-zinc-400">Analizando imagen con IA...</p>
                    <p className="text-sm text-zinc-500">Esto puede tardar unos segundos...</p>
                </div>
            )}
            
            {status === 'error' && (
                 <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-6 text-center animate-fade-in mx-4">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">Ocurrió un Error</h2>
                    <p className="text-red-300">{errorMessage}</p>
                     <button onClick={() => setStatus('capture')} className="mt-6 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg">
                        Intentar de Nuevo
                    </button>
                 </div>
            )}
        </div>
    );
}