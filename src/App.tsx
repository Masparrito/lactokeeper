import { Droplets } from 'lucide-react';

export default function App() {
  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center space-x-4">
            <Droplets className="w-16 h-16 text-indigo-400"/>
            <div>
                <h1 className="text-5xl font-bold text-white">LactoKeeper</h1>
                <p className="text-gray-400 mt-2">¡Entorno reconstruido y funcional!</p>
            </div>
        </div>
    </div>
  );
}