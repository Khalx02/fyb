import React from 'react';
import { Sun, Moon, Settings, Video, Menu, Cpu } from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenLiveCamera: () => void;
  onToggleMobileSidebar?: () => void;
  farmerName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenLiveCamera,
  onToggleMobileSidebar,
  farmerName = "Farmer Mark"
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 shrink-0 flex items-center justify-between glass-panel sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 rounded-lg lg:hidden text-stone-400 hover:text-stone-100 hover:bg-stone-800/50 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-2">
            <h2 className="font-sans font-bold text-sm sm:text-base tracking-tight truncate">
              Welcome back, {farmerName}!
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Cpu className="w-3 h-3 text-emerald-400" /> Trained AI Active
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-stone-400 truncate">
            Real-time cocoa pod maturity, leaf health, and disease classification engine.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Live Camera Pill */}
        <button
          onClick={onOpenLiveCamera}
          className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm shadow-emerald-500/10"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Live AI Scanner</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl border border-stone-700/50 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-400 bg-stone-800/40 hover:bg-stone-800/80 transition-all duration-200"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-stone-700/50 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-400 bg-stone-800/40 hover:bg-stone-800/80 transition-all duration-200"
          title="AI Model Configuration"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
