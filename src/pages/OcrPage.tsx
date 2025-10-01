import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, FileImage, Loader, AlertTriangle } from 'lucide-react';

interface OcrPageProps {
    onBack: () => void;
}

// Vista inicial para que el usuario elija cómo proporcionar la imagen
const CaptureView = ({ onImageSelect }: { onImageSelect: (file: File) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageSelect(file);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
             <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                // En móviles, 'capture="environment"' abre la cámara trasera directamente
                onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'environment');
                    // CORRECCIÓN: 'fileInputLef' ha sido corregido a 'fileInputRef'
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
    
    const handleImageSelect = (_file: File) => {
        // Por ahora, simularemos un error para ver la UI.
        // En el futuro, aquí irá la llamada a la API de Google.
        setStatus('loading');
        setTimeout(() => {
            setErrorMessage("La función de análisis por IA estará disponible próximamente.");
            setStatus('error');
        }, 2000);
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
                    <p className="mt-4 text-zinc-400">Analizando imagen...</p>
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