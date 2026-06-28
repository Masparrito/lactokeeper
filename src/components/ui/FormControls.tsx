// src/components/ui/FormControls.tsx
// Componentes genéricos de formularios extraídos de RebanoProfilePage

import React from 'react';
import { ChevronDown } from 'lucide-react';

export const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-c-surface-2 border border-c-border-strong rounded-lg p-2.5 text-c-text placeholder-c-text-faint focus:outline-none focus:ring-2 focus:ring-c-accent disabled:opacity-50 disabled:bg-c-surface-2/50 ${className}`}
    />
));
FormInput.displayName = 'FormInput';

export const FormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ children, ...props }, ref) => (
    <div className="relative w-full">
        <select
            ref={ref}
            {...props}
            className="w-full bg-c-surface-2 border border-c-border-strong rounded-lg p-2.5 text-c-text appearance-none focus:outline-none focus:ring-2 focus:ring-c-accent"
        >
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-c-text-faint pointer-events-none" />
    </div>
));
FormSelect.displayName = 'FormSelect';

export const Toggle = ({ labelOn, labelOff, value, onChange }: { labelOn: string, labelOff: string, value: boolean, onChange: (newValue: boolean) => void }) => (
    <div onClick={() => onChange(!value)} className="w-full bg-c-surface-2 rounded-xl p-1 flex cursor-pointer">
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${value ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>{labelOn}</span>
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${!value ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}>{labelOff}</span>
    </div>
);