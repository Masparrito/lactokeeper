import { ArrowLeft } from 'lucide-react';
import { AddAnimalForm } from '../components/forms/AddAnimalForm';

// La página ahora es un simple "contenedor"

interface AddAnimalPageProps {
    onBack: () => void;
}

export default function AddAnimalPage({ onBack }: AddAnimalPageProps) {
    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
            <header className="flex items-center pt-8 pb-4 px-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Ingresar Animal</h1>
                    {/* El subtítulo se manejará dentro del propio formulario */}
                </div>
                <div className="w-8"></div>
            </header>
            
            {/* Aquí renderizamos nuestro nuevo componente de formulario.
              Le pasamos la función 'onBack' para que, tanto al guardar con éxito
              como al cancelar, la app regrese a la pantalla anterior.
            */}
            <AddAnimalForm 
                onSaveSuccess={onBack}
                onCancel={onBack}
            />
        </div>
    );
}