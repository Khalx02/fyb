import React from 'react';
import { 
  Leaf, 
  Search, 
  X, 
  Plus, 
  Video, 
  Circle, 
  Sprout, 
  AlertTriangle, 
  LayoutDashboard, 
  History, 
  Scan, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activePage: 'scan' | 'health' | 'history';
  setActivePage: (page: 'scan' | 'health' | 'history') => void;
  activeFocus: string;
  setActiveFocus: (focus: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewAnalysis: () => void;
  onOpenLiveCamera: () => void;
  getCategoryCount: (cat: string) => number;
  getFungalRiskCount: () => number;
  aiProvider: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  activeFocus,
  setActiveFocus,
  searchQuery,
  setSearchQuery,
  onNewAnalysis,
  onOpenLiveCamera,
  getCategoryCount,
  getFungalRiskCount,
  aiProvider,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const diagnosticItems = [
    { label: 'Leaf Health', count: getCategoryCount('Leaves'), icon: Leaf, id: 'leaves' },
    { label: 'Pod Ripeness', count: getCategoryCount('Pods'), icon: Circle, id: 'ripeness' },
    { label: 'Internal Cut Tests', count: getCategoryCount('Seeds / Beans'), icon: Sprout, id: 'seeds' },
    { label: 'Fungal Risk Center', count: getFungalRiskCount(), icon: AlertTriangle, id: 'fungal' }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 w-72 bg-sidebar border-r border-card shrink-0 flex flex-col z-50 transition-transform duration-300 print:hidden
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 px-5 border-b border-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-base tracking-tight leading-none text-primary">
                CacaoLens
              </h1>
              <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase">
                AI COCOA LAB
              </span>
            </div>
          </div>

          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-100 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sidebar Body */}
        <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar flex flex-col gap-6">
          
          {/* Search bar */}
          <div className="relative px-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search farm cases..."
              className="w-full bg-input border border-card rounded-xl pl-9 pr-8 py-2 text-xs text-primary placeholder-stone-400 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5 px-1">
            <button 
              onClick={() => {
                onNewAnalysis();
                setActivePage('scan');
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Analysis
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
            
            <button 
              onClick={() => {
                onOpenLiveCamera();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-white hover:bg-card transition-all duration-150"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              Live Camera Scanner
            </button>
          </div>

          {/* Core Navigation Pages */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 block mb-1.5">
              Navigation
            </span>
            
            {[
              { id: 'scan', label: 'Scan & Diagnose', icon: Scan },
              { id: 'health', label: 'Health Analytics', icon: LayoutDashboard },
              { id: 'history', label: 'Scan History', icon: History }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id as any);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                      : 'text-stone-300 hover:text-white hover:bg-card'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Diagnostic Focus Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 block mb-1.5">
              Diagnostics Focus
            </span>
            <div className="space-y-1">
              {diagnosticItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeFocus === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveFocus(item.id);
                      setActivePage('scan');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-card text-white font-semibold border-l-2 border-emerald-400 shadow-sm' 
                        : 'text-stone-300 hover:text-white hover:bg-card/40'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                      {item.label}
                    </span>
                    <span className="text-[10px] bg-stone-800/80 px-2 py-0.5 rounded-full border border-stone-700/60 text-stone-300 font-mono">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-card bg-sidebar/50 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-stone-300">
              {aiProvider === 'local' || aiProvider === 'trained-model' || !aiProvider ? 'Trained Vision AI (Active)' : `${aiProvider.toUpperCase()} Engine Active`}
            </span>
          </div>
          <span className="font-mono text-[10px] text-stone-500">v2.4</span>
        </div>
      </aside>
    </>
  );
};
