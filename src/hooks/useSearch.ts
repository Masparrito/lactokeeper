// src/hooks/useSearch.ts

import { useState, useMemo } from 'react';

export const useSearch = <T,>(
    items: T[],
    searchKeys: (keyof T)[]
) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) {
            return items;
        }
        return items.filter(item => {
            return searchKeys.some(key => {
                const value = item[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
                }
                return false;
            });
        });
    }, [items, searchTerm, searchKeys]);

    return { searchTerm, setSearchTerm, filteredItems };
};