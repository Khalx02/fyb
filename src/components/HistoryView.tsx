import React from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Clock, 
  Calendar, 
  ChevronRight, 
  FileText, 
  Image as ImageIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ScanHistoryItem } from '../types';

interface HistoryViewProps {
  filteredHistory: ScanHistoryItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeHistoryId: string | null;
  onSelectHistoryItem: (item: ScanHistoryItem) => void;
  onClearHistory: () => void;
  onNewScan: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  filteredHistory,
  searchQuery,
  setSearchQuery,
  activeHistoryId,
  onSelectHistoryItem,
  onClearHistory,
  onNewScan
}) => {
  return (
    <div className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            Farm Case Diagnostic History
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Review past farm evaluations, image classifications, and recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {filteredHistory.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-2 bg-stone-800/80 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 border border-stone-700/60 hover:border-rose-500/40 px-3.5 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <button
            onClick={onNewScan}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Filter Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by keyword, ripeness status, or date..."
          className="w-full bg-input border border-card rounded-2xl pl-10 pr-4 py-3 text-xs text-primary placeholder-stone-400 focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <Clock className="w-12 h-12 text-stone-600 mb-3" />
          <h3 className="text-base font-bold text-primary mb-1">
            No Diagnostic Records Found
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mb-4">
            {searchQuery
              ? `No scans match "${searchQuery}". Try a different search term.`
              : 'Run your first cocoa pod or leaf scan to save diagnostic cases here.'}
          </p>
          <button
            onClick={onNewScan}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all"
          >
            Start First Scan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const isSelected = activeHistoryId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectHistoryItem(item)}
                className={`glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:scale-[1.005] ${
                  isSelected ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10' : ''
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* File Thumbnail or Icon */}
                  <div className="w-12 h-12 rounded-xl bg-stone-800 border border-card overflow-hidden shrink-0 flex items-center justify-center">
                    {item.uploadedFiles && item.uploadedFiles[0]?.dataUrl ? (
                      <img
                        src={item.uploadedFiles[0].dataUrl}
                        alt="Scan thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary truncate">
                        {item.result?.ripenessLabel || 'Farm Diagnostic'}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Score: {item.result?.ripenessScore || 0}%
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 truncate max-w-xl">
                      {item.text || 'Image diagnostic session'}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-stone-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {item.timestamp}
                      </span>
                      {item.uploadedFiles?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-stone-400" />
                          {item.uploadedFiles.length} file(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-semibold text-emerald-400 hidden sm:inline">
                    View Results
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
