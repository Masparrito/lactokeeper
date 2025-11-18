// src/pages/BatchImportPage.tsx 
// (CORREGIDO: Resuelve TS6133 eliminando 'appConfig' no utilizado)

import React, { useRef, useState, useMemo } from 'react';
import { ArrowLeft, Camera, FileImage, Loader, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Weighing, BodyWeighing } from '../db/local';

export interface OcrResult {
    id: string;
    weight: string; 
    date?: string; 
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); 
    reader.onerror = error => reject(error);
});

interface BatchImportPageProps {
    onBack: () => void;
    onImportSuccess: (results: OcrResult[], defaultDate: string) => void;
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

// --- (CORREGIDO) 'appConfig' eliminado de los parámetros de la función ---
async function callGeminiVisionAPI(
    base64Image: string, 
    defaultDateISO: string, 
    importType: 'leche' | 'corporal',
    // appConfig: any, // <-- ELIMINADO
    sirePrefixes: string[],
    previousSessionData: OcrResult[] 
): Promise<OcrResult[]> {
    
    const [year, month, day] = defaultDateISO.split('-');
    const defaultDate = `${day}/${month}/${year.slice(2)}`; 
    const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY; 
    if (!apiKey) throw new Error("API Key de Gemini (VITE_GOOGLE_GEMINI_API_KEY) no encontrada.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // --- Lógica de Prompt Dinámico ---
    let prompt = '';
    
    const previousAnimalsList = previousSessionData.map(r => `${r.id} (peso anterior: ${r.weight} Kg)`).join(', ');

    if (importType === 'corporal') {
        const contextoPrevio = previousSessionData.length > 0 
            ? `Estás analizando el pesaje de la semana del ${defaultDate}. Los animales de la semana pasada fueron: [${previousAnimalsList}]. Esta página debería tener los mismos.`
            : `Estás analizando un nuevo pesaje de la semana del ${defaultDate}.`;

        prompt = `
            Eres un asistente de entrada de datos para GanaderoOS, registrando PESOS CORPORALES.
            ${contextoPrevio}
            Tu trabajo es encontrar el ID de cada animal y su NUEVO PESO TOTAL.

            Reglas Importantes:
            1.  El ID del animal es alfanumérico (ej. "A451", "Q107"). Prefijos comunes: [${sirePrefixes.join(', ')}]. Usa este contexto para corregir IDs mal leídos (ej. "0107" -> "Q107").
            2.  Al lado del ID, busca el NUEVO PESO TOTAL (un número grande, ej. "23.90", "19.90", "9.60").
            3.  (REGLA CRÍTICA) IGNORA COMPLETAMENTE los números pequeños con signos + o - que están a la derecha (ej. "-0.9", "-1.7", "+0.2"). Estos son deltas de referencia y NO deben ser capturados.
            4.  IGNORA CUALQUIER FILA que parezca un total (ej. "TOTAL", "SUMA").
            5.  IGNORA CUALQUIER TEXTO escrito a mano como "Destete" o "destetada".
            6.  La fecha global por defecto es ${defaultDate}. Si una fila tiene su propia fecha, úsala.
            7.  Devuelve SOLAMENTE un array JSON válido, sin markdown, con lo que ves en ESTA PÁGINA:
                [{ "id": "A451", "weight": "23.90" }, { "id": "A453", "weight": "19.90" }, { "id": "V537", "weight": "9.60" }, ...]
            
            Si no puedes extraer nada, devuelve un array vacío [].
        `;
    
    } else {
        // --- PROMPT INTELIGENTE 3: Leche ---
        prompt = `
            Eres un asistente de entrada de datos para GanaderoOS, registrando PESAJES DE LECHE.
            Extrae todos los registros de ID de animal y su PESO DE LECHE.
            
            Reglas Importantes:
            1.  El ID del animal es alfanumérico (ej. "A303", "Q107"). Limpia espacios. "A 303" debe ser "A303".
            2.  El PESO DE LECHE es un número decimal PEQUEÑO, usualmente MENOR a 4.0 Kg (ej. "1.00", "0.60", "2.1").
            3.  IGNORA CUALQUIER NÚMERO GRANDE (ej. "20.5", "30", "41.2") ya que son pesos corporales, NO de leche.
            4.  La fecha global por defecto es ${defaultDate} (DD/MM/YY).
            5.  Si una fila tiene su propia fecha (ej. "16/10"), esa fecha ANULA la fecha global.
            6.  Si una fila no tiene fecha, usa la fecha global por defecto: ${defaultDate}.
            7.  IGNORA CUALQUIER FILA que parezca un total (ej. "TOTAL", "SUMA").
            8.  Devuelve SOLAMENTE un array JSON válido, sin markdown:
                [{ "id": "A303", "weight": "1.00", "date": "16/10" }, { "id": "Q107", "weight": "0.60", "date": "${defaultDate}" }, ...]
            
            Si no puedes extraer nada, devuelve un array vacío [].
        `;
    }
    
    // --- Fin de la Lógica de Prompt ---

    const body = { contents: [{ parts: [{ "text": prompt }, { "inlineData": { "mimeType": "image/jpeg", "data": base64Image } }] }] };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en la API de Gemini:", errorData);
        throw new Error(errorData.error?.message || 'Error en la API de Gemini.');
    }

    const data = await response.json();
    try {
        const textResponse = data.candidates[0].content.parts[0].text;
        const cleanJsonText = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
        const results: OcrResult[] = JSON.parse(cleanJsonText);
        return results.filter(r => r.id && r.id.trim() !== '' && r.weight && r.weight.trim() !== '');
    } catch (e) {
        console.error("Error al parsear JSON de Gemini:", e, data);
        throw new Error("La IA devolvió una respuesta inesperada. Intenta de nuevo.");
    }
}


export default function BatchImportPage({ onBack, onImportSuccess, importType }: BatchImportPageProps) {
    // (CORREGIDO) 'appConfig' eliminado de la desestructuración
    const { /* appConfig, */ animals, fathers, bodyWeighings, weighings } = useData();
    
    const [status, setStatus] = useState<'capture' | 'loading' | 'error'>('capture');
    const [errorMessage, setErrorMessage] = useState('');
    const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
    
    const sirePrefixes = useMemo(() => {
        const activeSires = animals
            .filter(a => a.sex === 'Macho' && a.status === 'Activo')
            .map(a => a.name ? a.name.charAt(0).toUpperCase() : a.id.charAt(0).toUpperCase());
        
        const fatherRefs = fathers.map(f => f.name.charAt(0).toUpperCase());
        
        return [...new Set([...activeSires, ...fatherRefs])];
    }, [animals, fathers]);

    const previousSessionData = useMemo(() => {
        const allSessionData = (importType === 'leche' ? weighings : bodyWeighings) as (Weighing[] | BodyWeighing[]);
        if (!allSessionData || allSessionData.length === 0) return [];

        const allDates = [...new Set(allSessionData.map(w => w.date))];
        const sortedDates = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        const selectedTime = new Date(defaultDate + 'T00:00:00Z').getTime();
        
        const previousDate = sortedDates.find(d => new Date(d + 'T00:00:00Z').getTime() < selectedTime);
        
        if (!previousDate) return []; 

        return allSessionData
            .filter(w => w.date === previousDate)
            .map(w => ({
                id: (w as any).goatId || (w as any).animalId,
                weight: w.kg.toString(),
                date: w.date
            }));
            
    }, [defaultDate, bodyWeighings, weighings, importType]);

    const handleImageSelect = async (file: File) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const base64Image = await toBase64(file);
            // (CORREGIDO) 'appConfig' eliminado de la llamada
            const newResults = await callGeminiVisionAPI(
                base64Image, 
                defaultDate, 
                importType, 
                // appConfig, // <-- ELIMINADO
                sirePrefixes,
                previousSessionData
            );

            if (newResults && newResults.length > 0) {
                onImportSuccess(newResults, defaultDate);
            } else {
                throw new Error('La IA no pudo encontrar ningún registro de peso en esta página.');
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
                    <p className="text-xl text-zinc-400">Digitalización Asistida ({importType === 'leche' ? 'Leche' : 'Corporal'})</p>
                </div>
                <div className="w-8"></div>
            </header>
            
            {status === 'capture' && (
                <div className="px-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Fecha Global del Pesaje
                    </label>
                    <input
                      type="date"
                      value={defaultDate}
                      onChange={e => setDefaultDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
                    />
                     {previousSessionData.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">
                            Se usará el contexto de la sesión del {previousSessionData[0].date} para mejorar la precisión.
                        </p>
                    )}
                </div>
            )}

            {status === 'capture' && <CaptureView onImageSelect={handleImageSelect} />}
            
            {status === 'loading' && (
                <div className="text-center py-20 animate-fade-in">
                    <Loader className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
                    <p className="mt-4 text-zinc-400">Analizando con contexto...</p>
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