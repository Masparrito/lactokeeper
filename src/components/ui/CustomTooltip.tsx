// src/components/ui/CustomTooltip.tsx

export const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // La data del dashboard tiene un 'name', la del perfil no. Así lo diferenciamos.
        const isHerdChart = payload[0].payload.name === "Promedio Rebaño";
        const isGaussChart = 'range' in payload[0].payload;

        if (isGaussChart) {
            return (
                 <div className="bg-black/50 backdrop-blur-xl p-3 rounded-lg border border-brand-border text-white">
                    <p className="label text-brand-light-gray text-sm">Rango: {payload[0].payload.range} Kg</p>
                    <p className="font-bold text-base">Nº de Cabras: {payload[0].value}</p>
                </div>
            );
        }

        return (
            <div className="bg-black/50 backdrop-blur-xl p-3 rounded-lg border border-brand-border text-white">
                <p className="label text-brand-light-gray text-sm">
                    {isHerdChart ? `Días en Leche (DEL): ${label}` : `DEL: ${label}`}
                </p>
                <p className="font-bold text-base">
                    {isHerdChart ? `Promedio: ${payload[0].value.toFixed(2)} Kg` : `Producción: ${payload[0].value.toFixed(2)} Kg`}
                </p>
            </div>
        );
    }
    return null;
};