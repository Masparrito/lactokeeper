import { useState } from 'react';
import { useData } from '../context/DataContext';
import { PlusCircle, ScanLine, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

// --- Sub-componente: Formulario de Entrada Manual ---
// Mantiene el código organizado y limpio dentro de la nueva estética.
const ManualEntryForm = ({ onBack }: { onBack: () => void }) => {
  const { addWeighing } = useData();
  const [goatId, setGoatId] = useState('');
  const [kg, setKg] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goatId || !kg) {
      setMessage({ type: 'error', text: 'El ID y los Kg son obligatorios.' });
      return;
    }
    try {
      await addWeighing({ goatId: goatId.toUpperCase().trim(), kg: parseFloat(kg) });
      setMessage({ type: 'success', text: `Pesaje para ${goatId.toUpperCase().trim()} añadido.` });
      setGoatId('');
      setKg('');
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudo guardar el pesaje.' });
      console.error(err);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
      <div className="flex items-center border-b border-brand-border pb-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-brand-light-gray hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-sm font-semibold text-brand-medium-gray uppercase tracking-wider mx-auto pr-8">
          Entrada Manual
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={goatId}
          onChange={(e) => setGoatId(e.target.value)}
          placeholder="ID del Animal"
          className="w-full bg-black/20 text-white text-lg placeholder-brand-medium-gray p-4 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none transition-colors"
        />
        <input
          type="number"
          step="0.01"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="Producción en Kg"
          className="w-full bg-black/20 text-white text-lg placeholder-brand-medium-gray p-4 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none transition-colors"
        />
        <button type="submit" className="w-full bg-brand-amber hover:bg-yellow-500 text-black font-bold py-4 px-4 rounded-xl transition-colors text-lg">
          Guardar Pesaje
        </button>
        {message && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
      </form>
    </div>
  );
};


// --- Página Principal de Captura de Datos ---
export default function AddDataPage() {
  const [entryMode, setEntryMode] = useState<'options' | 'manual' | 'ocr'>('options');

  // Pequeña animación para la reaparición de los botones
  const keyForAnimation = entryMode === 'options' ? 'options' : 'form';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <header className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Añadir Datos</h1>
        <p className="text-xl text-brand-medium-gray">Captura de Producción</p>
      </header>

      <div key={keyForAnimation}>
        {entryMode === 'options' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setEntryMode('ocr')} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-amber text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
              <ScanLine className="w-12 h-12 mb-2 text-brand-amber" />
              <span className="text-lg font-semibold">Escanear Cuaderno</span>
              <span className="text-sm font-normal text-brand-medium-gray">La forma más rápida (Próximamente)</span>
            </button>
            <button onClick={() => setEntryMode('manual')} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-gray-500 text-white font-bold p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
              <PlusCircle className="w-12 h-12 mb-2" />
              <span className="text-lg font-semibold">Entrada Manual</span>
              <span className="text-sm font-normal text-brand-medium-gray">Para registros individuales</span>
            </button>
          </div>
        )}

        {entryMode === 'manual' && <ManualEntryForm onBack={() => setEntryMode('options')} />}
        
        {entryMode === 'ocr' && (
           <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border text-center animate-fade-in">
              <h2 className="text-lg text-brand-amber">Función Próximamente</h2>
              <p className="text-gray-400">La captura de datos por OCR estará disponible en una futura actualización.</p>
               <button onClick={() => setEntryMode('options')} className="w-full text-center text-gray-400 mt-4 text-sm hover:text-white">
                  Volver
              </button>
           </div>
        )}
      </div>
    </div>
  );
}

