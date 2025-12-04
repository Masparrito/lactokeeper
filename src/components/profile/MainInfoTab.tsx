// src/components/profile/MainInfoTab.tsx
// (UPDATED: Category is now editable for NON-NATIVE animals)

import React, { useMemo } from 'react';
import { Info, Network, Search, Plus } from 'lucide-react';
import { Animal, Origin, Lot } from '../../db/local';
import type { PageState } from '../../types/navigation';
import { formatAge } from '../../utils/calculations';
import { formatAnimalDisplay } from '../../utils/formatting';
import { StatusIcons } from '../icons/StatusIcons';
import { FormGroup, InfoRow } from '../ui/FormGroup';
import { FormInput, FormSelect, Toggle } from '../ui/FormControls';

// Type for manual fields
type ManualIndicatorFields = {
    priorParturitions?: number;
    manualFirstParturitionDate?: string;
};

interface MainInfoTabProps {
    animal: Animal;
    // --- (NEW) Prop to determine if the animal is native ---
    isNativo: boolean; 
    isEditing: boolean;
    editedData: Partial<Animal & ManualIndicatorFields>;
    setEditedData: React.Dispatch<React.SetStateAction<Partial<Animal & ManualIndicatorFields>>>;
    origins: Origin[];
    lots: Lot[];
    onAddOriginClick: () => void;
    onAddLotClick: () => void;
    allFathers: any[];
    mothers: Animal[];
    navigateTo: (page: PageState) => void;
    statusObjects: any[];
    onOpenPedigree: () => void;
    onOpenLegend: () => void;
    indicators: any;
    indicatorsLoading: boolean;
    onEditFather: () => void;
    onEditMother: () => void;
    // Removed 'category' and 'age' props to fix TS2322 error in parent
}

