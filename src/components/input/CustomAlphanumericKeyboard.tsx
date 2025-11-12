// src/components/input/CustomAlphanumericKeyboard.tsx
// Teclado alfanumérico custom

import React from 'react';
import { Delete } from 'lucide-react';

interface CustomKeyboardProps {
    onClose: () => void;
    onInput: (value: string) => void;
    currentValue: string;
}

export const CustomAlphanumericKeyboard: React.FC<CustomKeyboardProps> = ({ onClose, onInput, currentValue }) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'DEL'];
    
    const handleKeyPress = (key: string) => {
        if (key === 'DEL') { handleDelete(); return; }
        if (key && currentValue.length < 15) { onInput(currentValue + key); }
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
                    {numpadKeys.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="h-12 bg-[#555555] text-white rounded-md text-xl font-medium active:bg-zinc-500 flex items-center justify-center">{key === 'DEL' ? <Delete size={20} /> : key}</button>)}
                </div>
                <button onClick={onClose} className="h-12 w-full bg-blue-600 text-white rounded-md text-lg font-semibold active:bg-blue-700">Done</button>
            </div>
        </div>
    );
};
