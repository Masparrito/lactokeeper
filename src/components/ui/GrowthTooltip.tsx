// src/components/ui/GrowthTooltip.tsx
// (NUEVO) Tooltip especializado para los gráficos de Crecimiento (Kilos)


export const GrowthTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        // --- Caso 1: Gráficos de Barras de Distribución (Dashboard / Análisis) ---
        // Tienen 'name' ('Pobre', 'Inferior', etc.) y 'count'
        if (data.name && data.count !== undefined) {
            const name = data.name;
            const value = payload[0].value; // Esto es 'count'
            // Determina la unidad: si el 'name' del Bar es "%", usa "%", si no, "animales"
            const unit = payload[0].name === '%' ? '%' : (value === 1 ? 'animal' : 'animales');

            return (
                <div className="bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-zinc-700 shadow-lg">
                    <p className="text-sm font-semibold text-white mb-1" style={{ color: data.fill }}>
                        {name}
                    </p>
                    <p className="text-lg font-bold text-white">
                        {value.toFixed(unit === '%' ? 1 : 0)}
                        <span className="text-sm text-zinc-400 ml-1">{unit}</span>
                    </p>
                </div>
            );
        }

        // --- Caso 2: Gráfico de Curva de Crecimiento (Perfil) ---
        // 'label' es la edad (Age)
        // 'payload' es un array [ {dataKey: 'M540', value: 20.5}, {dataKey: 'Meta', value: 18.0} ]
        if (label && (payload[0].dataKey === 'Meta' || payload.length > 1)) {
            return (
                <div className="bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-zinc-700 shadow-lg">
                    <p className="text-sm font-semibold text-white mb-2">Edad: {label.toFixed(0)} días</p>
                    <div className="space-y-1">
                        {payload.map((entry: any) => (
                            <div key={entry.dataKey} style={{ color: entry.color }} className="flex items-center justify-between gap-4">
                                <span className="text-sm">{entry.name}:</span>
                                <span className="text-sm font-bold">{entry.value ? entry.value.toFixed(2) + ' Kg' : 'N/A'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    }

    return null;
};