export const MainInfoTab: React.FC<MainInfoTabProps> = ({
    animal, 
    isNativo, // --- (NEW) ---
    isEditing, 
    editedData, 
    setEditedData, 
    origins, 
    lots, 
    onAddOriginClick, 
    onAddLotClick, 
    allFathers, 
    mothers, 
    navigateTo,
    statusObjects, 
    onOpenPedigree, 
    onOpenLegend, 
    indicators, 
    indicatorsLoading, 
    onEditFather, 
    onEditMother
}) => {

    const handleChange = (field: keyof Omit<Animal, 'id' | 'name'> | keyof ManualIndicatorFields, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    // Calculate formatted age internally
    const formattedAge = formatAge(animal.birthDate);

    const father = useMemo(() => allFathers.find(f => f.id === animal.fatherId), [allFathers, animal.fatherId]);
    const mother = useMemo(() => mothers.find(m => m.id === animal.motherId), [mothers, animal.motherId]);

    const handleCategoryChange = (isActivo: boolean) => {
        setEditedData(prev => ({ ...prev, isReference: !isActivo }));
    };

    const conceptionMethodMap: { [key: string]: string } = { 'MN': 'Monta Natural (MN)', 'IA': 'Inseminación Artificial (IA)', 'TE': 'Transferencia de Embriones (TE)', '': 'Otro/Desconocido', };
    const parturitionTypeMap: { [key: string]: string } = { 'Simple': 'Parto Simple', 'TW': 'Doble (TW)', 'TR': 'Triple (TR)', 'QD': 'Cuádruple (QD)', '': 'N/A', };

    const compositionData = useMemo(() => {
        const compString = isEditing ? editedData.racialComposition : animal.racialComposition;
        if (!compString) return [];
        const breedColors: Record<string, string> = { 'A': 'bg-blue-500', 'S': 'bg-green-500', 'AN': 'bg-red-500', 'AGC': 'bg-yellow-500', 'T': 'bg-purple-500', 'C': 'bg-orange-500', };
        const regex = /(\d+(\.\d+)?)%?([A-Z]+)/g;
        let match;
        const data = [];
        while ((match = regex.exec(compString.toUpperCase())) !== null) {
            const percentage = parseFloat(match[1]);
            const code = match[3] as keyof typeof breedColors;
            data.push({ label: `${code} (${percentage}%)`, percentage: percentage, color: breedColors[code] || 'bg-gray-500' });
        }
        return data;
    }, [animal.racialComposition, editedData.racialComposition, isEditing]);


    return (
        <div className="space-y-4">

            <FormGroup
                title="Estado"
                headerAccessory={!isEditing ? (
                    <div className="flex items-center gap-3">
                        {animal.sex === 'Hembra' && (
                            <StatusIcons statuses={statusObjects} sex={animal.sex} size={16} />
                        )}
                        <button onClick={onOpenLegend} title="Ver leyenda de estados" className="p-1 text-zinc-500 hover:text-white">
                            <Info size={16} />
                        </button>
                    </div>
                ) : null}
            >
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                        label="Categoría"
                        value={(animal.lifecycleStage as string) === 'Cabra Adulta' ? 'Cabra' : animal.lifecycleStage}
                        // --- (UPDATED) Only editable if 'isEditing' AND 'NOT Native' ---
                        isEditing={isEditing && !isNativo}
                    >
                        {/* --- (NEW) Dropdown to edit category for registered animals --- */}
                        <FormSelect 
                            value={editedData.lifecycleStage || animal.lifecycleStage} 
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('lifecycleStage', e.target.value)}
                        >
                            {animal.sex === 'Hembra' ? (
                                <>
                                    <option value="Cabrita">Cabrita</option>
                                    <option value="Cabritona">Cabritona</option>
                                    <option value="Cabra">Cabra</option>
                                </>
                            ) : (
                                <>
                                    <option value="Cabrito">Cabrito</option>
                                    <option value="Macho de Levante">Macho de Levante</option>
                                    <option value="Reproductor">Reproductor</option>
                                </>
                            )}
                            <option value="Indefinido">Indefinido</option>
                        </FormSelect>
                        {isEditing && isNativo && (
                             <p className="text-xs text-zinc-500 mt-1">La categoría de animales nativos se calcula automáticamente.</p>
                        )}
                    </InfoRow>

                    <InfoRow
                        label="Ubicación / Lote"
                        value={animal.location || 'Sin Asignar'}
                        isEditing={isEditing}
                    >
                        <div className="flex items-center gap-2">
                            <FormSelect value={editedData.location || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('location', e.target.value)}>
                                <option value="">Sin Asignar</option>
                                {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                            </FormSelect>
                            <button type="button" onClick={onAddLotClick} className="p-2.5 bg-zinc-700 hover:bg-zinc-600 text-brand-orange rounded-lg"><Plus size={18} /></button>
                        </div>
                    </InfoRow>
                    <InfoRow label="Edad" value={formattedAge} />
                    <InfoRow
                        label="Estado (Activo/Ref)"
                        value={animal.isReference ? 'Referencia' : 'Activo'}
                        isEditing={isEditing}
                    >
                        <Toggle
                            labelOn="Activo"
                            labelOff="Referencia"
                            value={!editedData.isReference}
                            onChange={handleCategoryChange}
                        />
                    </InfoRow>
                </div>
            </FormGroup>

            <div className="bg-brand-glass rounded-2xl border border-brand-border overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                    <h2 className="text-zinc-400 font-semibold text-sm uppercase tracking-wide">Genética</h2>
                    <button onClick={onOpenPedigree} title="Ver Árbol Genealógico" className="p-1 text-brand-orange hover:text-orange-300 transition-colors rounded-lg hover:bg-zinc-700/50">
                        <Network size={18} />
                    </button>
                </div>
                <div className="space-y-4 p-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">

                        <InfoRow
                            label="Padre (Reproductor)"
                            value={father ? (<button onClick={() => father.id && navigateTo({ name: 'rebano-profile', animalId: father.id })} className="text-brand-orange hover:underline text-left"> {formatAnimalDisplay(father)} </button>) : 'Desconocido'}
                            isEditing={isEditing}
                        >
                            <button
                                type="button"
                                onClick={onEditFather}
                                className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 flex justify-between items-center"
                            >
                                <span className={editedData.fatherId ? 'text-white' : 'text-zinc-400'}>
                                    {editedData.fatherId ? (formatAnimalDisplay(allFathers.find(f => f.id === editedData.fatherId)) || editedData.fatherId) : 'Seleccionar...'}
                                </span>
                                <Search size={16} className="text-zinc-400" />
                            </button>
                        </InfoRow>

                        <InfoRow
                            label="Madre"
                            value={mother ? (<button onClick={() => mother.id && navigateTo({ name: 'rebano-profile', animalId: mother.id })} className="text-brand-orange hover:underline text-left"> {formatAnimalDisplay(mother)} </button>) : 'Desconocida'}
                            isEditing={isEditing}
                        >
                            <button
                                type="button"
                                onClick={onEditMother}
                                className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 flex justify-between items-center"
                            >
                                <span className={editedData.motherId ? 'text-white' : 'text-zinc-400'}>
                                    {editedData.motherId ? (formatAnimalDisplay(mothers.find(m => m.id === editedData.motherId)) || editedData.motherId) : 'Seleccionar...'}
                                </span>
                                <Search size={16} className="text-zinc-400" />
                            </button>
                        </InfoRow>

                    </div>
                    <InfoRow label="Composición Racial" value={animal.racialComposition || 'N/A'} isEditing={isEditing}>
                        {!isEditing && compositionData.length > 0 && (
                            <div className="w-full flex h-2 rounded-full overflow-hidden mt-2 bg-zinc-700">
                                {compositionData.map((breed) => (
                                    <div
                                        key={breed.label}
                                        className={`${breed.color}`}
                                        style={{ width: `${breed.percentage}%` }}
                                        title={breed.label}
                                    />
                                ))}
                            </div>
                        )}
                        {isEditing && (
                            <FormInput
                                type="text"
                                value={editedData.racialComposition || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('racialComposition', e.target.value.toUpperCase())}
                                className="w-full font-mono"
                                placeholder="Ej: 100%A ó 50%A 50%AGC"
                            />
                        )}
                    </InfoRow>
                </div>
            </div>

            <FormGroup title="Nacimiento y Origen">
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Fecha Nacimiento" value={animal.birthDate !== 'N/A' ? new Date(animal.birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', { timeZone: 'UTC' }) : 'N/A'} isEditing={isEditing}>
                        <input type="date" value={editedData.birthDate === 'N/A' ? '' : editedData.birthDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('birthDate', e.target.value || 'N/A')} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white" />
                    </InfoRow>
                    <InfoRow label="Peso al Nacer" value={animal.birthWeight ? `${animal.birthWeight} Kg` : 'N/A'} isEditing={isEditing}>
                        <FormInput
                            type="number"
                            step="0.1"
                            value={editedData.birthWeight || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('birthWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full"
                            placeholder="Kg (ej: 3.5)"
                        />
                    </InfoRow>
                    <InfoRow label="Método de Concepción" value={conceptionMethodMap[animal.conceptionMethod || ''] || 'N/A'} isEditing={isEditing}>
                        <FormSelect value={editedData.conceptionMethod || 'MN'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('conceptionMethod', e.target.value)}>
                            <option value="MN">Monta Natural (MN)</option>
                            <option value="IA">Inseminación Artificial (IA)</option>
                            <option value="TE">Transferencia de Embriones (TE)</option>
                            <option value="">Otro/Desconocido</option>
                        </FormSelect>
                    </InfoRow>
                    <InfoRow label="Tipo de Parto (Origen)" value={parturitionTypeMap[animal.parturitionType || ''] || 'N/A'} isEditing={isEditing}>
                        <FormSelect value={editedData.parturitionType || 'Simple'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('parturitionType', e.target.value)}>
                            <option value="Simple">Parto Simple</option>
                            <option value="TW">Doble (TW)</option>
                            <option value="TR">Triple (TR)</option>
                            <option value="QD">Cuádruple (QD)</option>
                            <option value="">N/A</option>
                        </FormSelect>
                    </InfoRow>
                    <InfoRow label="Origen" value={animal.origin} isEditing={isEditing} className="col-span-2">
                        <div className="flex items-center gap-2">
                            <FormSelect value={editedData.origin || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('origin', e.target.value)}>
                                <option value="">Seleccionar Origen...</option>
                                <option value="Finca Masparrito">Finca Masparrito</option>
                                {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            </FormSelect>
                            <button type="button" onClick={onAddOriginClick} className="p-2.5 bg-zinc-700 hover:bg-zinc-600 text-brand-orange rounded-lg"><Plus size={18} /></button>
                        </div>
                    </InfoRow>
                </div>
            </FormGroup>

            {animal.sex === 'Hembra' && (
                <FormGroup title="Indicadores Reproductivos">
                    {indicatorsLoading ? (
                        <p className="text-zinc-400 text-center text-sm">Calculando...</p>
                    ) : (
                        isEditing && indicators.needsManualData ? (
                            <div className="space-y-4">
                                <InfoRow label="Nº Partos (Previo)" isEditing={true}>
                                    <FormInput
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={editedData.priorParturitions || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('priorParturitions', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="Partos antes de usar la app"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Solo para cabras sin partos registrados en la app.</p>
                                </InfoRow>
                                <InfoRow label="Fecha 1er Parto (Manual)" isEditing={true}>
                                    <input
                                        type="date"
                                        value={editedData.manualFirstParturitionDate || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('manualFirstParturitionDate', e.target.value || undefined)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Requerido para calcular la "Edad 1er Parto" correcta.</p>
                                </InfoRow>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                <InfoRow label="Nº Partos" value={indicators.numPartos} title="Número total de partos registrados" />
                                <InfoRow label="Edad 1er Parto" value={indicators.edadPrimerParto} title="Edad del animal en su primer parto" />
                                <InfoRow label="IEP Promedio" value={indicators.iepPromedio} title="Intervalo Inter-Parto promedio (días)" />
                                <InfoRow label="DEL Promedio" value={indicators.delPromedio} title="Promedio de Días en Leche (lactancias finalizadas)" />
                                <InfoRow label="PEV Promedio" value={indicators.pevPromedio} title="Promedio de Período Seco (días)" />
                            </div>
                        )
                    )}
                </FormGroup>
            )}
        </div>
    );
};