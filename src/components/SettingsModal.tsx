import React, { useState } from 'react';
import { X, Key, ShieldCheck, Cpu, Check, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiProvider: string;
  setAiProvider: (prov: string) => void;
  apiKeys: Record<string, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aiProvider,
  setAiProvider,
  apiKeys,
  setApiKeys
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleKeyChange = (provider: string, value: string) => {
    const updated = { ...apiKeys, [provider]: value };
    setApiKeys(updated);
    localStorage.setItem('cacaolens_keys', JSON.stringify(updated));
  };

  const handleSave = () => {
    localStorage.setItem('cacaolens_provider', aiProvider);
    localStorage.setItem('cacaolens_keys', JSON.stringify(apiKeys));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleShowKey = (prov: string) => {
    setShowKeys(prev => ({ ...prev, [prov]: !prev[prov] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-card">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">
                AI Engine & API Keys
              </h3>
              <p className="text-xs text-stone-400">
                Configure LLM providers and access keys.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          
          {/* Active Provider Selection */}
          <div>
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-2">
              Default Inference Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini 2.5/3.5' },
                { id: 'openai', label: 'OpenAI GPT-4o' },
                { id: 'anthropic', label: 'Anthropic Claude 3.5' },
                { id: 'meta', label: 'Meta Llama 3' }
              ].map(prov => (
                <button
                  key={prov.id}
                  onClick={() => {
                    setAiProvider(prov.id);
                    localStorage.setItem('cacaolens_provider', prov.id);
                  }}
                  className={`p-3 rounded-xl text-xs font-semibold text-left border transition-all ${
                    aiProvider === prov.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-input border-card text-stone-300 hover:border-stone-600'
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Inputs */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider block">
              API Keys (Optional / Direct Authorization)
            </label>

            {[
              { id: 'gemini', label: 'Gemini API Key' },
              { id: 'openai', label: 'OpenAI API Key' },
              { id: 'anthropic', label: 'Anthropic API Key' }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <span className="text-[11px] font-medium text-stone-400">
                  {item.label}
                </span>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showKeys[item.id] ? 'text' : 'password'}
                    value={apiKeys[item.id] || ''}
                    onChange={(e) => handleKeyChange(item.id, e.target.value)}
                    placeholder={`Paste ${item.label}...`}
                    className="w-full bg-input border border-card rounded-xl pl-9 pr-10 py-2 text-xs text-primary placeholder-stone-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(item.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    {showKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-stone-900/60 p-3 rounded-xl border border-card flex items-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>API keys are stored securely in your browser local storage.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-card flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-medium">
            {savedSuccess ? 'Settings saved!' : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200"
            >
              Close
            </button>

            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
