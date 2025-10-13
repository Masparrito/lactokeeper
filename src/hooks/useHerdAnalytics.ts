// src/hooks/useHerdAnalytics.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory, calculateAgeInDays } from '../utils/calculations';

export const useHerdAnalytics = () => {
    const { animals, parturitions, bodyWeighings, sireLots, breedingSeasons, weighings } = useData();

    const analytics = useMemo(() => {
        const activeAnimals = animals.filter(a => !a.isReference);

        const categories = {
            cabras: [] as any[],
            cabritonas: [] as any[],
            cabritas: [] as any[],
            cabritos: [] as any[],
            machosLevante: [] as any[],
            reproductores: [] as any[],
        };

        activeAnimals.forEach(animal => {
            const category = getAnimalZootecnicCategory(animal, parturitions);
            switch(category) {
                case 'Cabra': categories.cabras.push(animal); break;
                case 'Cabritona': categories.cabritonas.push(animal); break;
                case 'Cabrita': categories.cabritas.push(animal); break;
                case 'Cabrito': categories.cabritos.push(animal); break;
                case 'Macho de Levante': categories.machosLevante.push(animal); break;
                case 'Macho Cabrío': categories.reproductores.push(animal); break;
            }
        });

        // --- LÍNEA CORREGIDA ---
        // Se añade `categories.cabritas.length` para incluir a todas las hembras en el conteo de vientres.
        const totalVientres = categories.cabras.length + categories.cabritonas.length + categories.cabritas.length;

        // Analítica para Hembras Adultas
        const enProduccion = parturitions.filter(p => p.status === 'activa' && categories.cabras.some(c => c.id === p.goatId)).length;
        const secas = categories.cabras.length - enProduccion;
        const preñadas = categories.cabras.filter(a => a.reproductiveStatus === 'Preñada').length;
        const vacias = categories.cabras.filter(a => a.reproductiveStatus === 'Vacía' || a.reproductiveStatus === 'Post-Parto' || a.reproductiveStatus === 'Destetada').length;
        const enMonta = categories.cabras.filter(a => a.reproductiveStatus === 'En Servicio').length;

        const cabrasReproductiveStatusData = [
            { name: 'Preñadas', value: preñadas, color: '#34C759' },
            { name: 'Vacías', value: vacias, color: '#FF9500' },
            { name: 'En Monta', value: enMonta, color: '#007AFF' },
        ].filter(item => item.value > 0);
        
        // Cálculo del porcentaje de animales en ordeño durante el año (cortes semestrales)
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

        // Analítica para Cabritonas
        const cabritonasEnMonta = categories.cabritonas.filter(c => c.reproductiveStatus === 'En Servicio').length;
        const proximasAServicio = categories.cabritonas.filter(c => {
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (!lastWeight) return false;
            return (lastWeight.kg >= 28.5 && lastWeight.kg < 30) || (lastWeight.kg >= 30 && c.reproductiveStatus !== 'En Servicio' && c.reproductiveStatus !== 'Preñada');
        }).length;
        const cabritonasDisponibles = categories.cabritonas.length - cabritonasEnMonta - preñadas;

        // Analítica para Crías
        const criasHembras = categories.cabritas.length;
        const criasMachos = categories.cabritos.length;
        const totalCrias = criasHembras + criasMachos;

        const criasEnMaternidadData = [
            { name: 'Hembras', value: criasHembras, color: '#FF2D55' },
            { name: 'Machos', value: criasMachos, color: '#007AFF' },
        ].filter(item => item.value > 0);

        const desteteConditions = [...categories.cabritas, ...categories.cabritos].map(cria => {
            const age = calculateAgeInDays(cria.birthDate);
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === cria.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const weight = lastWeight?.kg || 0;

            const isReadyByAge = age >= 52;
            const isReadyByWeight = weight >= 9.5;

            const inDestetePhase = age >= 45 && age < 52;
            const closeToDesteteCriteria = (age >= 40 && age < 45) || (weight >= 8.5 && weight < 9.5);

            let status = 'Amamantando';
            if (isReadyByAge && isReadyByWeight) {
                status = 'Listo para Destete';
            } else if (inDestetePhase) {
                status = 'En Fase Destete';
            } else if (closeToDesteteCriteria) {
                status = 'Próximo a Destete';
            }
            return { id: cria.id, status };
        });

        const enFaseDesteteCount = desteteConditions.filter(d => d.status === 'En Fase Destete').length;
        const proximasADesteteCount = desteteConditions.filter(d => d.status === 'Próximo a Destete').length;
        const listasParaDesteteCount = desteteConditions.filter(d => d.status === 'Listo para Destete').length;
        const amamantandoCount = desteteConditions.filter(d => d.status === 'Amamantando').length;


        const desteteStatusData = [
            { name: 'Listo', value: listasParaDesteteCount, color: '#34C759' },
            { name: 'En Fase', value: enFaseDesteteCount, color: '#FFD60A' },
            { name: 'Próximo', value: proximasADesteteCount, color: '#FF9F0A' },
            { name: 'Amamantando', value: amamantandoCount, color: '#007AFF' },
        ].filter(item => item.value > 0);

        // Analítica para Reproductores
        const activeSeasonIds = new Set(breedingSeasons.filter(s => s.status === 'Activo').map(s => s.id));
        const activeSireLots = sireLots.filter(sl => activeSeasonIds.has(sl.seasonId));
        const activeSires = categories.reproductores.filter(r => activeSireLots.some(sl => sl.sireId === r.id))
            .map(sire => {
                const lot = activeSireLots.find(sl => sl.sireId === sire.id)!;
                const assignedFemales = animals.filter(a => a.sireLotId === lot.id).length;
                return { ...sire, lotId: lot.id, assignedFemales };
            });

        return {
            totalPoblacion: activeAnimals.length,
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
                enFaseDestete: enFaseDesteteCount,
                proximasADestete: proximasADesteteCount,
                listasParaDestete: listasParaDesteteCount,
                desteteStatusData: desteteStatusData,
            },
            reproductores: {
                total: categories.reproductores.length,
                activos: activeSires,
            }
        };
    }, [animals, parturitions, bodyWeighings, sireLots, breedingSeasons, weighings]);

    return analytics;
};