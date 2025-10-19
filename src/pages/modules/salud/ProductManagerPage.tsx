import { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, Edit, Trash2, Syringe, DollarSign, Filter } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { ProductForm } from '../../../components/forms/ProductForm';
import { Product, ProductCategory } from '../../../db/local';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

export default function ProductManagerPage() {
    const { products, addProduct, updateProduct, deleteProduct } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Product | null>(null);
    const [activeFilter, setActiveFilter] = useState<ProductCategory | 'Todos'>('Todos');

    const handleOpenModal = (product?: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(undefined);
    };

    const handleSave = async (productData: Omit<Product, 'id'>) => {
        if (editingProduct?.id) {
            await updateProduct(editingProduct.id, productData);
        } else {
            await addProduct(productData);
        }
        handleCloseModal();
    };

    const handleDelete = async () => {
        if (deleteConfirmation?.id) {
            await deleteProduct(deleteConfirmation.id);
        }
        setDeleteConfirmation(null);
    };

    // --- LÓGICA DE FILTRADO ---
    const productCategories = useMemo(() => {
        const categories = new Set(products.map(p => p.category).filter(Boolean) as ProductCategory[]);
        return ['Todos', ...Array.from(categories).sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (activeFilter === 'Todos') {
            return products;
        }
        return products.filter(p => p.category === activeFilter);
    }, [products, activeFilter]);


    const getCostPerUnit = (product: Product): string => {
        if (!product.price || !product.presentationValue || product.presentationValue === 0) {
            return 'N/A';
        }
        const totalVolumeInMl = product.presentationUnit === 'L' 
            ? product.presentationValue * 1000 
            : product.presentationValue;
        if (totalVolumeInMl === 0) return 'N/A';
        const costPerMl = product.price / totalVolumeInMl;
        return `$${costPerMl.toFixed(3)} / ml`;
    };
    
    const renderDosage = (product: Product) => {
        if (product.dosageType === 'fixed') {
            return `${product.dosageFixed} ml (fija)`;
        }
        if (product.dosageType === 'per_kg') {
            return `${product.dosagePerKg_ml} ml / ${product.dosagePerKg_kg} Kg`;
        }
        return 'No especificada';
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Inventario de Productos</h1>
                    <p className="text-lg text-zinc-400">Gestión de Insumos Sanitarios</p>
                </header>

                <button 
                    onClick={() => handleOpenModal()}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:opacity-90 text-black font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={18} /> Añadir Nuevo Producto
                </button>

                {/* --- NUEVA BARRA DE FILTROS --- */}
                <div className="space-y-2 pt-4">
                     <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-300"><Filter size={18}/> Filtrar por Categoría</h3>
                     <div className="flex flex-wrap gap-2">
                        {productCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveFilter(category as any)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${activeFilter === category ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}
                            >
                                {category}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="space-y-3 pt-4">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                            <div key={product.id} className="bg-dashboard-surface rounded-2xl p-4 border border-brand-border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-white">{product.name}</p>
                                        <p className="text-sm text-zinc-400">{product.presentationValue ? `${product.presentationValue} ${product.presentationUnit}` : 'Sin presentación'}</p>
                                        <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
                                            <span className="flex items-center gap-1"><Syringe size={14}/> {renderDosage(product)}</span>
                                            <span className="flex items-center gap-1 font-semibold text-amber-400"><DollarSign size={14}/> {getCostPerUnit(product)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleOpenModal(product)} className="p-2 text-zinc-400 hover:text-brand-orange transition-colors"><Edit size={18} /></button>
                                        <button onClick={() => setDeleteConfirmation(product)} className="p-2 text-zinc-400 hover:text-brand-red transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-dashboard-surface rounded-2xl">
                            <p className="text-zinc-500 font-semibold">No se encontraron productos.</p>
                             <p className="text-zinc-500 text-sm">{activeFilter === 'Todos' ? 'Añade tu primer producto para empezar.' : `No hay productos en la categoría "${activeFilter}".`}</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Editar Producto' : 'Añadir Producto'}>
                <ProductForm 
                    onSave={handleSave}
                    onCancel={handleCloseModal}
                    existingProduct={editingProduct}
                />
            </Modal>
            
            <ConfirmationModal 
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDelete}
                title={`Eliminar Producto`}
                message={`¿Estás seguro de que quieres eliminar "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`}
            />
        </>
    );
}