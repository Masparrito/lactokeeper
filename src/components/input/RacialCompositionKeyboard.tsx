// src/components/input/RacialCompositionKeyboard.tsx
// Teclado custom para composición racial

import React from 'react';
import { Delete } from 'lucide-react';

interface RacialKeyboardProps {
    onClose: () => void;
    onInput: (value: string) => void;
    currentValue: string;
}

export const RacialCompositionKeyboard: React.FC<RacialKeyboardProps> = ({ onClose, onInput, currentValue }) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '%', '0', 'DEL'];
    const MAX_COMPONENTS = 4;

    const handleKeyPress = (key: string) => {
        if (key === 'DEL') { handleDelete(); return; }
        if (currentValue.length >= 30) return;
        
        const components = currentValue.split(' ').filter(c => c !== '');
        let isMidComponent = /[%A-Z]$/.test(currentValue);
        let isStartingNewComponent = currentValue === '' || currentValue.endsWith(' ');
        
        if (components.length >= MAX_COMPONENTS && isStartingNewComponent && /\d/.test(key)) { return; }
        
        let newValue = currentValue;
        
        if (isMidComponent && /\d/.test(key) ) { if (components.length < MAX_COMPONENTS) { newValue += ' '; } else { return; } }
        if (key === '%' && (!/\d$/.test(newValue.slice(-1)) && !/[A-Z]$/.test(newValue.slice(-1)))) return;
        if (key === '%' && /%$/.test(newValue)) return;
        if (/[A-Z]/.test(key) && !isStartingNewComponent && !/\d$/.test(newValue.slice(-1)) && !/%$/.test(newValue.slice(-1)) && !/[A-Z]$/.test(newValue.slice(-1))) return;
        if (/\d/.test(key) && /[A-Z]$/.test(newValue)) return;
        
        const currentNumPart = newValue.split(' ').pop()?.match(/\d+$/)?.[0] || '';
        if (key === '0' && (isStartingNewComponent || /[%A-Z ]$/.test(newValue.slice(-1))) && currentNumPart.length === 0) { /* Allow leading 0 */ }
        else if (key === '0' && currentNumPart === '0') { return; }
        else if (/\d/.test(key) && currentNumPart === '0') { newValue = newValue.slice(0, -1); }
        
        const potentialNumStr = (currentNumPart + key).match(/\d+/)?.[0];
        if (potentialNumStr && parseInt(potentialNumStr, 10) > 100) return;
        
        onInput(newValue + key);
    };

    const handleDelete = () => { onInput(currentValue.slice(0, -1)); };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose}>
            <div className="fixed bottom-0 left-0 right-0 w-full bg-[#333333] p-2 space-y-2" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}>
                <div className="flex flex-nowrap space-x-1.5 overflow-x-auto py-2 alphabet-scroller" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.alphabet-scroller::-webkit-scrollbar { display: none; }`}</style>
                    {alphabet.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="flex-shrink-0 w-10 h-10 bg-[#555555] text-white rounded-md text-lg font-medium active:bg-zinc-500">{key}</button>)}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {numpadKeys.map(key => <button key={key} onClick={() => handleKeyPress(key)} className={`h-12 bg-[#555555] text-white rounded-md text-xl font-medium active:bg-zinc-500 flex items-center justify-center ${key === '%' ? 'text-brand-orange' : ''}`}>{key === 'DEL' ? <Delete size={20} /> : key}</button>)}
                </div>
                <button onClick={onClose} className="h-12 w-full bg-blue-600 text-white rounded-md text-lg font-semibold active:bg-blue-700">Done</button>
            </div>
        </div>
    );
};
