import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Father } from '../../db/local';
import { AlertTriangle, Plus, Dna, Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal';
import { formatAnimalDisplay } from '../../utils/formatting';
import { Modal } from '../ui/Modal';

interface SireLotFormProps {
  onSave: (sireId: string) => Promise<void>;
  onCancel: () => void;
  seasonId: string;
  editingLot?: any; 
}

export const SireLotForm: React.FC<SireLotFormProps> = ({ 
    onSave, 
    onCancel, 
    editingLot
}) => {
  const { fathers, animals, addFather } = useData();
  
  const [sireId, setSireId] = useState('');
  const [selectedSireName, setSelectedSireName] = useState('');
  
  const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingLot && editingLot.sireId) {
        setSireId(editingLot.sireId);
        const sire = [...fathers, ...animals].find(a => a.id === editingLot.sireId);
        if (sire) setSelectedSireName(formatAnimalDisplay(sire));
    } else {
        setSireId('');
        setSelectedSireName('');
    }
  }, [editingLot, fathers, animals]);

  // --- FILTRO BLINDADO DE REPRODUCTORES ---
  const potentialSires = useMemo(() => {
      // 1. ANIMALES DEL REBAÑO (Internos)
      // Deben cumplir TODAS estas condiciones:
      const internalSires = animals.filter(a => 
          a.sex === 'Macho' && 
          a.status === 'Activo' &&          // Solo animales vivos y en finca
          !a.isReference &&                 // No referencia
          a.lifecycleStage === 'Reproductor' // ESTRICTO: Solo categoría Reproductor
      );
      
      // 2. PADRES EXTERNOS (Siempre disponibles para registro)
      const externalSires = fathers.map(f => ({ ...f, isExternal: true }));
      
      // Marcamos los internos para diferenciarlos visualmente
      const internalSiresMarked = internalSires.map(s => ({ ...s, isExternal: false }));

      // Unimos y ordenamos alfabéticamente
      return [...externalSires, ...internalSiresMarked].sort((a, b) => {
          const nameA = a.name || a.id;
          const nameB = b.name || b.id;
          return nameA.localeCompare(nameB);
      });
  }, [fathers, animals]);

  const filteredSires = useMemo(() => {
      if (!searchTerm) return potentialSires;
      const lowerTerm = searchTerm.toLowerCase();
      return potentialSires.filter(s => 
          (s.name && s.name.toLowerCase().includes(lowerTerm)) || 
          s.id.toLowerCase().includes(lowerTerm)
      );
  }, [potentialSires, searchTerm]);

  const handleSelectSire = (sire: any) => {
      setSireId(sire.id);
      setSelectedSireName(formatAnimalDisplay(sire));
      setIsSelectorOpen(false);
  };

  const handleSaveFather = async (newFather: Father) => {
    await addFather(newFather);
    setSireId(newFather.id);
    setSelectedSireName(formatAnimalDisplay(newFather));
    setIsFatherModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sireId) {
      setError('Debes seleccionar un semental.');
      return;
    }
    setIsLoading(true);

    try {
      await onSave(sireId);
    } catch (err) {
      setError('No se pudo guardar el lote.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        
        <div className="bg-c-surface-2/50 p-4 rounded-2xl border border-c-border-strong/50">
            <label className="block text-sm font-bold text-c-text-strong mb-3 flex items-center gap-2">
                <Dna size={16} className="text-c-accent-sky"/>
                Seleccionar Reproductor
            </label>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => !editingLot && setIsSelectorOpen(true)}
                    disabled={!!editingLot}
                    className={`flex-1 bg-c-surface-2 border border-c-border-strong rounded-xl py-4 px-4 text-left flex items-center justify-between transition-all ${!editingLot ? 'hover:border-c-accent-sky hover:bg-c-surface-3' : 'opacity-70 cursor-not-allowed'}`}
                >
                    {sireId ? (
                        <span className="font-bold text-c-text truncate">{selectedSireName}</span>
                    ) : (
                        <span className="text-c-text-faint italic">Toca para elegir...</span>
                    )}
                    <ChevronRight size={20} className="text-c-text-faint" />
                </button>

                {!editingLot && (
                    <button
                        type="button"
                        onClick={() => setIsFatherModalOpen(true)}
                        className="flex-shrink-0 p-4 bg-c-accent-sky/10 hover:bg-c-accent-sky/20 text-c-accent-sky border border-c-accent-sky/30 rounded-xl transition-colors active:scale-95"
                        title="Registrar Nuevo Padre Externo"
                    >
                        <Plus size={24} />
                    </button>
                )}
            </div>

             <p className="text-[10px] text-c-text-faint mt-2 px-1">
                Solo se muestran machos con categoría "Reproductor" (Activos) y padres externos.
            </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20 animate-shake">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 px-5 py-4 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !sireId}
            className="flex-1 px-5 py-4 bg-c-accent-sky hover:bg-c-accent-sky/90 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-c-accent-sky/20 transition-all active:scale-[0.98]"
          >
            {editingLot 
                ? (isLoading ? 'Actualizando...' : 'Guardar Cambios') 
                : (isLoading ? 'Creando...' : 'Crear Lote')
            }
          </button>
        </div>
      </form>

      {/* MODAL DE SELECCIÓN DE REPRODUCTOR */}
      <Modal isOpen={isSelectorOpen} onClose={() => setIsSelectorOpen(false)} title="Elegir Reproductor">
          <div className="space-y-4 h-[60vh] flex flex-col">
              {/* Buscador */}
              <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-c-text-faint" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-c-surface-2 border border-c-border-strong rounded-xl pl-10 pr-4 py-3 text-c-text focus:border-c-accent-sky outline-none"
                    autoFocus
                  />
              </div>

              {/* Lista Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredSires.length > 0 ? (
                      filteredSires.map(sire => (
                          <button
                            key={sire.id}
                            onClick={() => handleSelectSire(sire)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all group active:scale-95 ${
                                sireId === sire.id
                                    ? 'bg-c-accent-sky/20 border-c-accent-sky'
                                    : 'bg-c-surface-2/50 border-c-border hover:bg-c-surface-2'
                            }`}
                          >
                              <div className="flex items-center gap-3 overflow-hidden">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      (sire as any).isExternal
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : 'bg-c-accent-sky/20 text-c-accent-sky border border-c-accent-sky/30'
                                  }`}>
                                      {(sire as any).isExternal ? 'EXT' : 'INT'}
                                  </div>
                                  <div className="text-left min-w-0">
                                      <p className="font-bold text-c-text truncate text-sm">{formatAnimalDisplay(sire)}</p>
                                      <p className="text-[10px] text-c-text-faint font-mono">{sire.id}</p>
                                  </div>
                              </div>
                              {sireId === sire.id ? (
                                <CheckCircle2 size={20} className="text-c-accent-sky" />
                              ) : (
                                <ChevronRight size={18} className="text-c-text-faint group-hover:text-c-text" />
                              )}
                          </button>
                      ))
                  ) : (
                      <div className="text-center py-10 text-c-text-faint">
                          <Dna size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>No se encontraron reproductores activos.</p>
                          <p className="text-xs mt-1">Verifica que el animal tenga categoría "Reproductor".</p>
                      </div>
                  )}
              </div>
          </div>
      </Modal>

      {/* Modal para crear padre externo (si se requiere) */}
      <AddFatherModal 
        isOpen={isFatherModalOpen}
        onClose={() => setIsFatherModalOpen(false)}
        onSave={handleSaveFather}
      />
    </>
  );
};