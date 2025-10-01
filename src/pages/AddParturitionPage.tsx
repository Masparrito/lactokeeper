import { ArrowLeft } from 'lucide-react';
import { AddParturitionForm } from '../components/forms/AddParturitionForm';

// La página ahora es mucho más simple.
interface AddParturitionPageProps {
    onBack: () => void;
    motherId?: string;
}

export default function AddParturitionPage({ onBack, motherId = '' }: AddParturitionPageProps) {
    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
            <header className="flex items-center pt-8 pb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Registrar Parto</h1>
                    <p className="text-xl text-zinc-400">Y sus crías</p>
                </div>
                <div className="w-8"></div>
            </header>

            {/* Aquí simplemente renderizamos el formulario reutilizable.
              Cuando el guardado sea exitoso, llamará a onBack para volver a la página anterior.
            */}
            <AddParturitionForm 
                motherId={motherId}
                onSaveSuccess={onBack} 
            />
        </div>
    );
}