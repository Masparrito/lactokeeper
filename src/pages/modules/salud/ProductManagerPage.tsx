// src/pages/modules/sanidad/ProductManagerPage.tsx

import { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, Edit, Trash2, Syringe } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { ProductForm } from '../../../components/forms/ProductForm';
import { Product } from '../../../db/local';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal'; // Asumiremos que este componente existe y es genérico

export default function ProductManagerPage() {
    const { products, addProduct, updateProduct, deleteProduct } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Product | null>(null);

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

    const handleDelete = () => {
        if (deleteConfirmation?.id) {
            deleteProduct(deleteConfirmation.id);
        }
        setDeleteConfirmation(null);
    };

    // Calcula el costo por unidad de dosis para mostrar en la tarjeta
    const getCostPerUnit = (product: Product) => {
        if (!product.totalVolume || product.totalVolume === 0) return 'N/A';
        const costPerMl = product.totalCost / product.totalVolume;
        return `$${costPerMl.toFixed(3)} / ${product.unit}`;
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Inventario de Productos</h1>
                    <p className="text-lg text-zinc-400">Gestión de Insumos Sanitarios</p>
                </header>

                <button 
                    onClick={() => handleOpenModal()}
                    className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={18} /> Añadir Nuevo Producto
                </button>

                <div className="space-y-3 pt-4">
                    {products.length > 0 ? (
                        products.map(product => (
                            <div key={product.id} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-white">{product.name}</p>
                                        <p className="text-sm text-zinc-400">{product.presentation}</p>
                                        <div className="mt-2 flex items-center gap-4 text-xs">
                                            <span className="flex items-center gap-1"><Syringe size={14}/> {product.dosagePer10Kg} {product.unit}/10kg</span>
                                            <span className="font-semibold text-amber-400">{getCostPerUnit(product)}</span>
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
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">Aún no has añadido ningún producto.</p>
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