import { Button } from "@/components/ui/button";
import { Settings, ArrowRightLeft } from "lucide-react";

export function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="text-white text-sm" size={16} />
            </div>
            <h1 className="text-xl font-bold text-slate-50">🤺 Sabre</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-emerald-400 font-medium border-b-2 border-emerald-400 pb-1">
              Dashboard
            </a>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors">
              Opportunities
            </a>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors">
              Agents
            </a>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors">
              History
            </a>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-300">0xA1B2...C3D4</span>
            <div className="flex space-x-1 ml-2">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-xs text-white font-bold">⧫</div>
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-bold">🔵</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
