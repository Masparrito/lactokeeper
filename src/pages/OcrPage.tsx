import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, FileImage, Loader, AlertTriangle, FileText } from 'lucide-react';

// --- NUEVO: Función para convertir el archivo a Base64 ---
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Quitamos el prefijo 'data:image/jpeg;base64,'
    reader.onerror = error => reject(error);
});

interface OcrPageProps {
    onBack: () => void;
}

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

export default function OcrPage({ onBack }: OcrPageProps) {
    const [status, setStatus] = useState<'capture' | 'loading' | 'verification' | 'error'>('capture');
    const [errorMessage, setErrorMessage] = useState('');
    const [detectedText, setDetectedText] = useState(''); // Estado para guardar el texto

    const handleImageSelect = async (file: File) => {
        setStatus('loading');
        setErrorMessage('');
        setDetectedText('');

        try {
            const base64Image = await toBase64(file);
            const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
            const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

            const body = {
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'TEXT_DETECTION' }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Error en la API de Google Vision.');
            }

            const data = await response.json();
            const text = data.responses[0]?.fullTextAnnotation?.text;

            if (text) {
                setDetectedText(text);
                setStatus('verification'); // Cambiamos a la vista de verificación
            } else {
                throw new Error('No se pudo detectar texto en la imagen. Intenta con una foto más clara.');
            }

        } catch (error: any) {
            setErrorMessage(error.message || 'Ocurrió un error inesperado.');
            setStatus('error');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            <header className="flex items-center pt-8 pb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Escanear Cuaderno</h1>
                    <p className="text-xl text-zinc-400">Digitalización Asistida</p>
                </div>
                <div className="w-8"></div>
            </header>

            {status === 'capture' && <CaptureView onImageSelect={handleImageSelect} />}
            
            {status === 'loading' && (
                <div className="text-center py-20 animate-fade-in">
                    <Loader className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
                    <p className="mt-4 text-zinc-400">Analizando imagen con IA...</p>
                </div>
            )}
            
            {/* --- NUEVA VISTA PARA VERIFICAR EL TEXTO --- */}
            {status === 'verification' && (
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in space-y-4">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase tracking-wider border-b border-brand-border pb-2">
                        <FileText />
                        <span>Texto Reconocido</span>
                    </div>
                    <textarea
                        readOnly
                        value={detectedText}
                        className="w-full h-48 bg-black/20 text-white p-3 rounded-lg border border-zinc-700"
                    />
                    <p className="text-xs text-zinc-500 text-center">
                        Funcionalidad de autocompletado de pesajes próximamente.
                    </p>
                    <button onClick={() => setStatus('capture')} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg">
                        Escanear Otra Imagen
                    </button>
                </div>
            )}

            {status === 'error' && (
                 <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-6 text-center animate-fade-in">
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