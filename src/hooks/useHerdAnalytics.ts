import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { DEFAULT_CONFIG } from '../types/config'; 
import { 
    calculateAgeInDays, 
    getAnimalZootecnicCategory, // El Juez Biológico
    calculateAgeInMonths 
} from '../utils/calculations'; 
import { Animal } from '../db/local'; 

export const useHerdAnalytics = () => {
    const { animals, parturitions, bodyWeighings, sireLots, breedingSeasons, weighings, appConfig } = useData();

    const analytics = useMemo(() => {
        const config = { ...DEFAULT_CONFIG, ...appConfig };
        
        // 1. POBLACIÓN BASE: Solo animales Activos y NO Referencia
        const activeAnimals = animals.filter(a => !a.isReference && a.status === 'Activo');
        const allFemales = activeAnimals.filter(a => a.sex === 'Hembra');
        
        const totalHembras = allFemales.length;
        
        // 2. CONTENEDORES DE LISTAS (Se llenarán con la lógica nueva)
        const categories = {
            cabras: [] as Animal[],
            cabritonas: [] as Animal[],
            cabritas: [] as Animal[],
            cabritos: [] as Animal[],
            machosLevante: [] as Animal[],
            reproductores: [] as Animal[],
        };

        // 3. CLASIFICACIÓN EN VIVO (Cerebro Biológico)
        activeAnimals.forEach(animal => {
            // IMPORTANTE: Pasamos 'animals' (4to argumento) para que la función pueda buscar hijos
            const realCategory = getAnimalZootecnicCategory(animal, parturitions, config, animals);

            switch(realCategory) {
                case 'Cabra': categories.cabras.push(animal); break;
                case 'Cabritona': categories.cabritonas.push(animal); break;
                case 'Cabrita': categories.cabritas.push(animal); break;
                case 'Cabrito': categories.cabritos.push(animal); break;
                case 'Macho de Levante': categories.machosLevante.push(animal); break;
                case 'Reproductor': categories.reproductores.push(animal); break;
                default: 
                    // Fallback de seguridad
                    if (animal.sex === 'Hembra') categories.cabritas.push(animal);
                    else categories.cabritos.push(animal);
                    break;
            }
        });
        
        // 4. LÓGICA DE VIENTRES
        const { edadMinimaVientreMeses } = config; 
        const minAgeMonths = edadMinimaVientreMeses > 0 ? edadMinimaVientreMeses : 6;

        const totalVientres = allFemales.filter(hembra => {
            // A. Si ya cayó en la cubeta de "Cabras" (por parto o edad), es Vientre.
            const isCabra = categories.cabras.some(c => c.id === hembra.id);
            if (isCabra) return true;
            
            // B. Si es Cabritona, verificamos la edad mínima configurada
            const ageInMonths = calculateAgeInMonths(hembra.birthDate);
            return ageInMonths >= minAgeMonths;
        }).length;
        
        // --- Analítica de Hembras Adultas (Cabras) ---
        const enProduccion = parturitions.filter(p => p.status === 'activa' && categories.cabras.some(c => c.id === p.goatId)).length;
        const secas = categories.cabras.length - enProduccion;
        const preñadas = categories.cabras.filter(a => a.reproductiveStatus === 'Preñada').length;
        
        // Ajuste Visual: "En Monta" = En Servicio O Asignada a Lote (aunque diga Vacía)
        const enMontaReal = categories.cabras.filter(a => 
            a.reproductiveStatus === 'En Servicio' || 
            (a.sireLotId && a.reproductiveStatus !== 'Preñada')
        ).length;

        // Ajuste Visual: "Vacías" = Libres de todo compromiso
        const vaciasReal = categories.cabras.filter(a => 
            (a.reproductiveStatus === 'Vacía' || a.reproductiveStatus === 'Post-Parto' || a.reproductiveStatus === 'No Aplica' || !a.reproductiveStatus) && 
            !a.sireLotId
        ).length;

        const cabrasReproductiveStatusData = [
            { name: 'Preñadas', value: preñadas, color: '#34C759' },
            { name: 'Vacías', value: vaciasReal, color: '#FF9500' },
            { name: 'En Monta', value: enMontaReal, color: '#007AFF' },
        ].filter(item => item.value > 0);
        
        // KPI Ordeño (Semestral)
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
        const serviceWeight = Number(config.pesoPrimerServicioKg) || 30;
        // UMBRAL UNIFICADO (95%): Alineado con SwipeableAnimalCard
        const serviceWeightThreshold = serviceWeight * 0.95; 
        
        const cabritonasEnMonta = categories.cabritonas.filter(c => c.reproductiveStatus === 'En Servicio' || c.sireLotId).length;
        
        const proximasAServicio = categories.cabritonas.filter(c => {
            // Si ya está comprometida, no es próxima
            if (c.reproductiveStatus === 'En Servicio' || c.reproductiveStatus === 'Preñada' || c.sireLotId) return false;
            
            const lastWeight = bodyWeighings.filter(bw => bw.animalId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (!lastWeight) return false;
            
            // Usamos el umbral del 95% para contarla como "Lista"
            return (lastWeight.kg >= serviceWeightThreshold);
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

        // Estado de Destete
        const { 
            diasAlertaPesarDestete, 
            pesoMinimoPesarDestete, 
            diasMetaDesteteFinal, 
            pesoMinimoDesteteFinal 
        } = config;

        const desteteConditions = [...categories.cabritas, ...categories.cabritos].map(cria => {
            const age = calculateAgeInDays(cria.birthDate);
            
            // Filtro de edad para destete: Si es muy viejo (>12m), ya no es candidato
            if (age > 365) return { id: cria.id, status: 'Amamantando' };

            const lastWeight = bodyWeighings.filter(bw => bw.animalId === cria.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const weight = lastWeight?.kg || 0;

            const isReadyByAge = age >= diasMetaDesteteFinal;
            const isReadyByWeight = weight >= pesoMinimoDesteteFinal;

            if (isReadyByAge && isReadyByWeight) return { id: cria.id, status: 'Listo para Destete' };

            const isNearByAge = age >= diasAlertaPesarDestete;
            const isNearByWeight = weight >= pesoMinimoPesarDestete;
            if (isNearByAge || isNearByWeight) return { id: cria.id, status: 'Próximo a Destete' };

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
                const assignedFemales = animals.filter(a => a.sireLotId === lot.id && a.status === 'Activo').length;
                return { ...sire, lotId: lot.id, assignedFemales };
            });

        return {
            totalPoblacion: activeAnimals.length,
            totalHembras,
            totalVientres,
            // EXPORTACIÓN DE LISTAS REALES
            lists: {
                cabras: categories.cabras,
                cabritonas: categories.cabritonas,
                cabritas: categories.cabritas,
                cabritos: categories.cabritos,
                machosLevante: categories.machosLevante,
                reproductores: categories.reproductores,
                vaciasReal: vaciasReal 
            },
            // ESTADÍSTICAS
            cabras: {
                total: categories.cabras.length,
                enProduccion, secas, preñadas, 
                vacias: vaciasReal, 
                enMonta: enMontaReal,
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
                hembras: categories.cabritas.length,
                machos: categories.cabritos.length,
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
        appConfig 
    ]);

    return analytics;
};