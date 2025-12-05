import React, { useState, useEffect } from 'react';

export const KeySelector: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
        setHasKey(true);
        onReady();
      }
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      setLoading(true);
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        onReady();
      } catch (e) {
        console.error("Key selection failed", e);
      } finally {
        setLoading(false);
      }
    } else {
        console.warn("AI Studio extension not detected.");
        setHasKey(true);
        onReady();
    }
  };

  if (hasKey) return null;

  return (
    <div className="bg-black border border-white p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="text-white">
        <h3 className="font-bold uppercase tracking-widest text-sm mb-1">Authorization Required</h3>
        <p className="text-xs text-neutral-400 font-mono max-w-md">
          High-fidelity generation requires a connected Google Cloud Project.
        </p>
        <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-white underline mt-2 block uppercase tracking-wide hover:text-neutral-400"
        >
            View Documentation
        </a>
      </div>
      <button
        onClick={handleSelectKey}
        disabled={loading}
        className="px-6 py-3 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-transparent"
      >
        {loading ? (
           <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
        ) : (
           <span>Connect Key</span>
        )}
      </button>
    </div>
  );
};