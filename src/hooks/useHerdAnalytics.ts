import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory, calculateAgeInDays } from '../utils/calculations';

export const useHerdAnalytics = () => {
    const { animals, parturitions, bodyWeighings, sireLots, breedingSeasons, weighings, appConfig } = useData();

    const analytics = useMemo(() => {
        const activeAnimals = animals.filter(a => !a.isReference);

        const allFemales = activeAnimals.filter(a => a.sex === 'Hembra');
        const totalHembras = allFemales.length;

        // --- Lógica de Vientres (Corregida y estable) ---
        
        const edadVientreMeses = appConfig.edadPrimerServicioMeses > 0 ? appConfig.edadPrimerServicioMeses : 11;
        const pesoVientreKg = appConfig.pesoPrimerServicioKg > 0 ? appConfig.pesoPrimerServicioKg : 30;
        const edadVientreDias = edadVientreMeses * 30.44;

        const totalVientres = allFemales.filter(hembra => {
            const category = getAnimalZootecnicCategory(hembra, parturitions);
            if (category === 'Cabra') return true;
            if (category === 'Cabrita') return false;
            if (category === 'Cabritona') {
                const ageInDays = calculateAgeInDays(hembra.birthDate);
                if (ageInDays < edadVientreDias) return false;
                if (pesoVientreKg > 0) {
                    const lastWeight = bodyWeighings
                        .filter(bw => bw.animalId === hembra.id)
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    if (!lastWeight || lastWeight.kg < pesoVientreKg) return false;
                }
                return true;
            }
            return false;
        }).length;
        
        // --- Categorías (Estable) ---
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
                case 'Reproductor': categories.reproductores.push(animal); break;
            }
        });

        // --- Analítica de Hembras Adultas (Estable) ---
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

        // --- Analítica de Cabritonas (Estable) ---
        const serviceWeight = appConfig.pesoPrimerServicioKg || 30;
        const serviceWeightThreshold = serviceWeight * 0.95; 
        
        const cabritonasEnMonta = categories.cabritonas.filter(c => c.reproductiveStatus === 'En Servicio').length;
        const proximasAServicio = categories.cabritonas.filter(c => {
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (!lastWeight) return false;
            
            return (lastWeight.kg >= serviceWeightThreshold && lastWeight.kg < serviceWeight) || 
                   (lastWeight.kg >= serviceWeight && c.reproductiveStatus !== 'En Servicio' && c.reproductiveStatus !== 'Preñada');
        }).length;
        const cabritonasDisponibles = categories.cabritonas.length - cabritonasEnMonta - preñadas;

        // --- Analítica para Crías (Estable) ---
        const criasHembras = categories.cabritas.length;
        const criasMachos = categories.cabritos.length;
        const totalCrias = criasHembras + criasMachos;

        const criasEnMaternidadData = [
            { name: 'Hembras', value: criasHembras, color: '#FF2D55' },
            { name: 'Machos', value: criasMachos, color: '#007AFF' },
        ].filter(item => item.value > 0);

        // --- (INICIO) CORRECCIÓN LÓGICA DE DESTETE ---
        // Se usan las nuevas variables de AppConfig
        const { 
            diasAlertaPesarDestete, 
            pesoMinimoPesarDestete, 
            diasMetaDesteteFinal, 
            pesoMinimoDesteteFinal 
        } = appConfig;

        const desteteConditions = [...categories.cabritas, ...categories.cabritos].map(cria => {
            const age = calculateAgeInDays(cria.birthDate);
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === cria.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const weight = lastWeight?.kg || 0;

            // Criterio 1: ¿Está LISTO? (Usa las variables FINALES)
            const isReadyByAge = age >= diasMetaDesteteFinal;
            const isReadyByWeight = weight >= pesoMinimoDesteteFinal;

            if (isReadyByAge && isReadyByWeight) {
                return { id: cria.id, status: 'Listo para Destete' };
            }

            // Criterio 2: ¿Está PRÓXIMO? (Usa las variables de ALERTA)
            const isNearByAge = age >= diasAlertaPesarDestete;
            const isNearByWeight = weight >= pesoMinimoPesarDestete;

            if (isNearByAge || isNearByWeight) {
                 return { id: cria.id, status: 'Próximo a Destete' };
            }

            // Criterio 3: Sigue Amamantando
            return { id: cria.id, status: 'Amamantando' };
        });

        const listasParaDesteteCount = desteteConditions.filter(d => d.status === 'Listo para Destete').length;
        const proximasADesteteCount = desteteConditions.filter(d => d.status === 'Próximo a Destete').length;
        const amamantandoCount = desteteConditions.filter(d => d.status === 'Amamantando').length;
        // --- (FIN) CORRECCIÓN LÓGICA DE DESTETE ---

        const desteteStatusData = [
            { name: 'Listo', value: listasParaDesteteCount, color: '#34C759' },
            { name: 'Próximo', value: proximasADesteteCount, color: '#FF9F0A' },
            { name: 'Amamantando', value: amamantandoCount, color: '#007AFF' },
        ].filter(item => item.value > 0);

        // --- Analítica para Reproductores (Estable) ---
        const activeSeasonIds = new Set(breedingSeasons.filter(s => s.status === 'Activo').map(s => s.id));
        const activeSireLots = sireLots.filter(sl => activeSeasonIds.has(sl.seasonId));
        
        const activeSires = categories.reproductores.filter(r => activeSireLots.some(sl => sl.sireId === r.id))
            .map(sire => {
                const lot = activeSireLots.find(sl => sl.sireId === sire.id)!;
                const assignedFemales = animals.filter(a => a.sireLotId === lot.id).length;
                return { ...sire, lotId: lot.id, assignedFemales };
            });

        // --- Objeto de retorno final (Estable) ---
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
        // --- (INICIO) CORRECCIÓN DEPENDENCIAS ---
        animals, 
        parturitions, 
        bodyWeighings, 
        sireLots, 
        breedingSeasons, 
        weighings, 
        appConfig.pesoPrimerServicioKg, 
        appConfig.edadPrimerServicioMeses,
        // Reemplazar las variables antiguas por las 4 nuevas
        appConfig.diasAlertaPesarDestete,
        appConfig.pesoMinimoPesarDestete,
        appConfig.diasMetaDesteteFinal,
        appConfig.pesoMinimoDesteteFinal
        // --- (FIN) CORRECCIÓN DEPENDENCIAS ---
    ]);

    return analytics;
};