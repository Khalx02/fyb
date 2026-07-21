import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  Mic, 
  Square, 
  Trash2, 
  Play, 
  Pause, 
  X, 
  Camera, 
  Leaf, 
  Circle, 
  Sprout, 
  AlertTriangle,
  Send,
  Loader2,
  FileText,
  AudioWaveform
} from 'lucide-react';
import { AppState, UploadedFile, PresetPrompt } from '../types';

interface ScanWorkspaceProps {
  state: AppState;
  text: string;
  setText: (txt: string) => void;
  activeFocus: string;
  setActiveFocus: (focus: string) => void;
  aiProvider: string;
  setAiProvider: (prov: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDeleteAudio: () => void;
  onRunAnalysis: () => void;
  onOpenLiveCamera: () => void;
  isPlayingAudio: boolean;
  onTogglePlayAudio: () => void;
  loadingTipIndex: number;
}

const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'ripeness',
    title: 'Pod Ripeness & Harvest',
    subtitle: 'Check pod coloration and harvest window',
    prompt: 'Assess pod ripeness, yellow/green ratio, estimated age, and recommended harvest window.',
    category: 'ripeness',
    icon: 'Circle'
  },
  {
    id: 'leaves',
    title: 'Leaf Health & Nutrients',
    subtitle: 'Identify nutrient deficiency or leaf spots',
    prompt: 'Analyze leaf structure for chlorosis, micro-nutrient deficiencies, or early fungal infection.',
    category: 'leaves',
    icon: 'Leaf'
  },
  {
    id: 'seeds',
    title: 'Cut Bean Fermentation',
    subtitle: 'Evaluate internal bean cut test quality',
    prompt: 'Analyze internal cut cocoa beans for fermentation percentage, slaty beans, or mold spores.',
    category: 'seeds',
    icon: 'Sprout'
  },
  {
    id: 'fungal',
    title: 'Black Pod & Fungal Check',
    subtitle: 'Detect Phytophthora or Frosty Pod symptoms',
    prompt: 'Scan for brown/black pod rot, Phytophthora spore patterns, or fungal pod decay risks.',
    category: 'fungal',
    icon: 'AlertTriangle'
  }
];

const LOADING_TIPS = [
  "Running computer vision models on pod coloration & surface texture...",
  "Estimating pod fill index & bean development metrics...",
  "Scanning leaf structure for chlorosis & micro-nutrient deficiencies...",
  "Evaluating pod surface for Black Pod (Phytophthora) spores...",
  "Calculating optimal harvest window for peak cocoa fat content...",
  "Synthesizing regional weather patterns and soil hydration factors..."
];

