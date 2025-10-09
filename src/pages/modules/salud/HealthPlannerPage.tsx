// src/pages/modules/salud/HealthPlannerPage.tsx

import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, ChevronRight, ClipboardList } from 'lucide-react';
import { HealthPlan } from '../../../db/local';
import { Modal } from '../../../components/ui/Modal'; // <-- Se importa el componente Modal
import { HealthPlanForm } from '../../../components/forms/HealthPlanForm'; // <-- Se importa el nuevo formulario

// Sub-componente para la tarjeta de un plan
const PlanCard = ({ plan, onClick }: { plan: HealthPlan, onClick: () => void }) => {
    return (
        <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-teal-400 transition-colors">
            <div>
                <p className="font-bold text-lg text-white">{plan.name}</p>
                <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
            </div>
            <ChevronRight className="text-zinc-600" />
        </button>
    );
};

export default function HealthPlannerPage() {
    const { healthPlans, addHealthPlan } = useData();
    // --- CAMBIO CLAVE 1: Los estados del modal ahora se utilizan ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- CAMBIO CLAVE 2: La función ahora abre el modal ---
    const handleCreatePlan = () => {
        setIsModalOpen(true);
    };

    // --- CAMBIO CLAVE 3: Nueva función para guardar el plan ---
    const handleSavePlan = async (planData: Omit<HealthPlan, 'id'>) => {
        await addHealthPlan(planData);
        setIsModalOpen(false); // Cierra el modal después de guardar
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Planificador Sanitario</h1>
                    <p className="text-lg text-zinc-400">Define tus Protocolos y Planes</p>
                </header>

                <button 
                    onClick={handleCreatePlan}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={18} /> Crear Nuevo Plan Sanitario
                </button>

                <div className="space-y-3 pt-4">
                    {healthPlans.length > 0 ? (
                        healthPlans.map(plan => (
                            <PlanCard 
                                key={plan.id} 
                                plan={plan} 
                                onClick={() => alert(`Próximamente: Ver detalles del plan ${plan.name}`)} 
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-4">
                            <ClipboardList size={48} className="text-zinc-600" />
                            <p className="text-zinc-500">Aún no has creado ningún plan sanitario.</p>
                            <p className="text-zinc-500 text-sm">Usa el botón de arriba para empezar a definir tus protocolos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CAMBIO CLAVE 4: Se añade el Modal con el formulario --- */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Plan Sanitario">
                <HealthPlanForm 
                    onSave={handleSavePlan}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </>
    );
}