import { X } from 'lucide-react';
import { AddAnimalForm } from '../components/forms/AddAnimalForm';

interface AddAnimalPageProps {
    onBack: () => void;
}

export default function AddAnimalPage({ onBack }: AddAnimalPageProps) {
    return (
        // Contenedor principal del modal: ocupa toda la pantalla, con fondo translúcido y blur
        <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col justify-end animate-fade-in"
            onClick={onBack} // Permite cerrar el modal al tocar fuera del contenido
        >
            {/* Contenedor del contenido que se desliza desde abajo */}
            <div 
                className="bg-ios-modal-bg w-full max-w-4xl mx-auto h-[95vh] rounded-t-2xl flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()} // Evita que el modal se cierre al tocar dentro
            >
                {/* Encabezado del Modal */}
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-brand-border">
                    <div className="w-10"></div> {/* Espaciador para centrar el título */}
                    <h1 className="text-xl font-bold tracking-tight text-white">Ingresar Nuevo Animal</h1>
                    <button 
                        onClick={onBack} 
                        className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={24} />
                    </button>
                </header>

                {/* Área de contenido con scroll */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="max-w-2xl mx-auto">
                        <AddAnimalForm 
                            onSaveSuccess={onBack}
                            onCancel={onBack}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}