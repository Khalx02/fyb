import React from 'react';
import { motion } from 'motion/react';
import { X, Video } from 'lucide-react';

interface LiveCameraProps {
  onClose: () => void;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-stone-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-700/50 relative text-center p-8"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="w-20 h-20 rounded-full bg-accent-indigo/20 flex items-center justify-center border border-accent-indigo/30 mx-auto mb-6 text-accent-indigo">
          <Video className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-display font-bold text-white mb-2">Live AI Assist</h2>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-800 rounded-full border border-stone-700 text-stone-300 text-[10px] font-bold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></span>
          Under Development
        </div>
        
        <p className="text-stone-400 text-sm leading-relaxed mb-8">
          We are currently fine-tuning our real-time video advisory model to provide the most accurate field assessments for cocoa farmers. This feature will be available in the next major update.
        </p>

        <button 
          onClick={onClose}
          className="w-full bg-white text-stone-900 font-bold px-6 py-3.5 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
        >
          Return to Scanner
        </button>
      </motion.div>
    </div>
  );
};
