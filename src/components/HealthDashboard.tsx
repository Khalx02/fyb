import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Leaf, 
  Circle, 
  Sprout, 
  TrendingUp, 
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { ScanHistoryItem } from '../types';

interface HealthDashboardProps {
  scanHistory: ScanHistoryItem[];
  getCategoryCount: (cat: string) => number;
  getFungalRiskCount: () => number;
  onNewScan: () => void;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  scanHistory,
  getCategoryCount,
  getFungalRiskCount,
  onNewScan
}) => {

  const totalScans = scanHistory.length;
  const leafCount = getCategoryCount('Leaves');
  const podCount = getCategoryCount('Pods');
  const seedCount = getCategoryCount('Seeds / Beans');
  const fungalCount = getFungalRiskCount();

  const healthyRatio = totalScans > 0 
    ? Math.round(((totalScans - fungalCount) / totalScans) * 100) 
    : 92;

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950/40 via-stone-900 to-amber-950/30 border border-emerald-500/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Farm Health Intelligence
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-1">
              Cocoa Crop Health & Yield Overview
            </h2>
            <p className="text-xs text-stone-400 max-w-xl">
              Real-time analytics synthesized from computer vision diagnostics, leaf nutrient scans, and fungal risk detections.
            </p>
          </div>

          <button
            onClick={onNewScan}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <span>Run New Scan</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Scans */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold">Total Farm Scans</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{totalScans}</span>
            <span className="text-xs text-emerald-400 flex items-center font-semibold">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
            </span>
          </div>
          <span className="text-[11px] text-stone-500 mt-2">Recorded in active session</span>
        </div>

        {/* Card 2: Healthy Crop Index */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold">Healthy Crop Ratio</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">{healthyRatio}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${healthyRatio}%` }} />
          </div>
        </div>

        {/* Card 3: Fungal Risk Alerts */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold">Fungal Risk Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">{fungalCount}</span>
            <span className="text-xs text-stone-400">cases</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-2">Phytophthora & Black Pod watch</span>
        </div>

        {/* Card 4: Harvest Readiness */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold">Harvest Ready</span>
            <Circle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{podCount}</span>
            <span className="text-xs text-stone-400">pods analyzed</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-2">Optimal fat development</span>
        </div>
      </div>

      {/* Category Breakdown & Seasonal Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Diagnostic Category Distribution */}
        <div className="glass-card p-6 rounded-3xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            Diagnostic Breakdown by Focus
          </h3>

          <div className="space-y-4">
            {[
              { label: 'Leaf Health Scans', count: leafCount, icon: Leaf, color: 'bg-emerald-400' },
              { label: 'Pod Ripeness Tests', count: podCount, icon: Circle, color: 'bg-amber-400' },
              { label: 'Internal Cut Tests', count: seedCount, icon: Sprout, color: 'bg-indigo-400' },
              { label: 'Fungal Risk Detections', count: fungalCount, icon: AlertTriangle, color: 'bg-rose-400' }
            ].map((cat, idx) => {
              const Icon = cat.icon;
              const pct = totalScans > 0 ? Math.round((cat.count / totalScans) * 100) : 25;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-stone-300">
                      <Icon className="w-3.5 h-3.5 text-stone-400" />
                      {cat.label}
                    </span>
                    <span className="font-mono text-stone-400">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Seasonal Advisory & Weather Integration */}
        <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4" /> Seasonal Farm Management
            </div>
            <h3 className="text-base font-bold text-primary mb-2">
              Mid-Crop Season Recommended Protocols
            </h3>
            <ul className="space-y-3 text-xs text-stone-300">
              <li className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>Maintain canopy shade at 40-50% to prevent leaf sunscald during high irradiance periods.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>Sanitize harvesting shears between trees to eliminate cross-spore transmission of Black Pod rot.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Perform internal bean cut tests on every 500kg batch to ensure fermentation index &gt; 85%.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-card flex items-center justify-between text-xs text-stone-400">
            <span>Soil Moisture: <strong>68% Optimal</strong></span>
            <span>Relative Humidity: <strong>82% High</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
