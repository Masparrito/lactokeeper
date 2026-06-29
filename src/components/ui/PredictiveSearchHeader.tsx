import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface AnimalSuggestion {
    id: string;
    name?: string;
}

interface PredictiveSearchHeaderProps {
    title: string;
    subtitle: string;
    isSticky?: boolean;
    query: string;
    setQuery: (value: string) => void;
    suggestions: AnimalSuggestion[]; // calculadas por el padre a partir de `query`
    selectedIds: string[];           // chips (IDs ya seleccionados)
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
    onClearAll: () => void;
}

// Barra de búsqueda predecible con selección múltiple por chips.
// A medida que se escribe aparecen sugerencias; al elegir un animal se añade como
// chip (visible y removible) y la lista muestra las tarjetas seleccionadas.
export const PredictiveSearchHeader: React.FC<PredictiveSearchHeaderProps> = ({
    title, subtitle, isSticky, query, setQuery, suggestions, selectedIds, onAdd, onRemove, onClearAll,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const headerClasses = [
        'pt-4 pb-3 relative',
        isSticky ? 'sticky top-0 z-20 bg-c-bg/90 backdrop-blur-md border-b border-c-border px-4' : 'px-4',
    ].join(' ');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && query === '' && selectedIds.length > 0) {
            onRemove(selectedIds[selectedIds.length - 1]);
        } else if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            onAdd(suggestions[0].id);
        }
    };

    return (
        <header className={headerClasses}>
            <div className="text-center mb-3">
                <h1 className="text-2xl font-bold tracking-tight text-c-text">{title}</h1>
                <p className="text-md text-c-text-muted">{subtitle}</p>
            </div>

            <div className="relative">
                {/* Campo de tokens: chips + input */}
                <div
                    onClick={() => inputRef.current?.focus()}
                    className="flex flex-wrap items-center gap-1.5 bg-c-surface-2 rounded-xl px-3 py-2 border-2 border-transparent focus-within:border-c-accent transition-colors cursor-text"
                >
                    <Search size={18} className="text-c-text-faint shrink-0" />
                    {selectedIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 bg-c-accent/15 text-c-accent font-semibold text-sm rounded-lg pl-2 pr-1 py-0.5">
                            {id}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                                className="p-0.5 rounded-md hover:bg-c-accent/20"
                                aria-label={`Quitar ${id}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedIds.length > 0 ? 'Agregar otro…' : 'Buscar por ID o nombre…'}
                        className="flex-1 min-w-[90px] bg-transparent text-c-text placeholder-c-text-faint outline-none py-1"
                    />
                    {(query || selectedIds.length > 0) && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onClearAll(); }}
                            className="p-1 text-c-text-faint hover:text-c-text shrink-0"
                            aria-label="Limpiar búsqueda"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Lista predecible de sugerencias */}
                {query.trim() !== '' && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-c-surface border border-c-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
                        {suggestions.length > 0 ? (
                            suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => onAdd(s.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-c-surface-2 border-b border-c-border last:border-0 transition-colors"
                                >
                                    <span className="font-mono font-bold text-c-text">{s.id}</span>
                                    {s.name && <span className="text-sm text-c-text-muted truncate">{s.name}</span>}
                                </button>
                            ))
                        ) : (
                            <p className="px-3 py-3 text-sm text-c-text-faint text-center">Sin coincidencias para “{query}”.</p>
                        )}
                    </div>
                )}
            </div>

            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-xs text-c-text-muted">{selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}</span>
                    <button type="button" onClick={onClearAll} className="text-xs font-semibold text-c-accent-sky hover:underline">Limpiar selección</button>
                </div>
            )}
        </header>
    );
};
