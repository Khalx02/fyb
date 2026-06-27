export interface ImageEntry {
  file?: File;
  dataUrl: string;
  category: string;
  mimeType?: string;
}

export interface AnalysisResult {
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
  audioBlob: Blob | null;
  audioName: string;
  recording: boolean;
  recSeconds: number;
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}
