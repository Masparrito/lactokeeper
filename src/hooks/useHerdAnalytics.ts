// src/hooks/useHerdAnalytics.ts (Corregido y Unificado)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { DEFAULT_CONFIG } from '../types/config'; 
// (NUEVO) Importar la lógica centralizada
import { calculateAgeInDays, getAnimalZootecnicCategory } from '../utils/calculations'; 
import { Animal } from '../db/local';

// Helper para calcular edad en meses
const calculateAgeInMonths = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 0;
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
};

export const useHerdAnalytics = () => {
    const { animals, parturitions, bodyWeighings, sireLots, breedingSeasons, weighings, appConfig } = useData();

    const analytics = useMemo(() => {
        const config = { ...DEFAULT_CONFIG, ...appConfig };
        
        const activeAnimals = animals.filter(a => !a.isReference && a.status === 'Activo');

        const allFemales = activeAnimals.filter(a => a.sex === 'Hembra');
        const totalHembras = allFemales.length;

        // --- (INICIO CORRECCIÓN) Tarea 8.2 / Punto 1: Unificación de Lógica ---
        
        const categories = {
            cabras: [] as Animal[],
            cabritonas: [] as Animal[],
            cabritas: [] as Animal[],
            cabritos: [] as Animal[],
            machosLevante: [] as Animal[],
            reproductores: [] as Animal[],
        };

        // (OPTIMIZACIÓN) Pre-calcular partos por animal
        // Esto es necesario para 'getAnimalZootecnicCategory' si no queremos pasar 'parturitions' cada vez
        // PERO la función central ya acepta 'parturitions', así que es más simple
        // filtrar los partos una vez.

        activeAnimals.forEach(animal => {
            // (CORREGIDO) Usar la fuente de verdad centralizada
            const category = getAnimalZootecnicCategory(animal, parturitions, config);

            switch(category) {
                case 'Cabra': categories.cabras.push(animal); break;
                case 'Cabritona': categories.cabritonas.push(animal); break;
                case 'Cabrita': categories.cabritas.push(animal); break;
                case 'Cabrito': categories.cabritos.push(animal); break;
                case 'Macho de Levante': categories.machosLevante.push(animal); break;
                case 'Reproductor': categories.reproductores.push(animal); break;
            }
        });
        
        // --- (FIN CORRECCIÓN) ---

        
        // --- (INICIO NUEVA LÓGICA DE VIENTRES) ---
        // Vientres = Todas las Cabras + Cabritonas que superen la edad mínima
        
        const { edadMinimaVientreMeses } = config;

        const vientresCabras = categories.cabras.length;
        
        const vientresCabritonas = categories.cabritonas.filter(hembra => {
            const ageInMonths = calculateAgeInMonths(hembra.birthDate);
            // La edad mínima configurable (default 10) define un vientre
            return ageInMonths >= edadMinimaVientreMeses;
        }).length;

        const totalVientres = vientresCabras + vientresCabritonas;
        // --- (FIN NUEVA LÓGICA DE VIENTRES) ---

        
        // --- Analítica de Hembras Adultas ---
        const enProduccion = parturitions.filter(p => p.status === 'activa' && categories.cabras.some(c => c.id === p.goatId)).length;
        const secas = categories.cabras.length - enProduccion;
        const preñadas = categories.cabras.filter(a => a.reproductiveStatus === 'Preñada').length;
        const vacias = categories.cabras.filter(a => a.reproductiveStatus === 'Vacía' || a.reproductiveStatus === 'Post-Parto').length;
        const enMonta = categories.cabras.filter(a => a.reproductiveStatus === 'En Servicio').length;

        const cabrasReproductiveStatusData = [
            { name: 'Preñadas', value: preñadas, color: '#34C759' },
            { name: 'Vacías', value: vacias, color: '#FF9500' },
            { name: 'En Monta', value: enMonta, color: '#007AFF' },
        ].filter(item => item.value > 0);
        
        const currentYear = new Date().getFullYear();
        const milkingPercentageData: { name: string; 'En Ordeño (%)': number }[] = [];

        for (let i = 0; i < 2; i++) {
            const startDate = new Date(currentYear, i * 6, 1);
            const endDate = new Date(currentYear, (i + 1) * 6, 0);
            
            const relevantWeighings = weighings.filter(w => {
                const weighingDate = new Date(w.date + 'T00:00:00');
                return weighingDate >= startDate && weighingDate <= endDate;
            });

            const uniqueMilkingAnimals = new Set(relevantWeighings.map(w => w.goatId));
            const totalCabrasInPeriod = categories.cabras.filter(c => {
                const lastParturition = parturitions.find(p => p.goatId === c.id && new Date(p.parturitionDate) <= endDate);
                return !!lastParturition;
            }).length;

            const percentage = totalCabrasInPeriod > 0 ? (uniqueMilkingAnimals.size / totalCabrasInPeriod) * 100 : 0;
            milkingPercentageData.push({
                name: `Semestre ${i + 1}`,
                'En Ordeño (%)': parseFloat(percentage.toFixed(1)),
            });
        }

        // --- Analítica de Cabritonas ---
        const serviceWeight = config.pesoPrimerServicioKg;
        const serviceWeightThreshold = serviceWeight * 0.95; 
        
        const cabritonasEnMonta = categories.cabritonas.filter(c => c.reproductiveStatus === 'En Servicio').length;
        const proximasAServicio = categories.cabritonas.filter(c => {
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (!lastWeight) return false;
            
            return (lastWeight.kg >= serviceWeightThreshold && lastWeight.kg < serviceWeight) || 
                   (lastWeight.kg >= serviceWeight && c.reproductiveStatus !== 'En Servicio' && c.reproductiveStatus !== 'Preñada');
        }).length;
        const cabritonasDisponibles = categories.cabritonas.length - cabritonasEnMonta;

        // --- Analítica para Crías ---
        const criasHembras = categories.cabritas.length;
        const criasMachos = categories.cabritos.length;
        const totalCrias = criasHembras + criasMachos;

        const criasEnMaternidadData = [
            { name: 'Hembras', value: criasHembras, color: '#FF2D55' },
            { name: 'Machos', value: criasMachos, color: '#007AFF' },
        ].filter(item => item.value > 0);

        const { 
            diasAlertaPesarDestete, 
            pesoMinimoPesarDestete, 
            diasMetaDesteteFinal, 
            pesoMinimoDesteteFinal 
        } = config;

        const desteteConditions = [...categories.cabritas, ...categories.cabritos].map(cria => {
            const age = calculateAgeInDays(cria.birthDate);
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === cria.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const weight = lastWeight?.kg || 0;

            const isReadyByAge = age >= diasMetaDesteteFinal;
            const isReadyByWeight = weight >= pesoMinimoDesteteFinal;

            if (isReadyByAge && isReadyByWeight) {
                return { id: cria.id, status: 'Listo para Destete' };
            }

            const isNearByAge = age >= diasAlertaPesarDestete;
            const isNearByWeight = weight >= pesoMinimoPesarDestete;

            if (isNearByAge || isNearByWeight) {
                 return { id: cria.id, status: 'Próximo a Destete' };
            }

            return { id: cria.id, status: 'Amamantando' };
        });

        const listasParaDesteteCount = desteteConditions.filter(d => d.status === 'Listo para Destete').length;
        const proximasADesteteCount = desteteConditions.filter(d => d.status === 'Próximo a Destete').length;
        const amamantandoCount = desteteConditions.filter(d => d.status === 'Amamantando').length;
        
        const desteteStatusData = [
            { name: 'Listo', value: listasParaDesteteCount, color: '#34C759' },
            { name: 'Próximo', value: proximasADesteteCount, color: '#FF9F0A' },
            { name: 'Amamantando', value: amamantandoCount, color: '#007AFF' },
        ].filter(item => item.value > 0);

        // --- Analítica para Reproductores ---
        const activeSeasonIds = new Set(breedingSeasons.filter(s => s.status === 'Activo').map(s => s.id));
        const activeSireLots = sireLots.filter(sl => activeSeasonIds.has(sl.seasonId));
        
        const activeSires = categories.reproductores.filter(r => activeSireLots.some(sl => sl.sireId === r.id))
            .map(sire => {
                const lot = activeSireLots.find(sl => sl.sireId === sire.id)!;
                // (CORREGIDO TS2551)
                const assignedFemales = animals.filter(a => a.sireLotId === lot.id && a.status === 'Activo').length;
                return { ...sire, lotId: lot.id, assignedFemales };
            });

        // --- Objeto de retorno final ---
        return {
            totalPoblacion: activeAnimals.length,
            totalHembras,
            totalVientres,
            cabras: {
                total: categories.cabras.length,
                enProduccion, secas, preñadas, vacias, enMonta,
                reproductiveStatusData: cabrasReproductiveStatusData,
                milkingPercentageData: milkingPercentageData,
            },
            cabritonas: {
                total: categories.cabritonas.length,
                enMonta: cabritonasEnMonta,
                disponibles: cabritonasDisponibles,
                proximasAServicio
            },
            crias: {
                total: totalCrias,
                hembras: criasHembras,
                machos: criasMachos,
                criasEnMaternidadData: criasEnMaternidadData,
                enFaseDestete: 0, 
                proximasADestete: proximasADesteteCount,
                listasParaDestete: listasParaDesteteCount,
                desteteStatusData: desteteStatusData,
            },
            reproductores: {
                total: categories.reproductores.length,
                activos: activeSires,
            }
        };
    }, [
        animals, 
        parturitions, 
        bodyWeighings, 
        sireLots, 
        breedingSeasons, 
        weighings, 
        appConfig // Depender de appConfig asegura que recalcule con los cambios
    ]);

    return analytics;
};