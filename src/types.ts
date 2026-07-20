export interface ImageEntry {
  file?: File;
  dataUrl: string;
  category: string;
  mimeType?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  path?: string; // Relative path inside folder if uploaded as a directory
  dataUrl: string; // Base64 encoding
  mimeType: string;
  size: number;
  category: string; // 'Leaves' | 'Pods' | 'Seeds / Beans' | 'Bark / Stems' | 'Document' | 'Video' | 'Folder'
}

export interface AnalysisResult {
  isCocoa?: boolean;
  objectType?: string;
  ripenessLabel: string;
  ripenessScore: number;
  weeksToHarvest: string;
  estimatedAgeWeeks: string;
  bestHarvestWindow: string;
  podYieldEstimate: string;
  characteristics: string;
  harvestRecommendations: string[];
  risks: string[];
  nextSteps: string[];
  gaugeColor: string;
}

export interface AppState {
  images: ImageEntry[];
  uploadedFiles: UploadedFile[];
  audioBlob: Blob | null;
  audioName: string;
  recording: boolean;
  recSeconds: number;
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  text: string;
  uploadedFiles: UploadedFile[];
  audioName?: string;
  result: AnalysisResult;
}

export type ThemeMode = 'dark' | 'light';

export interface PresetPrompt {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  category: 'ripeness' | 'leaves' | 'seeds' | 'fungal';
  icon: string;
}
