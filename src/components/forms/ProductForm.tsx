import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../../db/local';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductFormProps {
    onSave: (productData: Omit<Product, 'id'>) => Promise<void>;
    onCancel: () => void;
    existingProduct?: Product;
}

const CATEGORIES: ProductCategory[] = ['Desparasitantes', 'Antibióticos', 'Vacunas', 'Vitaminas', 'Modificadores Orgánicos', 'Pomadas Tópicas', 'Analgésicos', 'Hormonas', 'Antiinflamatorios', 'Otro'];

export const ProductForm: React.FC<ProductFormProps> = ({ onSave, onCancel, existingProduct }) => {
    const [name, setName] = useState('');
    const [laboratory, setLaboratory] = useState('');
    const [category, setCategory] = useState<ProductCategory>('Otro'); // <-- NUEVO ESTADO
    const [presentationValue, setPresentationValue] = useState('');
    const [presentationUnit, setPresentationUnit] = useState<'ml' | 'L'>('ml');
    const [price, setPrice] = useState('');
    const [applicationType, setApplicationType] = useState<'Oral' | 'Inyectable'>('Inyectable');
    const [applicationRoute, setApplicationRoute] = useState<'Intramuscular' | 'Subcutáneo'>('Intramuscular');
    const [dosageType, setDosageType] = useState<'per_kg' | 'fixed'>('per_kg');
    const [dosageFixed, setDosageFixed] = useState('');
    const [dosagePerKgMl, setDosagePerKgMl] = useState('');
    const [dosagePerKgKg, setDosagePerKgKg] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (existingProduct) {
            setName(existingProduct.name);
            setLaboratory(existingProduct.laboratory || '');
            setCategory(existingProduct.category || 'Otro'); // <-- CARGAR CATEGORÍA EXISTENTE
            setPresentationValue(String(existingProduct.presentationValue || ''));
            setPresentationUnit(existingProduct.presentationUnit || 'ml');
            setPrice(String(existingProduct.price || ''));
            setApplicationType(existingProduct.applicationType);
            if (existingProduct.applicationRoute) setApplicationRoute(existingProduct.applicationRoute);
            setDosageType(existingProduct.dosageType || 'per_kg');
            setDosageFixed(String(existingProduct.dosageFixed || ''));
            setDosagePerKgMl(String(existingProduct.dosagePerKg_ml || ''));
            setDosagePerKgKg(String(existingProduct.dosagePerKg_kg || ''));
        }
    }, [existingProduct]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
        if (dosageType === 'fixed' && !dosageFixed) { setError('La dosis fija es obligatoria.'); return; }
        if (dosageType === 'per_kg' && (!dosagePerKgMl || !dosagePerKgKg)) { setError('Ambos campos de dosificación por Kg son obligatorios.'); return; }

        const productData: Partial<Product> = {
            name,
            applicationType,
            dosageType,
            category, // <-- AÑADIR CATEGORÍA AL GUARDAR
        };

        if (laboratory) productData.laboratory = laboratory;
        if (presentationValue) productData.presentationValue = parseFloat(presentationValue);
        productData.presentationUnit = presentationUnit;
        if (price) productData.price = parseFloat(price);
        if (applicationType === 'Inyectable') productData.applicationRoute = applicationRoute;
        if (dosageType === 'fixed') productData.dosageFixed = parseFloat(dosageFixed);
        if (dosageType === 'per_kg') {
            productData.dosagePerKg_ml = parseFloat(dosagePerKgMl);
            productData.dosagePerKg_kg = parseFloat(dosagePerKgKg);
        }

        try {
            await onSave(productData as Omit<Product, 'id'>);
        } catch (err) {
            setError('No se pudo guardar el producto.');
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre o Marca Comercial" className="w-full bg-zinc-800 p-3 rounded-xl" required />
            
            {/* --- NUEVO CAMPO DE CATEGORÍA --- */}
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="w-full bg-zinc-800 p-3 rounded-xl">
                <option value="" disabled>Seleccionar Categoría...</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <input type="text" value={laboratory} onChange={(e) => setLaboratory(e.target.value)} placeholder="Laboratorio (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl" />
            
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <input type="number" value={presentationValue} onChange={(e) => setPresentationValue(e.target.value)} placeholder="Presentación" className="w-full bg-zinc-800 p-3 rounded-xl" />
                    <select value={presentationUnit} onChange={(e) => setPresentationUnit(e.target.value as any)} className="bg-zinc-800 p-3 rounded-xl">
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                    </select>
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Precio" className="w-full bg-zinc-800 p-3 pl-7 rounded-xl" />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Vía de Administración</label>
                <div className="relative flex w-full justify-between rounded-lg bg-zinc-800 p-1">
                    <button type="button" onClick={() => setApplicationType('Inyectable')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Inyectable</button>
                    <button type="button" onClick={() => setApplicationType('Oral')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Oral</button>
                    <motion.div layoutId="app-type-bg" transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-1 h-[calc(100%-0.5rem)] w-1/2 rounded-md bg-zinc-600 ${applicationType === 'Oral' ? 'left-1/2' : 'left-1'}`} />
                </div>
            </div>
            
            {applicationType === 'Inyectable' && (
                 <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="space-y-2 overflow-hidden">
                    <label className="text-sm font-medium text-zinc-400">Ruta (Inyectable)</label>
                    <div className="relative flex w-full justify-between rounded-lg bg-zinc-800 p-1">
                        <button type="button" onClick={() => setApplicationRoute('Intramuscular')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Intramuscular</button>
                        <button type="button" onClick={() => setApplicationRoute('Subcutáneo')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Subcutáneo</button>
                        <motion.div layoutId="app-route-bg" transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-1 h-[calc(100%-0.5rem)] w-1/2 rounded-md bg-zinc-600 ${applicationRoute === 'Subcutáneo' ? 'left-1/2' : 'left-1'}`} />
                    </div>
                </motion.div>
            )}
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Dosificación</label>
                 <div className="relative flex w-full justify-between rounded-lg bg-zinc-800 p-1">
                    <button type="button" onClick={() => setDosageType('per_kg')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Por Kg PV</button>
                    <button type="button" onClick={() => setDosageType('fixed')} className="relative z-10 w-1/2 py-1.5 text-sm font-semibold text-white">Dosis Única</button>
                    <motion.div layoutId="dosage-type-bg" transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-1 h-[calc(100%-0.5rem)] w-1/2 rounded-md bg-zinc-600 ${dosageType === 'fixed' ? 'left-1/2' : 'left-1'}`} />
                </div>
                
                {dosageType === 'per_kg' ? (
                    <div className="flex items-center justify-between gap-2 animate-fade-in">
                        <div className="relative flex-1">
                            <input type="number" step="0.1" value={dosagePerKgMl} onChange={(e) => setDosagePerKgMl(e.target.value)} placeholder="1" className="w-full bg-zinc-800 p-3 pr-10 rounded-xl" required />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">ml</span>
                        </div>
                        <span className="text-zinc-500 text-sm">por cada</span>
                        <div className="relative flex-1">
                             <input type="number" step="1" value={dosagePerKgKg} onChange={(e) => setDosagePerKgKg(e.target.value)} placeholder="50" className="w-full bg-zinc-800 p-3 pr-10 rounded-xl" required />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">Kg</span>
                        </div>
                    </div>
                ) : (
                    <div className="relative animate-fade-in">
                        <input type="number" step="0.1" value={dosageFixed} onChange={(e) => setDosageFixed(e.target.value)} placeholder="Ej: 2" className="w-full bg-zinc-800 p-3 pr-24 rounded-xl" required />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">ml (dosis total)</span>
                    </div>
                )}
            </div>

            {error && <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18} /><span>{error}</span></div>}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-green text-white font-bold rounded-lg">{existingProduct ? 'Actualizar Producto' : 'Guardar Producto'}</button>
            </div>
        </form>
    );
};