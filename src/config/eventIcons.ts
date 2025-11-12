// src/config/eventIcons.ts
// Mapeo centralizado de tipos de eventos a sus iconos y colores
// CORREGIDO: Eliminadas importaciones de iconos no usados

import React from 'react';
import {
    Scale, Syringe, CheckCircle,
    HeartPulse, Milk, FileText, Feather,
    HeartCrack, Archive, Award, Baby,
    Move, Tag,
} from 'lucide-react'; // Droplets, AlertTriangle, y Ban eliminados

// --- Mapeo de iconos para eventos ---
export const EVENT_ICONS: Record<string, { icon: React.ElementType, color: string }> = {
    'Nacimiento': { icon: Feather, color: 'bg-green-500/20 text-brand-green' },
    'Registro Manual': { icon: FileText, color: 'bg-blue-500/20 text-brand-blue' },
    'Parto': { icon: Baby, color: 'bg-pink-500/20 text-pink-400' },
    'Aborto': { icon: HeartCrack, color: 'bg-yellow-500/20 text-yellow-400' },
    'Aborto / Mortinato': { icon: HeartCrack, color: 'bg-red-500/20 text-brand-red' },
    'Parto con Mortinato': { icon: Baby, color: 'bg-pink-300/20 text-pink-300' },
    'Movimiento': { icon: Move, color: 'bg-blue-500/20 text-brand-blue' },
    'Cambio de Estado': { icon: Tag, color: 'bg-purple-500/20 text-purple-400' },
    'Pesaje Lechero': { icon: Milk, color: 'bg-gray-500/20 text-gray-300' },
    'Hito de Peso': { icon: Scale, color: 'bg-green-500/20 text-brand-green' },
    'Servicio Visto': { icon: HeartPulse, color: 'bg-pink-500/20 text-pink-400' },
    'Tratamiento': { icon: Syringe, color: 'bg-red-500/20 text-brand-red' },
    'Diagnóstico': { icon: CheckCircle, color: 'bg-teal-500/20 text-teal-300' },
    'Destete': { icon: Award, color: 'bg-yellow-500/20 text-yellow-400' },
    'Baja de Rebaño': { icon: Archive, color: 'bg-red-500/20 text-brand-red' },
    // Añade otros iconos que puedas necesitar
    'Default': { icon: FileText, color: 'bg-gray-500/20 text-gray-300' },
};
