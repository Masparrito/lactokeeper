import React, { useState } from 'react';
import { useKilosAnalytics, AnimalRowData } from '../../../hooks/useKilosAnalytics';
import { Printer, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KilosListViewProps {
    analytics: ReturnType<typeof useKilosAnalytics>;
}

export const KilosListView: React.FC<KilosListViewProps> = ({ analytics }) => {
    const { rows } = analytics;
    const [isExporting, setIsExporting] = useState(false);

    // Helper para colores de clasificación
    const getClassificationColor = (classification: AnimalRowData['classification']) => {
        switch (classification) {
            case 'Superior': return 'bg-brand-green/20 text-brand-green border-brand-green/30';
            case 'En Meta': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'Bajo Meta': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Alerta': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
            default: return 'bg-zinc-800 text-zinc-500 border-zinc-700';
        }
    };

    // --- MANEJO DE EXPORTACIÓN PDF ---
    const handleExportPDF = () => {
        setIsExporting(true);
        const doc = new jsPDF();

        const tableColumn = ["ID", "Nombre", "GDP (g/d)", "Peso Act.", "Destete", "90d", "180d", "270d", "Score", "Estado"];
        const tableRows = rows.map(row => [
            row.id,
            row.name,
            row.gdp.toFixed(0),
            row.currentWeight.toFixed(1),
            row.weaningWeight ? row.weaningWeight.toFixed(1) : '-',
            row.w90 ? row.w90.toFixed(1) : '-',
            row.w180 ? row.w180.toFixed(1) : '-',
            row.w270 ? row.w270.toFixed(1) : '-',
            row.score.toFixed(1),
            row.classification
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 24] }, 
            styles: { fontSize: 7, font: 'helvetica', halign: 'right' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' }, // ID
                1: { halign: 'left' }, // Nombre
                9: { fontStyle: 'bold' } // Estado
            }
        });

        const date = new Date().toLocaleDateString();
        doc.setFontSize(12);
        doc.text(`Reporte Detallado de Desarrollo - ${date}`, 14, 15);
        doc.save(`kilos_detalle_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExporting(false);
    };

    return (
        <div className="flex flex-col h-full bg-black">
            
            {/* Header de la Vista */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-black">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                        Listado Detallado
                    </span>
                    <span className="bg-zinc-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-zinc-700">
                        <Users size={10} />
                        N = {rows.length}
                    </span>
                </div>
                
                <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-zinc-700"
                >
                    {isExporting ? 'Generando...' : 'Exportar PDF'}
                    <Printer size={14} />
                </button>
            </div>

            {/* Contenedor de Tabla Scrollable */}
            <div className="flex-1 overflow-auto relative pb-20 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-900 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="sticky left-0 z-30 bg-zinc-900 p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 min-w-[120px]">
                                Animal
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                GDP (g/d)
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                Peso Act.
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                Destete
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                90d
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                180d
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap">
                                270d
                            </th>
                            <th className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right whitespace-nowrap pr-4">
                                Score / Estado
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {rows.map((row, index) => (
                            <tr 
                                key={row.id} 
                                className={`${index % 2 === 0 ? 'bg-black' : 'bg-[#0c0c0e]'} hover:bg-zinc-900 transition-colors group`}
                            >
                                {/* Columna Fija ID/Nombre */}
                                <td className={`sticky left-0 z-10 p-3 border-r border-zinc-800/50 ${index % 2 === 0 ? 'bg-black' : 'bg-[#0c0c0e] group-hover:bg-zinc-900'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white font-mono">{row.id}</span>
                                        {row.name && <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{row.name}</span>}
                                        <span className="text-[9px] text-brand-blue font-bold uppercase mt-0.5">{row.category}</span>
                                    </div>
                                </td>

                                {/* Datos Numéricos */}
                                <td className="p-3 text-right">
                                    <span className="font-mono text-sm font-bold text-zinc-300">{row.gdp > 0 ? row.gdp.toFixed(0) : '--'}</span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-mono text-sm font-bold text-white">
                                        {row.currentWeight > 0 ? row.currentWeight.toFixed(1) : '--'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className={`font-mono text-sm ${row.weaningWeight ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                        {row.weaningWeight ? row.weaningWeight.toFixed(1) : '--'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-mono text-sm text-zinc-500">
                                        {row.w90 ? row.w90.toFixed(1) : '--'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-mono text-sm text-zinc-500">
                                        {row.w180 ? row.w180.toFixed(1) : '--'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-mono text-sm text-zinc-500">
                                        {row.w270 ? row.w270.toFixed(1) : '--'}
                                    </span>
                                </td>
                                <td className="p-3 text-right pr-4">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassificationColor(row.classification)}`}>
                                            {row.classification}
                                        </span>
                                        {row.score > 0 && (
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                {row.score.toFixed(1)} pts
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {rows.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                        <span className="text-sm">No hay datos para mostrar con estos filtros.</span>
                    </div>
                )}
            </div>
        </div>
    );
};