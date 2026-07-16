import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageEntry, AnalysisResult, AppState } from './types';
import { 
  Sparkles, 
  Mic, 
  Square, 
  Trash2, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Play, 
  Pause, 
  ChevronRight, 
  Info,
  Clock,
  Heart,
  HelpCircle,
  Activity,
  ArrowRight,
  Leaf,
  Circle,
  Sprout,
  Trees,
  X,
  Video,
  Phone,
  PhoneOff,
  VideoOff,
  MicOff,
  Printer,
  Search,
  MessageSquare,
  Compass,
  Layers,
  Settings,
  ChevronDown,
  User,
  Plus,
  Menu
} from 'lucide-react';
import { LiveCamera } from './components/LiveCamera';

const LOADING_TIPS = [
  "Running computer vision models on skin color & textures...",
  "Estimating pod fill index & bean development metrics...",
  "Scanning leaf structure for micro-nutrient deficiencies...",
  "Evaluating pod surface for Black Pod (Phytophthora) spores...",
  "Calculating optimal harvest window for peak cocoa fat content...",
  "Synthesizing regional weather patterns and soil hydration factors..."
];

export default function App() {
  const [state, setState] = useState<AppState>({
    images: [],
    uploadedFiles: [],
    audioBlob: null,
    audioName: "",
    recording: false,
    recSeconds: 0,
    loading: false,
    result: null,
    error: null,
  });

  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeFocus, setActiveFocus] = useState<string>('ripeness');
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'risks' | 'steps'>('recommendations');
  const [activePage, setActivePage] = useState<'scan' | 'health' | 'history' | 'profile'>('scan');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
    meta: ''
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cocoasense_history');
      if (stored) {
        setScanHistory(JSON.parse(stored));
      }
      const storedProvider = localStorage.getItem('cacaolens_provider');
      if (storedProvider) setAiProvider(storedProvider);
      
      const storedKeys = localStorage.getItem('cacaolens_keys');
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));
    } catch (e) {
      console.error("Failed to load settings/history:", e);
    }
  }, []);

  const saveToHistory = (newResult: AnalysisResult, currentText: string, currentFiles: any[], currentAudioName?: string) => {
    const newScan = {
      id: `scan_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      text: currentText,
      uploadedFiles: currentFiles.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        dataUrl: f.dataUrl,
        mimeType: f.mimeType,
        size: f.size,
        category: f.category
      })),
      audioName: currentAudioName || "",
      result: newResult
    };

    setScanHistory(prev => {
      const updated = [newScan, ...prev];
      localStorage.setItem('cocoasense_history', JSON.stringify(updated));
      return updated;
    });
    setActiveHistoryId(newScan.id);
  };

  const getCategoryCount = (catName: string) => {
    let count = 0;
    scanHistory.forEach(scan => {
      // Check uploadedFiles first
      if (scan.uploadedFiles) {
        scan.uploadedFiles.forEach((file: any) => {
          if (file.category === catName || (catName === 'Leaves' && file.category === 'Leaf Health') || (catName === 'Pods' && file.category === 'Pod Ripeness') || (catName === 'Seeds / Beans' && file.category === 'Internal Cut Tests')) {
            count++;
          }
        });
      } else if (scan.images) {
        scan.images.forEach((img: any) => {
          if (img.category === catName) count++;
        });
      }
    });
    return count;
  };

  const getFungalRiskCount = () => {
    let count = 0;
    scanHistory.forEach(scan => {
      if (scan.result?.risks && scan.result.risks.length > 0) {
        count++;
      }
    });
    return count;
  };

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Cycle loading tips during analysis
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.loading) {
      interval = setInterval(() => {
        setLoadingTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [state.loading]);

  // Audio player listener
  useEffect(() => {
    if (state.audioBlob) {
      const url = URL.createObjectURL(state.audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [state.audioBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
        setState(prev => ({
          ...prev,
          audioBlob: blob,
          audioName: `voice_note_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.webm`,
          recording: false,
          recSeconds: 0
        }));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setState(prev => ({ ...prev, recording: true, recSeconds: 0 }));

      recIntervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recSeconds: prev.recSeconds + 1 }));
      }, 1000);

    } catch (err) {
      setState(prev => ({ ...prev, error: "Microphone access denied. Please allow microphone permissions in your browser." }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  const handleUploadedFiles = (files: FileList | null, customCategory?: string) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      // Categorize based on file extension or mimeType
      let category = customCategory || "Document";
      if (file.type.startsWith('image/')) {
        category = customCategory || "Leaves";
      } else if (file.type.startsWith('video/')) {
        category = "Video";
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        category = "Spreadsheet";
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.log') || file.name.endsWith('.json') || file.name.endsWith('.xml')) {
        category = "Farm Log";
      }

      // Check if it's text-readable
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.csv') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.log') || 
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.xml');

      reader.onload = () => {
        let dataUrl = "";
        if (isText) {
          const textContent = reader.result as string;
          // Clean base64 encoding that supports UTF-8
          const base64 = btoa(unescape(encodeURIComponent(textContent)));
          dataUrl = `data:text/plain;base64,${base64}`;
        } else {
          dataUrl = reader.result as string;
        }

        const newFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          path: (file as any).webkitRelativePath || undefined,
          dataUrl: dataUrl,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          category: category
        };

        setState(prev => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, newFile]
        }));
      };

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
    setActiveHistoryId(null);
  };

  const removeUploadedFile = (id: string) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(f => f.id !== id)
    }));
    setActiveHistoryId(null);
  };

  const loadHistoryItem = (scan: any) => {
    setActiveHistoryId(scan.id);
    setText(scan.text);
    setState(prev => ({
      ...prev,
      uploadedFiles: scan.uploadedFiles || [],
      images: [],
      audioBlob: null,
      audioName: scan.audioName || "",
      result: scan.result,
      error: null
    }));
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScanHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('cocoasense_history', JSON.stringify(updated));
      return updated;
    });
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      clearInputs();
    }
  };

  const clearInputs = () => {
    setText("");
    setActiveHistoryId(null);
    setState(prev => ({
      ...prev,
      images: [],
      uploadedFiles: [],
      audioBlob: null,
      audioName: "",
      result: null,
      error: null
    }));
  };

  const getAudioBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1] || '');
        } else {
          resolve('');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const runAnalysis = async () => {
    if (!text && state.uploadedFiles.length === 0 && !state.audioBlob) {
      setState(prev => ({ ...prev, error: 'Please provide at least one input: type observations, record a voice memo, or upload images, videos, documents, or farm folders.' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null }));
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      let audioPayload = null;
      if (state.audioBlob) {
        const base64Audio = await getAudioBase64(state.audioBlob);
        audioPayload = {
          data: base64Audio,
          mimeType: state.audioBlob.type || 'audio/webm'
        };
      }

      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: apiKeys[aiProvider] || undefined,
          text: text + (state.audioName ? ` [Voice note transcript or intent context provided under file ${state.audioName}]` : ''),
          files: state.uploadedFiles.map(f => ({
            name: f.name,
            path: f.path,
            data: f.dataUrl.split(',')[1],
            mimeType: f.mimeType,
            size: f.size
          })),
          audio: audioPayload
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      setState(prev => ({ ...prev, result, loading: false }));
      saveToHistory(result, text, state.uploadedFiles, state.audioName);
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: `Analysis failed: ${err.message}` }));
    }
  };

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Filter local scans history based on search query
  const filteredHistory = scanHistory.filter(scan => 
    scan.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    scan.result?.ripenessLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scan.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-brand-bg text-foreground font-sans selection:bg-accent-indigo/30 selection:text-white">
      
      {/* 1. LEFT SIDEBAR PANEL (Desktop Only) */}
      <aside className={`w-64 border-r border-card-border bg-sidebar-bg shrink-0 flex-col transition-transform duration-300 z-40 hidden lg:flex print:hidden`}>
        {/* Sidebar Header */}
        <div className="h-16 px-5 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/10 border border-accent-indigo/20 flex items-center justify-center glow-indigo">
              <Leaf className="w-4 h-4 text-accent-indigo" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm tracking-wide text-stone-900 leading-none">
                CacaoLens
              </h1>
              <span className="text-[9px] text-stone-500 font-semibold tracking-widest uppercase">
                AI COCOA LAB
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar flex flex-col gap-6">
          
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search farm cases..."
              className="w-full bg-brand-bg border border-card-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-stone-900 placeholder-muted-foreground focus:outline-none focus:border-accent-indigo/50 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stone-900"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Menu Section 1: Ask AI */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest px-2 mb-2">
              <span>Ask AI Core</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="space-y-1">
              <button 
                onClick={clearInputs}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-stone-800 bg-card-bg border border-card-border/60 hover:bg-stone-50 transition-all duration-150"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-accent-indigo" />
                  New Analysis
                </span>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              
              <button 
                onClick={() => {
                  setIsLiveCameraOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-card-bg/40 transition-all duration-150"
              >
                <Video className="w-3.5 h-3.5 text-accent-green" />
                Live AI Assist
              </button>
            </div>
          </div>

          {/* Menu Section 2: Farm Categories */}
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-2 block mb-2">
              Diagnostics
            </span>
            <div className="space-y-1 text-xs">
              {[
                { label: 'Leaf Health', count: getCategoryCount('Leaves'), icon: Leaf, active: activeFocus === 'leaves', id: 'leaves' },
                { label: 'Pod Ripeness', count: getCategoryCount('Pods'), icon: Circle, active: activeFocus === 'ripeness', id: 'ripeness' },
                { label: 'Internal Cut Tests', count: getCategoryCount('Seeds / Beans'), icon: Sprout, active: activeFocus === 'seeds', id: 'seeds' },
                { label: 'Fungal Risk Center', count: getFungalRiskCount(), icon: AlertTriangle, active: activeFocus === 'fungal', id: 'fungal' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFocus(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all duration-150 ${
                      item.active 
                        ? 'bg-card-bg text-stone-900 font-bold border-l-2 border-accent-indigo' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-card-bg/30'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${item.active ? 'text-accent-indigo' : 'text-muted-foreground'}`} />
                      {item.label}
                    </span>
                    <span className="text-[10px] bg-brand-bg px-1.5 py-0.5 rounded border border-card-border text-stone-600">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>


      </aside>

      {/* 2. CENTRAL WORKSPACE PANEL */}
      <div className="flex-1 bg-workspace-bg flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden relative custom-scrollbar pb-24 lg:pb-0">
        
        {/* Top Header Row of Workspace */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-card-border shrink-0 flex items-center gap-4 glass-panel sticky top-0 z-30 print:hidden">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold text-stone-900 truncate">
              Good day, Farmer Mark!
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              What cocoa crops or pods would you like to evaluate today?
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors hidden lg:block"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsLiveCameraOpen(true)}
              className="flex items-center gap-1.5 bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
              Live AI Assist
            </button>
          </div>
        </header>

        {/* Workspace Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 lg:pb-16 print:p-0">
          
          {(activePage === 'scan' || activePage === 'health') && (
            <>
              {/* horizontal FOCUS selector capsules (MindLink Style) */}
          <div className="print:hidden">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2.5">
              Choose your diagnostic focus
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ripeness', label: 'Evaluate ripeness & age' },
                { id: 'disease', label: 'Identify fungal stress' },
                { id: 'cut-test', label: 'Inspect internal bean cut' },
                { id: 'nutrition', label: 'Scan canopy & leaf nutrition' },
                { id: 'live-consult', label: 'Ask Live advisory bot' }
              ].map(pill => {
                const isSelected = activeFocus === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setActiveFocus(pill.id);
                      if (pill.id === 'live-consult') setIsLiveCameraOpen(true);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                      isSelected 
                        ? 'bg-accent-green border-accent-green text-stone-900 font-semibold shadow-sm cursor-pointer' 
                        : 'bg-card-bg border-card-border text-muted-foreground hover:text-stone-900 hover:bg-card-hover cursor-pointer'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Recent Scans Carousel (Visible below xl if history exists) */}
          {filteredHistory.length > 0 && (
            <div id="history-section" className="xl:hidden print:hidden">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2.5">
                Recent Field Scans
              </span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                {filteredHistory.map((scan, idx) => {
                  const isActive = activeHistoryId === scan.id;
                  return (
                    <button
                      key={scan.id}
                      onClick={() => loadHistoryItem(scan)}
                      className={`text-left p-3.5 rounded-xl border text-xs shrink-0 w-64 snap-start transition-all duration-200 cursor-pointer relative ${
                        isActive 
                          ? 'bg-accent-indigo/15 border-accent-indigo text-stone-900 ring-1 ring-accent-indigo/20' 
                          : 'bg-card-bg border-card-border text-muted-foreground hover:text-stone-900'
                      }`}
                    >
                      <div className="font-semibold flex items-start gap-1 justify-between">
                        <div className="flex items-start gap-1 min-w-0">
                          <span className="text-accent-indigo">{idx + 1}.</span>
                          <span className="truncate">{scan.result.ripenessLabel} ({scan.result.ripenessScore}%)</span>
                        </div>
                        <button 
                          onClick={(e) => deleteHistoryItem(scan.id, e)}
                          className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                          title="Delete scan"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-relaxed pl-3.5">
                        {scan.text || "No notes provided"}
                      </p>
                      <div className="flex items-center justify-between mt-2 pl-3.5">
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-card-border bg-brand-bg text-muted-foreground">
                          {scan.timestamp}
                        </span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: scan.result.gaugeColor }}>
                          {scan.result.weeksToHarvest}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Core Interactive AI Terminal (High visual fidelity to screenshot) */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-4 sm:p-6 glow-indigo relative overflow-hidden print:hidden">
            
            {/* Header label */}
            <div className="flex items-center justify-between mb-4 border-b border-card-border pb-3">
              <span className="text-xs font-semibold text-stone-900 tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-indigo animate-pulse" />
                Ask something about your crop or upload snapshot
              </span>
              <div className="text-[10px] text-stone-500 font-mono bg-brand-bg px-2 py-0.5 rounded border border-card-border">
                Gemini 2.5 Flash active
              </div>
            </div>

            {/* Glowing Bot Illustration & Conversational Speech Bubble */}
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-brand-bg/40 border border-card-border/50 rounded-xl p-5 mb-5">
              <div className="shrink-0 flex items-center justify-center p-2 bg-gradient-to-b from-card-bg to-brand-bg rounded-full border border-card-border">
                {/* Stunning customized cute digital robot SVG matching the screenshot */}
                <svg viewBox="0 0 120 120" className="w-20 h-20 drop-shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-bounce" style={{ animationDuration: '4s' }}>
                  <rect x="26" y="50" width="6" height="16" rx="3" fill="#4F46E5" />
                  <rect x="88" y="50" width="6" height="16" rx="3" fill="#4F46E5" />
                  <rect x="32" y="32" width="56" height="56" rx="28" fill="#5F5DF0" />
                  <rect x="38" y="42" width="44" height="24" rx="12" fill="#1E1B4B" />
                  {/* Glowing cute green eyes matching screenshot UI dots */}
                  <circle cx="49" cy="54" r="5" fill="#10B981" />
                  <circle cx="49" cy="54" r="2" fill="#FFFFFF" />
                  <circle cx="71" cy="54" r="5" fill="#10B981" />
                  <circle cx="71" cy="54" r="2" fill="#FFFFFF" />
                  <path d="M54 61 Q60 64 66 61" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <rect x="52" y="78" width="16" height="4" rx="2" fill="#818CF8" />
                  <path d="M55 76 C55 72, 60 70, 65 72 C68 70, 74 72, 74 75 C77 75, 78 78, 77 81 C75 83, 58 83, 55 81 Z" fill="#818CF8" opacity="0.9" />
                </svg>
              </div>

              <div className="flex-1">
                <div className="bg-card-bg/80 border border-card-border p-3.5 rounded-xl relative text-xs leading-relaxed text-stone-700">
                  <div className="absolute left-4 -top-2.5 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-card-border"></div>
                  <strong className="text-stone-900 block mb-1">CacaoLens Advisory Engine:</strong>
                  "Upload photos or video clips of your leaves, cocoa pods or cut seeds. I can estimate weeks to harvest, ripening indexes, yield projections, and identify diseases like Black Pod rot. Speak a field memo or type observations below."
                  <span className="block mt-2 font-mono text-[9px] text-accent-indigo">... Waiting for scan input</span>
                </div>
              </div>
            </div>

            {/* Input elements wrapper */}
            <div className="space-y-4">
              
              {/* Universal Premium Upload Stations */}
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Attach & Categorise Field Media, Files, & Folders
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Station 1: Photos & Videos */}
                  <div className="group border border-dashed border-card-border hover:border-accent-indigo/50 bg-white hover:bg-stone-50/50 rounded-xl p-3.5 text-center cursor-pointer relative transition-all duration-200">
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      multiple 
                      className="hidden-file-input absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => handleUploadedFiles(e.target.files)}
                    />
                    <div className="group-hover:scale-105 transition-transform duration-200 flex justify-center mb-1.5">
                      <Camera className="w-5 h-5 text-accent-indigo" />
                    </div>
                    <div className="font-semibold text-xs text-stone-900">Photos & Videos</div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">Leaves, pods, cut seeds, or walk clips</div>
                  </div>

                  {/* Station 2: Agricultural Records / Spreadsheets */}
                  <div className="group border border-dashed border-card-border hover:border-accent-green/50 bg-white hover:bg-stone-50/50 rounded-xl p-3.5 text-center cursor-pointer relative transition-all duration-200">
                    <input 
                      type="file" 
                      accept=".csv,.xlsx,.txt,.log,.json,.pdf,.xml" 
                      multiple 
                      className="hidden-file-input absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => handleUploadedFiles(e.target.files)}
                    />
                    <div className="group-hover:scale-105 transition-transform duration-200 flex justify-center mb-1.5">
                      <FileText className="w-5 h-5 text-accent-green" />
                    </div>
                    <div className="font-semibold text-xs text-stone-900">Farm Documents</div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">CSVs, PDFs, text logs, or spreadsheets</div>
                  </div>

                  {/* Station 3: Full Local Directory / Folder */}
                  <div className="group border border-dashed border-card-border hover:border-accent-amber/50 bg-white hover:bg-stone-50/50 rounded-xl p-3.5 text-center cursor-pointer relative transition-all duration-200">
                    <input 
                      type="file" 
                      {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                      className="hidden-file-input absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => handleUploadedFiles(e.target.files)}
                    />
                    <div className="group-hover:scale-105 transition-transform duration-200 flex justify-center mb-1.5">
                      <Layers className="w-5 h-5 text-accent-amber" />
                    </div>
                    <div className="font-semibold text-xs text-stone-900">Upload Entire Folder</div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">Maintains directory paths & hierarchies</div>
                  </div>
                </div>
              </div>

              {/* Show selected files, media & folders list */}
              {state.uploadedFiles.length > 0 && (
                <div className="bg-white border border-card-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                      Active Field Files & Folders ({state.uploadedFiles.length})
                    </span>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, uploadedFiles: [] }))}
                      className="text-[10px] text-red-500 hover:underline font-semibold"
                    >
                      Remove All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                    {state.uploadedFiles.map((file) => {
                      const isImage = file.mimeType.startsWith('image/');
                      const isVideo = file.mimeType.startsWith('video/');
                      return (
                        <div 
                          key={file.id} 
                          className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200/80 bg-stone-50/30 hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Visual Preview Badge */}
                            <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {isImage ? (
                                <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                              ) : isVideo ? (
                                <Video className="w-5 h-5 text-accent-indigo" />
                              ) : (
                                <FileText className="w-5 h-5 text-accent-green" />
                              )}
                            </div>
                            
                            {/* Metadata details */}
                            <div className="min-w-0 leading-tight">
                              <h5 className="text-xs font-semibold text-stone-900 truncate">
                                {file.name}
                              </h5>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {file.path && (
                                  <span className="text-[8px] bg-amber-50 text-accent-amber border border-amber-200/50 px-1 py-0.2 rounded font-mono truncate max-w-[120px]">
                                    📁 {file.path.split('/').slice(0, -1).join('/') || 'Root'}
                                  </span>
                                )}
                                <span className="text-[9px] text-stone-500 font-mono">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                                <span className="text-[9px] text-stone-500 capitalize bg-stone-100 px-1 rounded">
                                  {file.category}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => removeUploadedFile(file.id)}
                            className="text-stone-400 hover:text-red-500 p-1 rounded-full hover:bg-stone-100 transition-colors shrink-0"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Text Description Box & Voice memo drawer */}
              <div className="bg-stone-50/50 border border-card-border rounded-xl p-4 space-y-3">
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setActiveHistoryId(null);
                  }}
                  placeholder="Describe pod skin saturation, sounds upon tapping, weather details, crop anomalies, or context on the uploaded documents/folders..."
                  className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none resize-none h-20 custom-scrollbar leading-relaxed"
                />

                {/* Voice recorder footer block */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-stone-200/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={state.recording ? stopRecording : startRecording}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 shrink-0 ${
                        state.recording 
                          ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20' 
                          : 'bg-accent-indigo hover:bg-accent-indigo/90 text-white'
                      }`}
                      title={state.recording ? 'Stop voice recording' : 'Record voice field note'}
                    >
                      {state.recording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900 leading-none">
                        {state.recording ? 'Recording voice note...' : 'Record field note'}
                      </h4>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        {state.recording ? 'Capturing audio description' : 'Hands-free voice transcription'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {state.recording ? (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        <span className="font-mono text-xs font-bold text-red-400">{formatTime(state.recSeconds)}</span>
                      </div>
                    ) : audioUrl ? (
                      <div className="flex items-center gap-2 bg-accent-indigo/10 border border-accent-indigo/20 px-2 py-1 rounded-lg">
                        <button 
                          onClick={togglePlayback}
                          className="text-accent-indigo hover:text-white transition-colors"
                        >
                          {isPlayingAudio ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                        </button>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px] font-mono">
                          {state.audioName}
                        </span>
                        <button 
                          onClick={() => setState(prev => ({ ...prev, audioBlob: null, audioName: "" }))}
                          className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="text-[10px] text-white hover:text-white font-semibold cursor-pointer flex items-center gap-1.5 bg-card-bg border border-card-border px-2.5 py-1.5 rounded-lg hover:bg-card-hover transition-colors">
                        <Upload className="w-3 h-3 text-muted-foreground" />
                        Attach voice file
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setState(prev => ({ ...prev, audioBlob: file, audioName: file.name }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {audioUrl && (
                <audio 
                  ref={audioPlayerRef} 
                  src={audioUrl} 
                  onEnded={handleAudioEnded} 
                  className="hidden" 
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={clearInputs}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white bg-transparent hover:bg-card-hover rounded-xl border border-card-border transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={state.loading}
                  className="px-6 py-2 bg-accent-indigo hover:bg-accent-indigo/90 disabled:bg-muted-foreground/30 text-white text-xs font-semibold rounded-xl shadow-md glow-indigo transition-all duration-200 flex items-center gap-2 cursor-pointer select-none"
                >
                  {state.loading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Analyse Snapshot
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* Error Banner if any */}
          {state.error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-950/40 border border-red-900/50 text-red-300 rounded-xl flex items-start gap-3 print:hidden"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">{state.error}</div>
            </motion.div>
          )}

          {/* ACTIVE ADVISORY RESULTS - High visual fidelity with the screenshot (Phases & Toggles) */}
          <div ref={resultsRef} className="print:block">
            <AnimatePresence mode="wait">
              {state.loading ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-card-bg rounded-2xl p-8 border border-card-border text-center min-h-[400px] flex flex-col justify-center items-center"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-card-border border-t-accent-indigo animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-accent-indigo animate-pulse" />
                    </div>
                  </div>
                  <h3 className="font-display text-base font-bold text-white mb-2">Analyzing Snapshot...</h3>
                  <p className="text-muted-foreground text-xs max-w-sm mb-6 leading-relaxed">
                    Analyzing cocoa skin characteristics, ridge tone histograms, density metrics, and active leaf anomalies.
                  </p>
                  <div className="bg-brand-bg/50 border border-card-border rounded-lg p-3 max-w-sm w-full min-h-[50px] flex items-center justify-center">
                    <motion.p 
                      key={loadingTipIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-accent-indigo text-[10px] font-mono tracking-wide"
                    >
                      {LOADING_TIPS[loadingTipIndex]}
                    </motion.p>
                  </div>
                </motion.div>
              ) : state.result ? (
                <motion.div
                  key="results-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {state.result.isCocoa === false ? (
                    <div className="bg-white border border-card-border rounded-2xl overflow-hidden shadow-xl p-8 text-center flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center border border-accent-red/20 mb-4 text-accent-red">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-stone-900 mb-2">Non-Cocoa Subject Detected</h3>
                      <p className="text-sm text-stone-600 max-w-md leading-relaxed mb-6">
                        {state.result.characteristics}
                      </p>
                      <button 
                        onClick={clearInputs}
                        className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
                      >
                        Start New Scan
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-6">
                      <div className="bg-white border border-card-border rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-card-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: '#FAF9F5' }}>
                          <div className="flex items-center gap-3.5">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center border glow-green"
                              style={{ backgroundColor: `${state.result.gaugeColor}10`, borderColor: `${state.result.gaugeColor}30`, color: state.result.gaugeColor }}
                            >
                              <Heart className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-0.5">
                                Estimated Ripeness Category
                                {state.result.objectType && (
                                  <span className="px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded text-[8px]">{state.result.objectType}</span>
                                )}
                              </span>
                              <h4 className="font-display text-lg font-bold text-stone-900">
                                {state.result.ripenessLabel}
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold block mb-0.5">
                                Ripeness Score Index
                              </span>
                              <span className="text-2xl font-display font-extrabold" style={{ color: state.result.gaugeColor }}>
                                {state.result.ripenessScore}%
                              </span>
                            </div>
                            {/* Dial Metric (Visual Accent) */}
                            <div className="relative w-12 h-12">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" className="text-stone-100" strokeWidth="4" stroke="currentColor" fill="transparent" />
                                <circle 
                                  cx="24" cy="24" r="20" 
                                  stroke={state.result.gaugeColor || '#10B981'} 
                                  strokeWidth="4" 
                                  strokeDasharray={125.6} 
                                  strokeDashoffset={125.6 - (125.6 * state.result.ripenessScore) / 100}
                                  strokeLinecap="round" 
                                  fill="transparent" 
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
  
                      {/* Bento Tiles of Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-200 border-b border-card-border">
                          <div className="bg-white p-4 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-1">
                              Weeks to Harvest
                            </span>
                            <span className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
                              <Clock className="w-4.5 h-4.5 text-accent-indigo" />
                              {state.result.weeksToHarvest}
                            </span>
                          </div>
                          <div className="bg-white p-4 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-1">
                              Estimated Pod Age
                            </span>
                            <span className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
                              <Calendar className="w-4.5 h-4.5 text-accent-green" />
                              {state.result.estimatedAgeWeeks}
                            </span>
                          </div>
                          <div className="bg-white p-4 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-1">
                              Best Harvest Window
                            </span>
                            <span className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4.5 h-4.5 text-accent-green" />
                              {state.result.bestHarvestWindow}
                            </span>
                          </div>
                          <div className="bg-white p-4 flex flex-col justify-between">
                            <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-1">
                              Yield Expected
                            </span>
                            <span className="font-display text-sm font-bold text-stone-900 flex items-center gap-1.5">
                              <Sparkles className="w-4.5 h-4.5 text-accent-amber" />
                              {state.result.podYieldEstimate}
                            </span>
                          </div>
                        </div>
    
                        {/* Description and Observations */}
                        <div className="p-6 space-y-6">
                          
                          {/* Human-Centered Observations text */}
                          <div>
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">
                              Observation Summary
                            </span>
                            <p className="text-xs text-stone-800 leading-relaxed">
                              {state.result.characteristics}
                            </p>
                          </div>
    
                          {/* MindLink Style Goal/Status indicators */}
                          <div>
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2.5">
                              Harvest Phases & Status Checklist
                            </span>
                            <div className="space-y-2">
                              <div className="bg-stone-50 border border-card-border p-3 rounded-lg flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2">
                                  <span className="text-[10px] bg-accent-green/20 text-accent-green px-1.5 py-0.5 rounded border border-accent-green/30 uppercase font-bold tracking-wider">Goal</span>
                                  <strong className="text-stone-800">Phase 1 - Pick ripe yellow pods</strong>
                                </span>
                                <span className="flex items-center gap-1 text-accent-green font-semibold text-[10px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                </span>
                              </div>
    
                              <div className="bg-stone-50 border border-card-border p-3 rounded-lg flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2">
                                  <span className="text-[10px] bg-accent-amber/20 text-accent-amber px-1.5 py-0.5 rounded border border-accent-amber/30 uppercase font-bold tracking-wider">Task</span>
                                  <strong className="text-stone-800">Phase 2 - Perform bean internal cut test</strong>
                                </span>
                                <span className="flex items-center gap-1 text-accent-amber font-semibold text-[10px]">
                                  <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></span> Underway
                                </span>
                              </div>

                          <div className="bg-stone-50 border border-card-border p-3 rounded-lg flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <span className="text-[10px] bg-stone-200/50 text-stone-600 px-1.5 py-0.5 rounded border border-card-border uppercase font-bold tracking-wider">Plan</span>
                              <strong className="text-stone-800">Phase 3 - Fermentation & shade drying setup</strong>
                            </span>
                            <span className="text-stone-500 text-[10px] font-semibold">
                              Scheduled
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Accordion tabs matching layout */}
                      <div className="border border-card-border rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="flex border-b border-card-border bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                          {[
                            { id: 'recommendations', label: 'Harvest Tips', icon: CheckCircle2 },
                            { id: 'risks', label: 'Risks / Disease', icon: AlertTriangle },
                            { id: 'steps', label: 'Farmer Actions', icon: ArrowRight }
                          ].map(tab => {
                            const Icon = tab.icon;
                            const isCurrent = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-3 px-1 text-center border-r last:border-r-0 border-card-border flex items-center justify-center gap-1.5 transition-colors ${
                                  isCurrent ? 'bg-white text-stone-900 font-bold border-b border-b-accent-indigo' : 'hover:bg-stone-50 hover:text-stone-900'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-accent-indigo' : 'text-muted-foreground'}`} />
                                <span className="hidden sm:inline">{tab.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-4 text-xs text-stone-800 min-h-[140px]">
                          <AnimatePresence mode="wait">
                            {activeTab === 'recommendations' && (
                              <motion.ul
                                key="recommendations-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2.5"
                              >
                                {state.result.harvestRecommendations.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="w-4.5 h-4.5 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold font-mono border border-accent-green/20">
                                      {idx + 1}
                                    </span>
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </motion.ul>
                            )}

                            {activeTab === 'risks' && (
                              <motion.ul
                                key="risks-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2.5"
                              >
                                {state.result.risks && state.result.risks.length > 0 ? (
                                  state.result.risks.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                      <span className="w-4.5 h-4.5 rounded-full bg-red-500/15 text-red-600 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold font-mono border border-red-500/20">
                                        !
                                      </span>
                                      <span className="leading-relaxed">{item}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-stone-500 italic flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-4.5 h-4.5 text-accent-green shrink-0" />
                                    No immediate disease or infestation risks detected on cacao bark or canopy leaves. Keep up the clean hygiene standards!
                                  </li>
                                )}
                              </motion.ul>
                            )}

                            {activeTab === 'steps' && (
                              <motion.ul
                                key="steps-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2.5"
                              >
                                {state.result.nextSteps.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="w-4.5 h-4.5 rounded-full bg-accent-indigo/10 text-accent-indigo flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold font-mono border border-accent-indigo/20">
                                      {idx + 1}
                                    </span>
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      </div>

                      {/* Download PDF report panel */}
                      <div className="pt-4 border-t border-card-border mt-2 flex justify-end no-print">
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-2 bg-accent-indigo text-white hover:bg-accent-indigo/90 px-4 py-2 rounded-xl transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Download Report
                        </button>
                      </div>

                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl p-8 border border-card-border text-center min-h-[160px] flex flex-col justify-center items-center print:hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-bg border border-card-border flex items-center justify-center mb-3 text-stone-500">
                    <HelpCircle className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-stone-900 mb-1">Ready for Diagnostic Scans</h3>
                  <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                    Provide field notes, speak into the mic, upload photos of your cacao crop, or select one of the quick scenario presets in the right panel to get started.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </>
          )}

          {activePage === 'history' && (
            <div className="space-y-4 max-w-3xl mx-auto w-full pb-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-stone-900">Your History</h2>
                {scanHistory.length > 0 && (
                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to clear all past scans?")) {
                        setScanHistory([]);
                        localStorage.removeItem('cocoasense_history');
                        clearInputs();
                      }
                    }}
                    className="text-xs text-stone-500 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {scanHistory.map((scan, idx) => (
                  <div key={scan.id} className="bg-white border border-card-border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-stone-900">{scan.result.ripenessLabel}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: scan.result.gaugeColor }}>{scan.result.ripenessScore}%</span>
                      </div>
                      <p className="text-xs text-stone-500 mb-2">{scan.text || "No notes provided"}</p>
                      <span className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-stone-100">{scan.timestamp}</span>
                    </div>
                    <button
                      onClick={() => {
                        loadHistoryItem(scan);
                        setActivePage('scan');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors w-full sm:w-auto"
                    >
                      View Report
                    </button>
                  </div>
                ))}
                {scanHistory.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-card-border rounded-2xl bg-brand-bg/50">
                    <Clock className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500 text-sm">No history found. Start scanning!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePage === 'profile' && (
            <div className="space-y-6 max-w-2xl mx-auto w-full pb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-accent-indigo/10 flex items-center justify-center border border-accent-indigo/20">
                  <User className="w-8 h-8 text-accent-indigo" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">Farmer Mark</h2>
                  <p className="text-xs text-stone-500">Premium Local Storage Account</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
                  <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Total Scans</h4>
                  <span className="text-2xl font-display font-bold text-stone-900">{scanHistory.length}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
                  <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Local Data Size</h4>
                  <span className="text-2xl font-display font-bold text-stone-900">
                    {(JSON.stringify(scanHistory).length / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent-green" /> Local Storage Active
                  </h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  You are the sole owner of your data. All scans, notes, and photos are saved directly to your device's local storage. We do not store your data on external databases.
                </p>
              </div>

              <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-stone-500" /> AI Preferences
                  </h3>
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl text-xs font-bold transition-colors"
                  >
                    Edit API Keys
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-3">
                    <span className="text-stone-500 font-semibold">Active AI Provider</span>
                    <span className="text-stone-900 font-bold uppercase">{aiProvider}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. RIGHT SIDEBAR PANEL (MindLink Style - Recent conversations & Presets) */}
      <aside className="w-72 border-l border-card-border bg-sidebar-bg shrink-0 hidden xl:flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar print:hidden">
        
        {/* Recent scans list header */}
        <div id="history-section">
          <div className="flex items-center gap-2 text-stone-900 font-medium text-xs mb-3 justify-between">
            <span className="flex items-center gap-2 font-bold">
              <Clock className="w-3.5 h-3.5 text-accent-indigo" />
              <span>Recent conversations & Scans</span>
            </span>
            {scanHistory.length > 0 && (
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to clear all past scans?")) {
                    setScanHistory([]);
                    localStorage.removeItem('cocoasense_history');
                    clearInputs();
                  }
                }}
                className="text-[10px] text-stone-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                title="Clear history"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Dropdown Filters (MindLink Style visual feature) */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="relative">
              <select className="w-full bg-brand-bg border border-card-border text-[10px] text-stone-900 rounded px-2 py-1 focus:outline-none appearance-none cursor-pointer">
                <option>All Scans</option>
              </select>
              <ChevronDown className="w-3 h-3 text-stone-500 absolute right-2 top-1.5 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="w-full bg-brand-bg border border-card-border text-[10px] text-stone-900 rounded px-2 py-1 focus:outline-none appearance-none cursor-pointer">
                <option>Sorted: Newest</option>
              </select>
              <ChevronDown className="w-3 h-3 text-stone-500 absolute right-2 top-1.5 pointer-events-none" />
            </div>
          </div>

          {/* Numbered List of Presets (matching MindLink picture list format!) */}
          <div className="space-y-2">
            {filteredHistory.map((scan, idx) => {
              const isActive = activeHistoryId === scan.id;
              return (
                <button
                  key={scan.id}
                  onClick={() => loadHistoryItem(scan)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-accent-indigo/10 border-accent-indigo text-stone-900 ring-1 ring-accent-indigo/20 font-semibold' 
                      : 'bg-brand-bg border-card-border hover:border-accent-indigo/30 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <div className="font-semibold flex items-start gap-1 justify-between">
                    <div className="flex items-start gap-1 min-w-0">
                      <span className="text-accent-indigo">{idx + 1}.</span>
                      <span className="truncate">{scan.result.ripenessLabel} ({scan.result.ripenessScore}%)</span>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(scan.id, e)}
                      className="text-stone-400 hover:text-red-500 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                      title="Delete this scan"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500 truncate mt-0.5 leading-relaxed pl-3.5">
                    {scan.text || "No observation notes"}
                  </p>
                  <div className="flex items-center justify-between mt-2 pl-3.5">
                    <span className="text-[8px] px-1.5 py-0.5 rounded border border-card-border text-stone-500 bg-brand-bg">
                      {scan.timestamp}
                    </span>
                    <span className="text-[8px] font-mono uppercase tracking-widest font-bold" style={{ color: scan.result.gaugeColor }}>
                      {scan.result.weeksToHarvest}
                    </span>
                  </div>
                </button>
              );
            })}
            
            {filteredHistory.length === 0 && (
              <div className="text-center py-6 border border-dashed border-card-border rounded-xl bg-brand-bg/20">
                <p className="text-[10px] text-stone-500 italic leading-relaxed px-3">
                  No evaluation history found. Run a new analysis above to generate persistent records!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bento Grid Status updates (MindLink Visual updates) */}
        <div className="border-t border-card-border pt-4">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-3">
            Farm Status Feeds
          </span>
          <div className="space-y-3 text-[11px]">
            
            <div className="bg-white border border-card-border p-3 rounded-xl space-y-1">
              <span className="text-[8px] bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                Monitoring
              </span>
              <h5 className="font-semibold text-stone-900 leading-tight">Humidity spikes detected</h5>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Atmospheric levels above 84% in Block A. Inspect low cacao leaves for active Black Pod symptoms.
              </p>
            </div>

            <div className="bg-white border border-card-border p-3 rounded-xl space-y-1">
              <span className="text-[8px] bg-accent-green/20 text-accent-green border border-accent-green/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                Analyzing
              </span>
              <h5 className="font-semibold text-stone-900 leading-tight">Canopy index optimized</h5>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Photosynthesis ratios are optimal on high plots. Maintain shade trees to mitigate moisture heat stress.
              </p>
            </div>

            <div className="bg-white border border-card-border p-3 rounded-xl space-y-1">
              <span className="text-[8px] bg-accent-amber/20 text-accent-amber border border-accent-amber/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                Harvest Plan
              </span>
              <h5 className="font-semibold text-stone-900 leading-tight">Criollo pod maturity peaks</h5>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Plot B yellow color saturation indicators predict peak pod fat indexes. Plan harvesting within 5 days.
              </p>
            </div>

          </div>
        </div>

      </aside>

      {/* Camera Live Streaming Component overlay */}
      <AnimatePresence>
        {isLiveCameraOpen && (
          <LiveCamera onClose={() => setIsLiveCameraOpen(false)} />
        )}
      </AnimatePresence>
      {/* Mobile Floating Frosted Bottom Nav Bar */}
      <div className="fixed bottom-6 inset-x-4 sm:inset-x-6 lg:hidden z-40 print:hidden">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 flex items-center justify-around p-2.5 max-w-sm mx-auto transition-all">
          <button 
            onClick={() => {
              setActivePage('scan');
              setActiveFocus('ripeness');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activePage === 'scan' ? 'text-accent-indigo bg-accent-indigo/10' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Scan</span>
          </button>
          
          <button 
            onClick={() => {
              setActivePage('health');
              setActiveFocus('disease');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activePage === 'health' ? 'text-accent-indigo bg-accent-indigo/10' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Health</span>
          </button>
          
          <button 
            onClick={() => setIsLiveCameraOpen(true)}
            className="flex flex-col items-center gap-1.5 p-3 -mt-8 bg-stone-900 text-white rounded-2xl shadow-xl shadow-stone-900/30 transition-transform active:scale-95"
          >
            <div className="bg-white/10 p-2 rounded-xl">
              <Video className="w-6 h-6 fill-current" />
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Live</span>
          </button>
          
          <button 
            onClick={() => {
              setActivePage('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activePage === 'history' ? 'text-accent-indigo bg-accent-indigo/10' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">History</span>
          </button>

          <button 
            onClick={() => {
              setActivePage('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activePage === 'profile' ? 'text-accent-indigo bg-accent-indigo/10' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Profile</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-card-border"
            >
              <div className="px-6 py-4 border-b border-card-border flex justify-between items-center bg-brand-bg/50">
                <h3 className="font-display font-bold text-lg text-stone-900">AI Model Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-card-bg rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide">Select AI Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gemini', label: 'Google Gemini' },
                      { id: 'openai', label: 'ChatGPT (OpenAI)' },
                      { id: 'anthropic', label: 'Claude (Anthropic)' },
                      { id: 'meta', label: 'Meta AI (Groq)' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setAiProvider(p.id);
                          localStorage.setItem('cacaolens_provider', p.id);
                        }}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                          aiProvider === p.id 
                            ? 'bg-accent-indigo/10 border-accent-indigo text-accent-indigo ring-1 ring-accent-indigo/20' 
                            : 'bg-white border-card-border text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide">
                    {aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1)} API Key
                  </label>
                  <input 
                    type="password"
                    placeholder={`Enter your ${aiProvider} API key...`}
                    value={apiKeys[aiProvider] || ''}
                    onChange={(e) => {
                      const newKeys = { ...apiKeys, [aiProvider]: e.target.value };
                      setApiKeys(newKeys);
                      localStorage.setItem('cacaolens_keys', JSON.stringify(newKeys));
                    }}
                    className="w-full bg-brand-bg border border-card-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-indigo/30 focus:border-accent-indigo transition-all"
                  />
                  <p className="text-[10px] text-stone-500 mt-2">
                    {aiProvider === 'gemini' 
                      ? "If left blank, the app will attempt to use the system default key." 
                      : `Your key is stored locally in your browser and sent securely to the proxy server.`}
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-brand-bg/50 border-t border-card-border flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
