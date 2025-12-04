import { useState } from 'react';
import { X, Save, UserPlus, Dna, Hash, Type } from 'lucide-react';
import { Animal } from '../../db/local';

interface AddQuickParentModalProps {
    type: 'mother' | 'father';
    onClose: () => void;
    onSave: (newParent: Animal) => void;
}

export const AddQuickParentModal = ({ type, onClose, onSave }: AddQuickParentModalProps) => {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    
    // Configuración dinámica según el tipo (Padre/Madre)
    const isFather = type === 'father';
    const title = isFather ? 'Nuevo Padre' : 'Nueva Madre';
    const role = isFather ? 'Semental' : 'Matriz';
    const sex = isFather ? 'Macho' : 'Hembra';
    
    // Estilos dinámicos
    const theme = isFather 
        ? { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'focus:ring-blue-500', borderFocus: 'focus:border-blue-500', btn: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-[0_4px_20px_rgba(37,99,235,0.3)]' }
        : { text: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', ring: 'focus:ring-pink-500', borderFocus: 'focus:border-pink-500', btn: 'bg-pink-600 hover:bg-pink-500 active:bg-pink-700 shadow-[0_4px_20px_rgba(219,39,119,0.3)]' };

    const handleSave = () => {
        if (!id.trim()) {
            // Idealmente usar una notificación toast, aquí un alert simple por ahora
            alert('El ID es obligatorio');
            return;
        }

        const newParent: Animal = {
            id: id.trim().toUpperCase(),
            name: name.trim().toUpperCase(),
            sex: sex,
            birthDate: 'N/A', // Fecha desconocida para padres rápidos
            status: 'Activo',
            isReference: true, // CRÍTICO: Es solo referencia genética
            lifecycleStage: 'Reproductor', 
            location: 'Referencia',
            reproductiveStatus: 'No Aplica',
            createdAt: Date.now(),
            lastWeighing: null,
            _synced: false
        };

        onSave(newParent);
    };

    return (
        // 1. OVERLAY (Estructura Base)
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            
            {/* 2. TARJETA MODAL */}
            <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-6 shadow-2xl transform transition-all pb-10 sm:pb-6">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <UserPlus className={theme.text} />
                            {title}
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Crea una referencia rápida para el linaje.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Info Box */}
                <div className={`${theme.bg} border ${theme.border} p-4 rounded-xl flex gap-3 items-start`}>
                    <Dna className={`${theme.text} shrink-0 mt-0.5`} size={18} />
                    <p className={`text-xs ${isFather ? 'text-blue-200/80' : 'text-pink-200/80'} leading-relaxed`}>
                        Se guardará como <strong>Referencia Externa</strong>. No afectará tus inventarios activos, pero permitirá completar el árbol genealógico.
                    </p>
                </div>

                <div className="space-y-5">
                    {/* Input ID */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">ID del {role}</label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="text" 
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="Ej: P001"
                                autoFocus
                                className={`w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white ${theme.borderFocus} ${theme.ring} focus:ring-1 outline-none transition-all text-lg font-mono uppercase placeholder:text-zinc-700`}
                            />
                        </div>
                    </div>

                    {/* Input Nombre */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nombre (Opcional)</label>
                        <div className="relative">
                            <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Sansón"
                                className={`w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white ${theme.borderFocus} ${theme.ring} focus:ring-1 outline-none transition-all text-lg placeholder:text-zinc-700 capitalize`}
                            />
                        </div>
                    </div>
                </div>

                {/* Botón de Acción */}
                <div className="pt-2">
                    <button 
                        onClick={handleSave}
                        className={`w-full ${theme.btn} text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base`}
                    >
                        <Save size={20} />
                        Guardar {role}
                    </button>
                </div>
            </div>
        </div>
    );
};