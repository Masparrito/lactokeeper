// src/components/ui/FormGroup.tsx
// Componentes genéricos de UI extraídos de RebanoProfilePage

import React from 'react';

export const FormGroup: React.FC<{ title: string, children: React.ReactNode, headerAccessory?: React.ReactNode }> = ({ title, children, headerAccessory }) => (
    <div className="bg-brand-glass rounded-2xl border border-brand-border overflow-hidden">
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
            <h2 className="text-zinc-400 font-semibold text-sm uppercase tracking-wide">{title}</h2>
            {headerAccessory && (
                <div className="-mt-2 -mr-2">
                    {headerAccessory}
                </div>
            )}
        </div>
        <div className="space-y-4 p-4 pt-2">
            {children}
        </div>
    </div>
);

export const InfoRow: React.FC<{ label: string, value?: React.ReactNode, children?: React.ReactNode, className?: string, isEditing?: boolean, title?: string }> = ({ label, value, children, className = '', isEditing, title }) => (
    <div className={className} title={title}>
        <dt className="text-sm font-medium text-zinc-400">{label}</dt>
        {isEditing ? (
            <div className="mt-1">{children}</div>
        ) : (
            <dd className="mt-1 text-base font-semibold text-white truncate">{value || 'N/A'}</dd>
        )}
    </div>
);