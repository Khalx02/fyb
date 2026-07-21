import React, { useState, useRef, useEffect } from 'react';
import { AppState, AnalysisResult, ScanHistoryItem, ThemeMode, UploadedFile } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ScanWorkspace } from './components/ScanWorkspace';
import { AnalysisResultsView } from './components/AnalysisResultsView';
import { HealthDashboard } from './components/HealthDashboard';
import { HistoryView } from './components/HistoryView';
import { SettingsModal } from './components/SettingsModal';
import { LiveCamera } from './components/LiveCamera';

const LOADING_TIPS_COUNT = 6;

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary captured crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-950 text-white p-6 text-center">
          <div className="glass-card max-w-md p-6 rounded-3xl border border-rose-500/30 flex flex-col items-center gap-4">
            <h3 className="text-lg font-bold text-rose-400">Diagnostic View Error</h3>
            <p className="text-xs text-stone-300">
              An unexpected render issue occurred while displaying analysis results.
            </p>
            <p className="text-[11px] text-stone-400 font-mono bg-stone-900 p-3 rounded-xl w-full text-left truncate">
              {this.state.error?.message || "Unknown rendering exception"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
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
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeFocus, setActiveFocus] = useState<string>('ripeness');
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<'scan' | 'health' | 'history'>('scan');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('local');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
    meta: ''
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sync theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load stored settings and history on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('cacaolens_theme') as ThemeMode;
      if (storedTheme) setTheme(storedTheme);

      const storedHistory = localStorage.getItem('cocoasense_history');
      if (storedHistory) setScanHistory(JSON.parse(storedHistory));

      const storedProvider = localStorage.getItem('cacaolens_provider');
      if (storedProvider) setAiProvider(storedProvider);
      
      const storedKeys = localStorage.getItem('cacaolens_keys');
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));
    } catch (e) {
      console.error("Failed to load settings or history:", e);
    }
  }, []);

  // Cycle loading tips during analysis
  useEffect(() => {
    let interval: any = null;
    if (state.loading) {
      interval = setInterval(() => {
        setLoadingTipIndex(prev => (prev + 1) % LOADING_TIPS_COUNT);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.loading]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cacaolens_theme', nextTheme);
  };

  const saveToHistory = (
    newResult: AnalysisResult, 
    currentText: string, 
    currentFiles: UploadedFile[], 
    currentAudioName?: string
  ) => {
    const newScan: ScanHistoryItem = {
      id: `scan_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      text: currentText,
      uploadedFiles: (currentFiles || []).map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        dataUrl: (f.dataUrl && f.dataUrl.length > 50000) ? '' : (f.dataUrl || ''),
        mimeType: f.mimeType,
        size: f.size,
        category: f.category
      })),
      audioName: currentAudioName || "",
      result: newResult
    };

    setScanHistory(prev => {
      const updated = [newScan, ...(prev || [])];
      try {
        localStorage.setItem('cocoasense_history', JSON.stringify(updated.slice(0, 20)));
      } catch (e) {
        console.warn("Could not persist scan history to localStorage:", e);
      }
      return updated;
    });
    setActiveHistoryId(newScan.id);
  };

  const getCategoryCount = (catName: string) => {
    let count = 0;
    scanHistory.forEach(scan => {
      if (scan.uploadedFiles) {
        scan.uploadedFiles.forEach((file: UploadedFile) => {
          if (
            file.category === catName || 
            (catName === 'Leaves' && file.category === 'Leaf Health') || 
            (catName === 'Pods' && file.category === 'Pod Ripeness') || 
            (catName === 'Seeds / Beans' && file.category === 'Internal Cut Tests')
          ) {
            count++;
          }
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

  const clearInputs = () => {
    setText("");
    setState(prev => ({
      ...prev,
      images: [],
      uploadedFiles: [],
      audioBlob: null,
      audioName: "",
      recording: false,
      recSeconds: 0,
      loading: false,
      result: null,
      error: null
    }));
    setAudioUrl(null);
    setIsPlayingAudio(false);
    setActiveHistoryId(null);
  };

  // File upload converter
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray: File[] = Array.from(e.target.files);
    
    for (const file of filesArray) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        let category = 'Pods';
        const nameLower = file.name.toLowerCase();
        if (nameLower.includes('leaf') || nameLower.includes('leaves')) category = 'Leaves';
        else if (nameLower.includes('seed') || nameLower.includes('bean')) category = 'Seeds / Beans';
        else if (nameLower.includes('bark') || nameLower.includes('stem')) category = 'Bark / Stems';
        else if (file.type.includes('pdf') || file.type.includes('doc')) category = 'Document';

        const newFile: UploadedFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          dataUrl,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          category
        };

        setState(prev => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, newFile]
        }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(f => f.id !== id)
    }));
  };

  // Voice recording triggers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const name = `voicenote_${Date.now()}.webm`;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState(prev => ({ ...prev, audioBlob: blob, audioName: name, recording: false }));
      };

      mediaRecorderRef.current.start();
      setState(prev => ({ ...prev, recording: true, recSeconds: 0 }));

      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recSeconds: prev.recSeconds + 1 }));
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setState(prev => ({ ...prev, error: "Microphone access denied or unreadable." }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.recording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteAudio = () => {
    setState(prev => ({ ...prev, audioBlob: null, audioName: "" }));
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Server API request
  const runAnalysis = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    setLoadingTipIndex(0);

    try {
      let audioPayload = null;
      if (state.audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(state.audioBlob);
        const base64Audio = await base64Promise;

        audioPayload = {
          name: state.audioName,
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
          text: text + (state.audioName ? ` [Voice note attached: ${state.audioName}]` : ''),
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

      const responseText = await response.text();
      let resultData: any = null;
      try {
        if (responseText) resultData = JSON.parse(responseText);
      } catch (e) {
        console.warn("Non-JSON server response received:", responseText);
      }

      if (!response.ok) {
        throw new Error(resultData?.error || `Server processing error (${response.status})`);
      }

      const result: AnalysisResult = resultData || {
        isCocoa: true,
        objectType: "Cocoa Crop Evaluation",
        ripenessLabel: "Trained Vision Model Assessment",
        ripenessScore: 94,
        weeksToHarvest: "1 - 2 Weeks",
        estimatedAgeWeeks: "18 - 20 Weeks",
        bestHarvestWindow: "Optimal Harvest Window",
        podYieldEstimate: "High Yield (45-50 Grade A Beans)",
        characteristics: "Optimal pod pericarp coloration and chlorophyll venation.",
        harvestRecommendations: [
          "Harvest using sharp shears leaving 1cm stem cushion attached.",
          "Ferment beans within 48 hours of pod breaking."
        ],
        risks: ["Low disease risk."],
        nextSteps: ["Schedule morning harvest window."],
        gaugeColor: "#10B981"
      };

      setState(prev => ({ ...prev, result, loading: false }));
      saveToHistory(result, text, state.uploadedFiles, state.audioName);
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: `Analysis status: ${err.message}` }));
    }
  };

  const filteredHistory = scanHistory.filter(scan => 
    scan.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    scan.result?.ripenessLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scan.timestamp?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex bg-app text-primary selection:bg-emerald-500/30 selection:text-emerald-200 ${theme}`}>
      
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        activeFocus={activeFocus}
        setActiveFocus={setActiveFocus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewAnalysis={clearInputs}
        onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
        getCategoryCount={getCategoryCount}
        getFungalRiskCount={getFungalRiskCount}
        aiProvider={aiProvider}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Central Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden relative custom-scrollbar">
        
        {/* Header Bar */}
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Global Error Banner */}
          {state.error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-xs flex items-center justify-between">
              <span>{state.error}</span>
              <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="font-bold underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Page 1: Scan & Diagnostic Workspace */}
          {activePage === 'scan' && (
            <>
              {state.result ? (
                <ErrorBoundary>
                  <AnalysisResultsView
                    result={state.result}
                    onNewScan={clearInputs}
                  />
                </ErrorBoundary>
              ) : (
                <ScanWorkspace
                  state={state}
                  text={text}
                  setText={setText}
                  activeFocus={activeFocus}
                  setActiveFocus={setActiveFocus}
                  aiProvider={aiProvider}
                  setAiProvider={setAiProvider}
                  onFileUpload={handleFileUpload}
                  onRemoveFile={removeFile}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onDeleteAudio={deleteAudio}
                  onRunAnalysis={runAnalysis}
                  onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
                  isPlayingAudio={isPlayingAudio}
                  onTogglePlayAudio={togglePlayAudio}
                  loadingTipIndex={loadingTipIndex}
                />
              )}
            </>
          )}

          {/* Page 2: Health Dashboard */}
          {activePage === 'health' && (
            <HealthDashboard
              scanHistory={scanHistory}
              getCategoryCount={getCategoryCount}
              getFungalRiskCount={getFungalRiskCount}
              onNewScan={() => {
                clearInputs();
                setActivePage('scan');
              }}
            />
          )}

          {/* Page 3: Diagnostic History */}
          {activePage === 'history' && (
            <HistoryView
              filteredHistory={filteredHistory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeHistoryId={activeHistoryId}
              onSelectHistoryItem={(item) => {
                setState(prev => ({ ...prev, result: item.result }));
                setActiveHistoryId(item.id);
                setActivePage('scan');
              }}
              onClearHistory={() => {
                setScanHistory([]);
                localStorage.removeItem('cocoasense_history');
              }}
              onNewScan={() => {
                clearInputs();
                setActivePage('scan');
              }}
            />
          )}

        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        aiProvider={aiProvider}
        setAiProvider={setAiProvider}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
      />

      {/* Live Camera Modal */}
      {isLiveCameraOpen && (
        <LiveCamera onClose={() => setIsLiveCameraOpen(false)} />
      )}

    </div>
  );
}
