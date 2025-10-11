// src/pages/AddParturitionPage.tsx

// --- CAMBIO CLAVE 1: Se importa el nuevo Modal unificado en lugar del formulario antiguo ---
import { ParturitionModal } from '../components/modals/ParturitionModal';


interface AddParturitionPageProps {
    onBack: () => void;
    motherId?: string;
}

export default function AddParturitionPage({ onBack, motherId = '' }: AddParturitionPageProps) {
    // --- CAMBIO CLAVE 2: La página ahora simplemente renderiza y controla el nuevo modal ---
    // Esto asegura que la experiencia sea la misma desde cualquier parte de la app.
    return (
        <ParturitionModal
            isOpen={true} // El modal está siempre abierto cuando esta página está activa
            onClose={onBack} // Al cerrar el modal, se ejecuta la función de volver atrás
            motherId={motherId}
        />
    );
}