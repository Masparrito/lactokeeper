// src/components/ui/FormControls.tsx
// Componentes genéricos de formularios extraídos de RebanoProfilePage

import React from 'react';
import { ChevronDown } from 'lucide-react';

export const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50 disabled:bg-brand-dark/50 ${className}`}
    />
));
FormInput.displayName = 'FormInput';

export const FormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ children, ...props }, ref) => (
    <div className="relative w-full">
        <select
            ref={ref}
            {...props}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
    </div>
));
FormSelect.displayName = 'FormSelect';

export const Toggle = ({ labelOn, labelOff, value, onChange }: { labelOn: string, labelOff: string, value: boolean, onChange: (newValue: boolean) => void }) => (
    <div onClick={() => onChange(!value)} className="w-full bg-brand-dark rounded-xl p-1 flex cursor-pointer">
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOn}</span>
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${!value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOff}</span>
    </div>
);