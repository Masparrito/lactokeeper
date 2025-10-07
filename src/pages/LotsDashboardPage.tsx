import { useState } from 'react';
import { PageState } from './RebanoShell';
import { Users, Zap, Plus } from 'lucide-react';
import { AddLotModal } from '../components/ui/AddLotModal';
import PhysicalLotsView from '../components/lots/PhysicalLotsView';
import BreedingLotsView from '../components/lots/BreedingLotsView';

export default function LotsDashboardPage({ navigateTo }: { navigateTo: (page: PageState) => void; }) {
    const [activeTab, setActiveTab] = useState<'physical' | 'breeding'>('physical');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);

    return (
        <div className="w-full max-w-lg mx-auto space-y-4 pb-24">
            <header className="text-center pt-8 pb-4 px-0">
                <h1 className="text-4xl font-bold tracking-tight text-white">Lotes</h1>
                <p className="text-xl text-zinc-400">Gestión de Grupos</p>
            </header>
            
            <div className="px-4">
                <div className="relative bg-brand-glass rounded-xl p-1 border border-brand-border flex items-center">
                    <button onClick={() => setActiveTab('physical')} className={`w-1/2 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                        <Users size={16}/> <span className="text-sm font-semibold">Lotes Físicos</span>
                        <span onClick={(e) => { e.stopPropagation(); setAddLotModalOpen(true); }} className="ml-2 p-1 rounded-full hover:bg-brand-orange/50"><Plus size={18} /></span>
                    </button>
                    <button onClick={() => setActiveTab('breeding')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'breeding' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>
                        <Zap size={16}/> Lotes de Monta
                    </button>
                </div>
            </div>
            
            <div className="pt-0">
                <div className="px-0">
                    {activeTab === 'physical' && <PhysicalLotsView navigateTo={navigateTo} />}
                    {activeTab === 'breeding' && <BreedingLotsView navigateTo={navigateTo} />}
                </div>
            </div>

            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
        </div>
    );
}