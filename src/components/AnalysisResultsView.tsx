import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Printer, 
  Calendar, 
  Sprout, 
  ArrowRight, 
  FileText,
  Check,
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface AnalysisResultsViewProps {
  result: AnalysisResult;
  onNewScan: () => void;
}

export const AnalysisResultsView: React.FC<AnalysisResultsViewProps> = ({
  result,
  onNewScan
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'risks' | 'steps'>('recommendations');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full shadow-2xl animate-fade-in print:border-none print:shadow-none print:p-0">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {result.objectType || 'Cocoa Pod Assessment'}
            </span>
            <span className="text-xs text-stone-400">
              AI Confidence: <strong className="text-primary font-mono">{result.ripenessScore}%</strong>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-primary">
            {result.ripenessLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-xl text-xs font-semibold border border-stone-700/60 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={onNewScan}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <span>New Scan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ripeness Score Meter */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-400 mb-2">
            Ripeness Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400">
              {result.ripenessScore}
            </span>
            <span className="text-xs text-stone-400">/ 100</span>
          </div>
          <div className="w-full h-2 bg-stone-800 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${result.ripenessScore}%` }}
            />
          </div>
        </div>

        {/* Harvest Window */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-400 mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Harvest Window
          </span>
          <span className="text-base font-bold text-primary">
            {result.bestHarvestWindow || '7 - 14 Days'}
          </span>
          <span className="text-[11px] text-stone-400 mt-1">
            Weeks to peak fat content: {result.weeksToHarvest}
          </span>
        </div>

        {/* Pod Age */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-400 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Estimated Pod Age
          </span>
          <span className="text-base font-bold text-primary">
            {result.estimatedAgeWeeks || '18 - 20 Weeks'}
          </span>
          <span className="text-[11px] text-stone-400 mt-1">
            Development stage: Maturing
          </span>
        </div>

        {/* Yield Estimate */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-400 mb-2 flex items-center gap-1.5">
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            Yield Potential
          </span>
          <span className="text-base font-bold text-emerald-400">
            {result.podYieldEstimate || 'High (45-50 beans)'}
          </span>
          <span className="text-[11px] text-stone-400 mt-1">
            Grade A fermentation potential
          </span>
        </div>
      </div>

      {/* Pod Characteristics Box */}
      {result.characteristics && (
        <div className="bg-input/60 p-4 rounded-2xl border border-card flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
              Visual Characteristics & Morphology
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              {result.characteristics}
            </p>
          </div>
        </div>
      )}

      {/* Tabbed Action Center */}
      <div className="flex flex-col gap-4">
        
        {/* Tabs switcher */}
        <div className="flex items-center gap-2 border-b border-card pb-2 print:hidden">
          {[
            { id: 'recommendations', label: 'Action Recommendations', count: result.harvestRecommendations?.length || 0, icon: CheckCircle2 },
            { id: 'risks', label: 'Risk Factors & Pests', count: result.risks?.length || 0, icon: AlertTriangle },
            { id: 'steps', label: 'Step-by-Step Care Guide', count: result.nextSteps?.length || 0, icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-[10px] bg-stone-800 px-2 py-0.5 rounded-full font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {result.harvestRecommendations?.map((rec, idx) => (
              <div
                key={idx}
                className="glass-card p-4 rounded-2xl flex items-start gap-3 border-l-4 border-l-emerald-400"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-stone-200 leading-relaxed font-medium">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Risks */}
        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {result.risks?.map((risk, idx) => (
              <div
                key={idx}
                className="glass-card p-4 rounded-2xl flex items-start gap-3 border-l-4 border-l-amber-400 bg-amber-500/5"
              >
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-stone-200 leading-relaxed font-medium">
                  {risk}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Step Checklist */}
        {activeTab === 'steps' && (
          <div className="space-y-2.5 animate-fade-in">
            {result.nextSteps?.map((step, idx) => {
              const isChecked = completedSteps.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    isChecked ? 'opacity-60 bg-emerald-500/5 border-emerald-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-600'
                    }`}>
                      {isChecked && <Check className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-semibold ${isChecked ? 'line-through text-stone-400' : 'text-primary'}`}>
                      {step}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">Step {idx + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
