import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useData } from '../../../context/DataContext';

const escala = [
    { n: 1, label: 'SANO', cls: 'bg-emerald-600' },
    { n: 2, label: 'BUENO', cls: 'bg-green-600' },
    { n: 3, label: 'ALERTA', cls: 'bg-yellow-600' },
    { n: 4, label: 'ANEMIA', cls: 'bg-orange-600' },
    { n: 5, label: 'GRAVE', cls: 'bg-red-600' },
];

export function FamachaMorePage() {
    const { famachaRevs } = useData();

    const totalRevisiones = famachaRevs.length;
    const animalesConRev = useMemo(() => new Set(famachaRevs.map(r => r.animalId)).size, [famachaRevs]);

    const exportarCSV = () => {
        const header = ['arete', 'fecha', 'famacha', 'accion', 'dosis', 'producto', 'dispositivo'];
        const esc = (v: any) => {
            const s = String(v ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = famachaRevs
            .slice()
            .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.arete.localeCompare(b.arete)))
            .map(r => [r.arete, r.fecha, r.score, r.accion, r.dosis ? 'sí' : 'no', r.producto || '', r.dispositivo || ''].map(esc).join(','));
        const csv = '﻿' + [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `famacha_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            {/* Datos / respaldo */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4">
                <h2 className="font-semibold text-white mb-1">Datos y respaldo</h2>
                <p className="text-xs text-zinc-400 mb-3">
                    {totalRevisiones} revisión(es) en {animalesConRev} animal(es). Tus datos se sincronizan
                    automáticamente con la nube; aquí puedes exportar una copia.
                </p>
                <button
                    onClick={exportarCSV}
                    disabled={totalRevisiones === 0}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl"
                >
                    <Download size={18} /> Exportar a CSV
                </button>
            </div>

            {/* Escala Famacha (referencia) */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4">
                <h3 className="font-semibold text-white mb-3">Escala Famacha (referencia)</h3>
                <div className="flex rounded-lg overflow-hidden">
                    {escala.map(e => (
                        <div key={e.n} className={`flex-1 ${e.cls} py-2 text-center`}>
                            <div className="text-white font-bold">{e.n}</div>
                            <div className="text-white/90 text-[10px] font-semibold">{e.label}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                    Mira la mucosa del párpado inferior. 1 = roja sana · 5 = blanca, grave.
                    Se trata a partir de 3.
                </p>
            </div>
        </div>
    );
}