export const ScanWorkspace: React.FC<ScanWorkspaceProps> = ({
  state,
  text,
  setText,
  activeFocus,
  setActiveFocus,
  aiProvider,
  setAiProvider,
  onFileUpload,
  onRemoveFile,
  onStartRecording,
  onStopRecording,
  onDeleteAudio,
  onRunAnalysis,
  onOpenLiveCamera,
  isPlayingAudio,
  onTogglePlayAudio,
  loadingTipIndex
}) => {

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      
      {/* Diagnostic Focus Capsules */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ripeness', label: 'Pod Ripeness Assessment', icon: Circle },
          { id: 'leaves', label: 'Leaf Health Inspection', icon: Leaf },
          { id: 'seeds', label: 'Cut Bean Quality Test', icon: Sprout },
          { id: 'fungal', label: 'Fungal Risk Center', icon: AlertTriangle }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeFocus === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveFocus(item.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'bg-card text-stone-300 hover:text-white border border-card hover:border-emerald-500/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Quick Farmer Preset Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              setText(preset.prompt);
              setActiveFocus(preset.category);
            }}
            className="glass-card p-3.5 rounded-2xl text-left flex flex-col justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-primary group-hover:text-emerald-400 transition-colors">
                  {preset.title}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-[11px] text-stone-400 leading-tight">
                {preset.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Interactive Main Analysis Input Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 flex flex-col gap-5 relative overflow-hidden shadow-2xl">
        
        {/* Top bar: File Upload Dropzone + Camera Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-card pb-4">
          <div className="flex items-center gap-2">
            <label className="relative flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Photos / Files</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={onFileUpload}
                className="hidden-file-input"
              />
            </label>

            <button
              onClick={onOpenLiveCamera}
              className="flex items-center justify-center gap-2 bg-stone-800/80 border border-stone-700/60 hover:border-emerald-500/40 text-stone-200 hover:text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>

          {/* AI Provider selector */}
          <div className="flex items-center gap-1.5 bg-input p-1 rounded-xl border border-card self-end sm:self-auto overflow-x-auto">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 whitespace-nowrap">
              Engine:
            </span>
            {[
              { id: 'local', label: 'Trained Model' },
              { id: 'gemini', label: 'Gemini' },
              { id: 'openai', label: 'OpenAI' },
              { id: 'anthropic', label: 'Claude (Optional)' }
            ].map((prov) => (
              <button
                key={prov.id}
                onClick={() => setAiProvider(prov.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  aiProvider === prov.id || (prov.id === 'local' && (aiProvider === 'trained-model' || !aiProvider))
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {prov.label}
              </button>
            ))}
          </div>
        </div>

        {/* Uploaded files preview gallery */}
        {state.uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {state.uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative group rounded-2xl overflow-hidden border border-card bg-stone-900/80 w-24 h-24 flex flex-col items-center justify-center shadow-md"
              >
                {file.mimeType?.startsWith('image/') ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="p-2 text-center flex flex-col items-center gap-1">
                    <FileText className="w-6 h-6 text-emerald-400" />
                    <span className="text-[9px] text-stone-300 truncate w-20">
                      {file.name}
                    </span>
                  </div>
                )}
                
                {/* Category tag badge */}
                <span className="absolute bottom-1 left-1 right-1 text-[8px] font-bold bg-black/75 text-emerald-300 px-1 py-0.5 rounded text-center truncate">
                  {file.category}
                </span>

                {/* Remove file button */}
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice Note Recorder Section */}
        <div className="flex items-center gap-3 bg-input/60 p-3 rounded-2xl border border-card">
          {!state.recording ? (
            <button
              onClick={onStartRecording}
              className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>Record Voice Note</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={onStopRecording}
                className="flex items-center gap-2 bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop ({formatTime(state.recSeconds)})</span>
              </button>
              <div className="flex-1 h-2 bg-rose-500/20 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 animate-pulse w-full"></div>
              </div>
            </div>
          )}

          {state.audioName && !state.recording && (
            <div className="flex items-center gap-2 bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700/60 text-xs">
              <AudioWaveform className="w-4 h-4 text-emerald-400" />
              <span className="text-stone-300 font-mono text-[11px] truncate max-w-[120px]">
                {state.audioName}
              </span>
              <button
                onClick={onTogglePlayAudio}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onDeleteAudio}
                className="p-1 text-stone-400 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Text observation input area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe cocoa pod coloration, leaf condition, farm location, or soil observations..."
            rows={4}
            className="w-full bg-input/80 border border-card rounded-2xl p-4 text-sm text-primary placeholder-stone-400 focus:outline-none focus:border-emerald-500/60 transition-all resize-none custom-scrollbar"
          />
        </div>

        {/* Run Analysis Action Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {state.uploadedFiles.length > 0
              ? `${state.uploadedFiles.length} file(s) attached`
              : 'Add photos or voice for higher AI precision'}
          </span>

          <button
            onClick={onRunAnalysis}
            disabled={state.loading || (!text.trim() && state.uploadedFiles.length === 0 && !state.audioBlob)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {state.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Crop...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Diagnostic</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Overlay Animation with Tips */}
        {state.loading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-amber-500/20 border-b-amber-500 animate-spin flex items-center justify-center">
                <Leaf className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-base font-bold text-white mb-2">
              Evaluating Farm Data with ML Engine
            </h3>
            
            <p className="text-xs text-emerald-300/90 font-medium max-w-md animate-pulse min-h-[36px]">
              {LOADING_TIPS[loadingTipIndex]}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
