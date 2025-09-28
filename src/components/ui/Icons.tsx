// Este archivo centraliza todos nuestros íconos personalizados de alta calidad.
// Al crearlos como componentes SVG, tenemos control total sobre su peso,
// tamaño y apariencia, logrando la nitidez que buscamos.

// Un componente base para asegurar que todos los íconos tengan el mismo tamaño y contenedor.
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-7 h-7 flex items-center justify-center">{children}</div>
);

// Un componente genérico para renderizar el SVG con las propiedades deseadas.
const IconSVG = ({ paths, strokeWidth = 1.75 }: { paths: string[], strokeWidth?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);

// --- Iconos Específicos de la App ---

export const DropletIcon = () => <IconWrapper><IconSVG paths={["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"]} /></IconWrapper>;

export const GoatIcon = () => <IconWrapper><IconSVG paths={["M16 16.33V14c0-2.2-1.8-4-4-4s-4 1.8-4 4v2.33", "M17.54 13.54C19.07 15.07 20 17.15 20 19.33V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-.67c0-2.18.93-4.26 2.46-5.79", "M12 10V4", "M12 2v2", "M7 5h.01", "M17 5h.01"]} /></IconWrapper>;

export const BarChartIcon = () => <IconWrapper><IconSVG paths={["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"]} strokeWidth={2} /></IconWrapper>;

export const PlusCircleIcon = () => <IconWrapper><IconSVG paths={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 8v8", "M8 12h8"]} strokeWidth={2} /></IconWrapper>;