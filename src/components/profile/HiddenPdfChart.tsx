// src/components/profile/HiddenPdfChart.tsx
// Componente oculto para renderizar el gráfico de pedigrí para exportar a PDF

import React from 'react';
import { PedigreeNode } from '../../hooks/usePedigree';
import { PedigreeChart } from '../pedigree/PedigreeChart';

const HiddenPdfChart = React.forwardRef<HTMLDivElement, { rootNode: PedigreeNode | null }>(({ rootNode }, ref) => (
    <div
        ref={ref}
        style={{
            position: 'absolute',
            left: '-9999px',
            width: '1200px',
            padding: '20px',
            backgroundColor: '#FFFFFF',
            color: '#000000',
        }}
    >
        <PedigreeChart
            rootNode={rootNode}
            onAncestorClick={() => { }}
            theme="light"
        />
    </div>
));
HiddenPdfChart.displayName = 'HiddenPdfChart';

export { HiddenPdfChart };