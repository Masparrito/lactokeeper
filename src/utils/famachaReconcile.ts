// Cotejo (reconciliación) entre el inventario de Famacha y la base de GanaderoOS.
// SOLO LECTURA: estas funciones no modifican ningún dato; solo comparan listas.

import type { Animal } from '../db/local';
import type { FamachaInventoryItem } from '../pages/modules/famacha/famachaInventory';

// Clave exacta: mayúsculas, sin espacios. Conserva ceros a la izquierda y todos
// los caracteres (un "0005" NO es lo mismo que un "5" para un match exacto).
export const normKey = (s: string): string =>
  (s ?? '').toString().trim().toUpperCase().replace(/\s+/g, '');

// Clave "suelta" para SUGERENCIAS de posibles coincidencias (no para confirmar):
// quita no-alfanuméricos y ceros a la izquierda.
const looseKey = (s: string): string =>
  normKey(s).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

// Firma de caracteres: mismos caracteres en cualquier orden (detecta
// transposiciones tipo "711Q" vs "Q711").
const charSig = (s: string): string =>
  normKey(s).replace(/[^A-Z0-9]/g, '').split('').sort().join('');

export interface ReconcileResult {
  // Famacha que existe en GanaderoOS y está ACTIVO
  enAmbosActivos: { fam: FamachaInventoryItem; animal: Animal }[];
  // Famacha que existe en GanaderoOS pero está dado de baja (Venta/Muerte/Descarte/otro)
  enFamachaPeroBaja: { fam: FamachaInventoryItem; animal: Animal }[];
  // Famacha que NO existe en GanaderoOS (faltan), con posibles coincidencias por formato
  soloFamacha: { fam: FamachaInventoryItem; sugerencias: Animal[] }[];
  // Activos de GanaderoOS que NO están en Famacha (los que "sobran" respecto a Famacha)
  soloGanaderoActivos: Animal[];
  // Conteos generales
  totals: {
    famacha: number;
    ganaderoTotal: number;
    ganaderoActivos: number;
    ganaderoBaja: number;
    ganaderoReferencia: number;
  };
}

export function reconcile(
  famacha: FamachaInventoryItem[],
  animals: Animal[]
): ReconcileResult {
  const reales = animals.filter(a => !a.isReference);
  const referencia = animals.length - reales.length;

  // Índices de GanaderoOS por clave exacta
  const byExact = new Map<string, Animal>();
  for (const a of reales) {
    const k = normKey(a.id);
    if (!byExact.has(k)) byExact.set(k, a);
  }

  const isActivo = (a: Animal) => a.status === 'Activo';

  const enAmbosActivos: ReconcileResult['enAmbosActivos'] = [];
  const enFamachaPeroBaja: ReconcileResult['enFamachaPeroBaja'] = [];
  const soloFamacha: ReconcileResult['soloFamacha'] = [];

  const matchedGanaderoKeys = new Set<string>();

  for (const fam of famacha) {
    const k = normKey(fam.arete);
    const animal = byExact.get(k);
    if (animal) {
      matchedGanaderoKeys.add(k);
      if (isActivo(animal)) enAmbosActivos.push({ fam, animal });
      else enFamachaPeroBaja.push({ fam, animal });
    } else {
      // Buscar sugerencias por clave suelta / firma de caracteres
      const lk = looseKey(fam.arete);
      const cs = charSig(fam.arete);
      const sugerencias = reales.filter(a => {
        const al = looseKey(a.id);
        return al === lk || charSig(a.id) === cs;
      });
      soloFamacha.push({ fam, sugerencias });
    }
  }

  const famExactSet = new Set(famacha.map(f => normKey(f.arete)));
  const soloGanaderoActivos = reales
    .filter(a => isActivo(a) && !famExactSet.has(normKey(a.id)))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return {
    enAmbosActivos,
    enFamachaPeroBaja,
    soloFamacha,
    soloGanaderoActivos,
    totals: {
      famacha: famacha.length,
      ganaderoTotal: reales.length,
      ganaderoActivos: reales.filter(isActivo).length,
      ganaderoBaja: reales.filter(a => !isActivo(a)).length,
      ganaderoReferencia: referencia,
    },
  };
}
