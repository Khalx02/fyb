import { useState, useRef, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';

// @ts-ignore
import ripePodImg from './assets/images/ripe_cocoa_pod_1782233628571.jpg';
// @ts-ignore
import greenPodImg from './assets/images/green_cocoa_pod_1782233643049.jpg';
// @ts-ignore
import diseasedPodImg from './assets/images/diseased_cocoa_pod_1782233658174.jpg';

const SAMPLE_PRESETS = [
  {
    id: 'ripe',
    name: 'Ripe Criollo Pod',
    description: 'Perfect golden-yellow pod with vibrant orange ridges.',
    text: 'This cocoa pod is a stunning golden-yellow color with vibrant orange ridges. Tapping it makes a hollow, deep drum-like sound. The surface texture is firm and the surrounding cacao leaves are rich green with no signs of stress or pests.',
    imagePath: ripePodImg,
    category: 'Pods',
    badge: 'Healthy & Ripe',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  {
    id: 'green',
    name: 'Immature Forastero Pod',
    description: 'Developing green pod with extremely hard skin.',
    text: 'A hard, deep green pod growing tightly on a main cacao branch. The skin is very firm and smooth. Tapping it makes a dull, solid wooden sound. No yellowing is visible yet.',
    imagePath: greenPodImg,
    category: 'Pods',
    badge: 'Immature / Developing',
    badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  {
    id: 'diseased',
    name: 'Black Pod Infection Risk',
    description: 'Active fungal rot with dark watery patches.',
    text: 'I observed large, dark brown, watery lesions expanding from the bottom of this mature pod. A fine white powdery mould is beginning to coat the edges of the brown rot. Some surrounding leaves also show yellowing spots.',
    imagePath: diseasedPodImg,
    category: 'Leaves',
    badge: 'High Risk / Diseased',
    badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/20'
  }
];

const LOADING_TIPS = [
  "Running computer vision models on skin color saturation...",
  "Estimating pod fill index & bean development metrics...",
  "Scanning leaf structure for micro-nutrient deficiencies...",
  "Evaluating pod surface for Black Pod (Phytophthora) spores...",
  "Calculating optimal harvest window for peak cocoa fat content...",
  "Synthesizing regional weather patterns and soil hydration factors..."
];

export default function App() {
  const [state, setState] = useState<AppState>({
    images: [],
    audioBlob: null,
    audioName: "",
    recording: false,
    recSeconds: 0,
    loading: false,
    result: null,
    error: null,
  });

  const [text, setText] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'risks' | 'steps'>('recommendations');

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

  const handleImageFiles = (files: FileList | null, category: string) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        setState(prev => ({
          ...prev,
          images: [
            ...prev.images, 
            { 
              file, 
              dataUrl: reader.result as string, 
              category, 
              mimeType: file.type 
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
    setActivePreset(null);
  };

  const removeImage = (idx: number) => {
    setState(prev => {
      const newImages = [...prev.images];
      newImages.splice(idx, 1);
      return { ...prev, images: newImages };
    });
    setActivePreset(null);
  };

  const loadPreset = async (preset: typeof SAMPLE_PRESETS[0]) => {
    setActivePreset(preset.id);
    setText(preset.text);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(preset.imagePath);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setState(prev => ({
          ...prev,
          images: [{
            dataUrl: reader.result as string,
            category: preset.category,
            mimeType: blob.type
          }],
          loading: false
        }));
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        images: [],
        loading: false,
        error: "Failed to load pre-set image. You can still type or upload your own images."
      }));
    }
  };

  const clearInputs = () => {
    setText("");
    setActivePreset(null);
    setState(prev => ({
      ...prev,
      images: [],
      audioBlob: null,
      audioName: "",
      result: null,
      error: null
    }));
  };

  const runAnalysis = async () => {
    if (!text && state.images.length === 0 && !state.audioBlob) {
      setState(prev => ({ ...prev, error: 'Please provide at least one input: select a quick preset, type an observation, record a voice note, or upload photo(s).' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null }));
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text + (state.audioName ? ` [Voice note transcript or intent context provided under file ${state.audioName}]` : ''),
          images: state.images.map(img => ({
            category: img.category,
            data: img.dataUrl.split(',')[1],
            mimeType: img.mimeType
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      setState(prev => ({ ...prev, result, loading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: `Analysis failed: ${err.message}` }));
    }
  };

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="cocoa-body min-h-screen bg-[#FAF6EE] text-[#3B1E0A]">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 bg-[#3B1E0A] px-6 py-4 shadow-xl border-b border-[#C9812E]/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="logo-pod w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Sparkles className="w-6 h-6 text-[#3B1E0A] animate-pulse" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#FDFAF5] tracking-tight flex items-center gap-2">
                CocoaSense
              </h1>
              <p className="text-amber-400 text-xs tracking-widest font-mono uppercase">
                AI Advisory & Harvest Expert System
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-2 px-3 py-1 bg-amber-950 border border-amber-800 rounded-full text-amber-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini 1.5-Flash Online
            </span>
          </div>
        </div>
      </header>

      {/* CORE HERO SUMMARY HERO CARD */}
      <div className="bg-[#3B1E0A] text-[#FDFAF5] pb-32 pt-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#6B3A1F,transparent_50%)] opacity-60"></div>
        <div className="max-w-5xl mx-auto relative z-10 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <Activity className="w-3.5 h-3.5" /> Empowering Smallholders Worldwide
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight mb-4 text-[#FDFAF5]">
            Optimise Your Cocoa Harvest <br className="hidden sm:block"/> & Prevent Disease
          </h2>
          <p className="text-amber-100/80 text-base sm:text-lg max-w-2xl mb-2 font-light leading-relaxed">
            Instantly evaluate ripeness, age, expected bean yield, and risk of fungal infections or insect attacks. Take a photo, write, or speak your observation.
          </p>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-24 pb-20 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CONTROLS & INPUTS */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* QUICK DEMO PRESETS */}
          <div className="bg-[#FDFAF5] rounded-2xl shadow-md border border-[#EAD9BC] overflow-hidden p-6">
            <h3 className="font-serif text-lg font-bold text-[#3B1E0A] mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Try a Quick Scenario
            </h3>
            <p className="text-sm text-[#8C7B6B] mb-4">
              Select an authentic field case below to pre-populate and test the AI diagnosis.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                      isActive 
                        ? 'bg-[#F5EDD8] border-[#C9812E] ring-2 ring-[#C9812E]/30 scale-[1.02]' 
                        : 'bg-white border-[#EAD9BC] hover:border-[#C9812E] hover:shadow-md'
                    }`}
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-2 relative bg-amber-950">
                      <img 
                        src={preset.imagePath} 
                        alt={preset.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                      />
                      <span className={`absolute top-1.5 left-1.5 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${preset.badgeColor}`}>
                        {preset.badge.split(' / ')[0]}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-[#3B1E0A] line-clamp-1">{preset.name}</span>
                    <span className="text-[10px] text-[#8C7B6B] line-clamp-2 mt-0.5 font-light leading-snug">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WRITTEN DESCRIPTION CARD */}
          <div className="bg-[#FDFAF5] rounded-2xl shadow-md border border-[#EAD9BC] overflow-hidden">
            <div className="bg-[#3B1E0A] text-[#FDFAF5] px-6 py-4 flex items-center justify-between border-b border-[#C9812E]/20">
              <h3 className="font-serif text-base font-semibold flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                Describe Your Observation
              </h3>
              {text && (
                <button 
                  onClick={clearInputs} 
                  className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 font-medium bg-amber-950/40 px-2.5 py-1 rounded-full transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-[#8C7B6B] uppercase tracking-wider mb-2">
                Field Notes & Visual Indicators
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full min-h-[120px] bg-[#FAF6EE] border-2 border-[#EAD9BC] focus:border-[#C9812E] focus:ring-0 rounded-xl p-4 text-sm text-[#3B1E0A] transition-all duration-200 outline-none placeholder-[#8C7B6B]/60 font-sans"
                placeholder="Describe skin color (green, yellow, reddish), tapping sound (hollow vs solid), leaf spots, presence of mold, pod damage, or weather observations..."
              />
            </div>
          </div>

          {/* VOICE RECORDER CARD */}
          <div className="bg-[#FDFAF5] rounded-2xl shadow-md border border-[#EAD9BC] overflow-hidden">
            <div className="bg-[#3B1E0A] text-[#FDFAF5] px-6 py-4 flex items-center justify-between border-b border-[#C9812E]/20">
              <h3 className="font-serif text-base font-semibold flex items-center gap-2.5">
                <Mic className="w-5 h-5 text-amber-400" />
                Voice Observation
              </h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-[#8C7B6B] uppercase font-bold tracking-wider mb-3">
                Hands-Free Field Recording
              </p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF6EE] p-4 rounded-xl border border-[#EAD9BC]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={state.recording ? stopRecording : startRecording}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                      state.recording 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30' 
                        : 'bg-[#4A7C3F] hover:bg-[#6DAF60] text-white shadow-lg shadow-[#4A7C3F]/20'
                    }`}
                  >
                    {state.recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[#3B1E0A]">
                      {state.recording ? 'Recording Active' : 'Record Audio Memo'}
                    </h4>
                    <p className="text-xs text-[#8C7B6B]">
                      {state.recording ? 'Tap to stop recording voice' : 'Perfect for taking notes in the field'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EAD9BC]/50">
                  {state.recording ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-end gap-[3px] h-6">
                        {[0.4, 0.9, 0.3, 0.75, 0.5, 0.95, 0.4].map((delay, idx) => (
                          <motion.span
                            key={idx}
                            animate={{ height: ['4px', '22px', '4px'] }}
                            transition={{ duration: 1, repeat: Infinity, delay }}
                            className="w-[3px] bg-red-500 rounded-full"
                          />
                        ))}
                      </div>
                      <span className="font-mono text-sm font-bold text-red-500">{formatTime(state.recSeconds)}</span>
                    </div>
                  ) : audioUrl ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={togglePlayback}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#C9812E]/10 hover:bg-[#C9812E]/25 text-[#C9812E] transition-colors"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <span className="text-xs text-[#8C7B6B] truncate max-w-[120px] font-mono">
                        {state.audioName}
                      </span>
                      <button 
                        onClick={() => setState(prev => ({ ...prev, audioBlob: null, audioName: "" }))}
                        className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="text-xs text-[#C9812E] hover:text-[#E8A84A] font-bold cursor-pointer flex items-center gap-1 bg-white border border-[#C9812E]/30 px-3 py-1.5 rounded-lg hover:shadow-sm transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Audio
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
              
              {audioUrl && (
                <audio 
                  ref={audioPlayerRef} 
                  src={audioUrl} 
                  onEnded={handleAudioEnded} 
                  className="hidden" 
                />
              )}
            </div>
          </div>

          {/* IMAGE UPLOADER CARD */}
          <div className="bg-[#FDFAF5] rounded-2xl shadow-md border border-[#EAD9BC] overflow-hidden">
            <div className="bg-[#3B1E0A] text-[#FDFAF5] px-6 py-4 flex items-center justify-between border-b border-[#C9812E]/20">
              <h3 className="font-serif text-base font-semibold flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-amber-400" />
                Upload Field Photos
              </h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-[#8C7B6B] uppercase font-bold tracking-wider mb-3">
                Categorised Image Uploads
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { id: 'leaf', label: 'Leaves', icon: '🍃', desc: 'Identify nutrient stress' },
                  { id: 'pod', label: 'Pods', icon: '🟤', desc: 'Ripeness & health status' },
                  { id: 'seed', label: 'Seeds / Beans', icon: '𫫮', desc: 'Internal cut evaluation' },
                  { id: 'plant', label: 'Whole Plant', icon: '🌱', desc: 'Growth structure' }
                ].map((cat) => (
                  <div 
                    key={cat.id} 
                    className="group border-2 border-dashed border-[#EAD9BC] hover:border-[#C9812E] bg-[#FAF6EE] hover:bg-[#F5EDD8]/30 rounded-xl p-3 text-center cursor-pointer relative transition-all duration-200"
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => handleImageFiles(e.target.files, cat.label)}
                    />
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
                    <div className="font-bold text-xs text-[#3B1E0A]">{cat.label}</div>
                    <div className="text-[9px] text-[#8C7B6B] mt-0.5 leading-tight font-light">{cat.desc}</div>
                  </div>
                ))}
              </div>

              {state.images.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#8C7B6B] uppercase tracking-wider mb-2">
                    Uploaded Photos ({state.images.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {state.images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="group relative w-16 h-16 rounded-lg overflow-hidden border border-[#EAD9BC] shadow-sm"
                      >
                        <img 
                          src={img.dataUrl} 
                          alt={img.category} 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-amber-950/80 text-[#FDFAF5] text-[7px] text-center uppercase tracking-wider py-0.5 truncate font-mono">
                          {img.category}
                        </span>
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-[#3B1E0A] hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RUN BUTTON */}
          {state.error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{state.error}</div>
            </motion.div>
          )}

          <button
            onClick={runAnalysis}
            disabled={state.loading}
            className="w-full bg-[#C9812E] hover:bg-[#E8A84A] text-[#FDFAF5] disabled:bg-[#8C7B6B]/40 font-serif font-bold text-lg py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer select-none"
          >
            {state.loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Observations...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-100 fill-amber-100" />
                Analyse Cocoa & Get Advice
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: RESULTS PANEL */}
        <div ref={resultsRef} className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {state.loading ? (
              <motion.div
                key="loading-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#3B1E0A] text-[#FDFAF5] rounded-2xl p-8 shadow-xl border border-[#C9812E]/30 text-center min-h-[480px] flex flex-col justify-center items-center"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-bold mb-2">CocoaSense Engine Active</h3>
                <p className="text-[#EAD9BC] text-sm max-w-sm mb-6 leading-relaxed">
                  Our neural network is processing leaf characteristics, pod ripening indicators, and potential disease signatures...
                </p>
                <div className="bg-amber-950/60 border border-amber-900/50 rounded-xl p-4 max-w-sm w-full min-h-[80px] flex items-center justify-center">
                  <motion.p 
                    key={loadingTipIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-amber-400 text-xs font-mono tracking-wide"
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
                className="bg-white rounded-2xl shadow-xl border border-[#EAD9BC] overflow-hidden"
              >
                {/* STATUS BAR */}
                <div 
                  className="px-6 py-5 text-white flex items-center justify-between shadow-inner"
                  style={{ background: `linear-gradient(135deg, #3B1E0A, ${state.result.gaugeColor || '#6B3A1F'})` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                      <Heart className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono font-bold block">
                        Estimated Ripeness Status
                      </span>
                      <h4 className="font-serif text-xl font-bold leading-tight">
                        {state.result.ripenessLabel}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono font-bold block">
                      Ripeness Index
                    </span>
                    <span className="text-2xl font-serif font-extrabold">
                      {state.result.ripenessScore}%
                    </span>
                  </div>
                </div>

                {/* VISUAL DIAL METRIC */}
                <div className="p-6 bg-gradient-to-b from-[#FAF6EE]/50 to-white text-center border-b border-[#EAD9BC]/50">
                  <div className="relative inline-flex items-center justify-center w-40 h-40 mb-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="66"
                        className="text-[#EAD9BC]/30"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="66"
                        stroke={state.result.gaugeColor || '#C9812E'}
                        strokeWidth="10"
                        strokeDasharray={414.69}
                        initial={{ strokeDashoffset: 414.69 }}
                        animate={{ strokeDashoffset: 414.69 - (414.69 * state.result.ripenessScore) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-serif font-extrabold text-[#3B1E0A]">
                        {state.result.ripenessScore}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#8C7B6B] font-bold mt-0.5">
                        Ripeness Index
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between max-w-xs mx-auto text-[9px] uppercase tracking-widest text-[#8C7B6B] font-bold">
                    <span>Immature</span>
                    <span>Developing</span>
                    <span>Ripe</span>
                    <span>Over</span>
                  </div>
                </div>

                {/* THE 4 KEY METRIC TILES */}
                <div className="grid grid-cols-2 gap-px bg-[#EAD9BC]/40 border-b border-[#EAD9BC]/40">
                  <div className="bg-white p-4">
                    <span className="text-[9px] uppercase tracking-wider text-[#8C7B6B] font-bold block mb-1">
                      Weeks to Harvest
                    </span>
                    <span className="font-serif text-base font-bold text-[#3B1E0A] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#C9812E] shrink-0" />
                      {state.result.weeksToHarvest}
                    </span>
                  </div>
                  <div className="bg-white p-4">
                    <span className="text-[9px] uppercase tracking-wider text-[#8C7B6B] font-bold block mb-1">
                      Estimated Pod Age
                    </span>
                    <span className="font-serif text-base font-bold text-[#3B1E0A] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      {state.result.estimatedAgeWeeks}
                    </span>
                  </div>
                  <div className="bg-white p-4">
                    <span className="text-[9px] uppercase tracking-wider text-[#8C7B6B] font-bold block mb-1">
                      Best Harvest Window
                    </span>
                    <span className="font-serif text-base font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {state.result.bestHarvestWindow}
                    </span>
                  </div>
                  <div className="bg-white p-4">
                    <span className="text-[9px] uppercase tracking-wider text-[#8C7B6B] font-bold block mb-1">
                      Yield Expected
                    </span>
                    <span className="font-serif text-base font-bold text-[#3B1E0A] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      {state.result.podYieldEstimate}
                    </span>
                  </div>
                </div>

                {/* DETAILED ANALYSIS */}
                <div className="p-6 flex flex-col gap-5 bg-white">
                  
                  {/* CHARACTERISTICS */}
                  <div>
                    <h5 className="text-xs font-extrabold text-[#8C7B6B] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-amber-500 rounded-sm"></span>
                      Observations Summary
                    </h5>
                    <p className="text-sm text-[#3B1E0A]/95 leading-relaxed font-sans">
                      {state.result.characteristics}
                    </p>
                  </div>

                  {/* DIAGNOSIS DETAIL ACCORDION TABS */}
                  <div className="border border-[#EAD9BC] rounded-xl overflow-hidden mt-2">
                    <div className="flex bg-[#FAF6EE] border-b border-[#EAD9BC] text-xs font-bold text-[#8C7B6B] uppercase tracking-wider">
                      {[
                        { id: 'recommendations', label: 'Harvest Tips', icon: CheckCircle2 },
                        { id: 'risks', label: 'Risks / Disease', icon: AlertTriangle },
                        { id: 'steps', label: 'Farmer Steps', icon: ArrowRight }
                      ].map(tab => {
                        const Icon = tab.icon;
                        const isCurrent = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 px-1 text-center border-r last:border-r-0 border-[#EAD9BC] flex items-center justify-center gap-1.5 transition-colors ${
                              isCurrent ? 'bg-white text-[#C9812E] font-extrabold border-t-2 border-t-[#C9812E]' : 'hover:bg-white/50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-4 min-h-[160px] bg-white text-sm text-[#3B1E0A]/90">
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
                              <li key={idx} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold font-mono">
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
                                <li key={idx} className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold font-mono">
                                    !
                                  </span>
                                  <span className="leading-relaxed text-[#3B1E0A]">{item}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-[#8C7B6B] italic">No immediate disease or infestation risks detected. Keep up the excellent soil and tree hygiene!</li>
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
                              <li key={idx} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold font-mono">
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
              </motion.div>
            ) : (
              <motion.div
                key="empty-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#EAD9BC] text-center min-h-[480px] flex flex-col justify-center items-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 text-[#C9812E]">
                  <HelpCircle className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2 text-[#3B1E0A]">Ready for Diagnosis</h3>
                <p className="text-sm text-[#8C7B6B] max-w-xs leading-relaxed">
                  Provide your observations, record a field audio memo, upload photos, or select one of our prefilled scenarios to view details of ripeness and disease diagnostics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
