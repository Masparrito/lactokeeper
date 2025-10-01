import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchHeaderProps {
    title: string;
    subtitle: string;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({ title, subtitle, searchTerm, setSearchTerm }) => {
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchVisible) {
            inputRef.current?.focus();
        }
    }, [isSearchVisible]);
    
    const handleClear = () => {
        setSearchTerm('');
        setIsSearchVisible(false);
    };

    return (
        <header className="text-center pt-4 pb-4 relative overflow-hidden">
            {/* Títulos */}
            <div className={`transition-transform duration-300 ${isSearchVisible ? '-translate-y-20' : 'translate-y-0'}`}>
                <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
                <p className="text-md text-zinc-400">{subtitle}</p>
            </div>

            {/* Barra de Búsqueda */}
            <div className={`absolute inset-0 transition-transform duration-300 flex items-center pt-2 ${isSearchVisible ? 'translate-y-0' : 'translate-y-20'}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por ID..."
                    className="w-full bg-zinc-800 text-white text-lg placeholder-zinc-500 p-3 rounded-xl border-2 border-transparent focus:border-amber-500 focus:ring-0 focus:outline-none"
                />
            </div>

            {/* Botón para activar/limpiar la búsqueda */}
            <div className="absolute top-4 right-0 pt-1">
                <button 
                    onClick={isSearchVisible ? handleClear : () => setIsSearchVisible(true)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    {isSearchVisible ? <X size={22} /> : <Search size={22} />}
                </button>
            </div>
        </header>
    );
};