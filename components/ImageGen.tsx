import React, { useState, useMemo } from 'react';
import { ImageSize } from '../types';
import { generateContractImage } from '../services/geminiService';
import { KeySelector } from './KeySelector';
import { useAudit } from '../contexts/AuditContext';

type ConceptType = 'Negotiability Flow' | 'Corporate Veil' | 'Security Interest' | 'Chain of Title';

export const ImageGen: React.FC = () => {
  const { entries, addEntry } = useAudit();
  
  // State
  const [conceptType, setConceptType] = useState<ConceptType>('Negotiability Flow');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Derived Metrics for Contextual Injection
  const metrics = useMemo(() => {
    const total = entries.length;
    const verified = entries.filter(e => e.status === 'Verified').length;
    
    return {
      total,
      integrity: total > 0 ? ((verified / total) * 100).toFixed(0) : '100',
      lastContext: entries[0]?.details || 'System Idle'
    };
  }, [entries]);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setGeneratedImage(null);
    
    // Strict, educational prompting logic. 
    // The goal is to VISUALIZE the concept, not create art.
    const conceptPrompts: Record<ConceptType, string> = {
      'Negotiability Flow': `Create a high-fidelity educational schematic illustrating the concept of 'Negotiability' under UCC 3-104. Visual style: Blueprint, white lines on dark blue grid. Key elements: A 'Note' passing from 'Maker' to 'Bearer' freely like currency. Use symbols for 'Unconditional Promise' (solid lock) and 'Fixed Amount' (scale). Minimal text, high contrast.`,
      'Corporate Veil': `Generate a conceptual visualization of 'Piercing the Corporate Veil'. Visual style: Abstract 3D render, dark mode, cyber-security aesthetic. Show a glowing shield (The Entity) protecting a central core (Shareholder). Show the shield fracturing due to 'Fraud' or 'Alter Ego'. Instructional graphic style.`,
      'Security Interest': `Create a technical diagram of a 'Perfected Security Interest' under UCC Article 9. Visual style: Neon infographic. Show the link between 'Debtor', 'Collateral' (glowing cube), and 'Secured Party'. Visualize the 'Financing Statement' as a beam of light anchoring the collateral.`,
      'Chain of Title': `Generate a timeline visualization of 'Chain of Title' for real property. Visual style: Data stream, forensic timeline. Show a clean, unbroken line of transfer nodes. Highlight a 'Break in Chain' as a red corrupted node. Professional legal presentation style.`
    };

    const finalPrompt = conceptPrompts[conceptType];
    addEntry('Visual Concept Request', `Synthesizing abstraction for ${conceptType}`, 'Studio');

    try {
      const img = await generateContractImage(finalPrompt, "1K");
      setGeneratedImage(img);
      addEntry('Concept Rendered', `${conceptType} visualization generated successfully`, 'Studio');
    } catch (e) {
      console.error(e);
      addEntry('Render Error', 'Visualization failed', 'Studio', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto font-mono bg-black text-neutral-300">
      <div className="mb-8 border-b border-neutral-800 pb-6">
        <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Legal Concept Visualizer</h2>
        <p className="text-neutral-500 text-xs tracking-wider">
          Generate high-fidelity abstractions to conceptualize complex statutory frameworks.
        </p>
      </div>

      <KeySelector onReady={() => setIsReady(true)} />

      <div className={`grid lg:grid-cols-12 gap-8 transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Context Card */}
            <div className="border border-neutral-800 bg-neutral-900/50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Active Context</span>
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                </div>
                <div className="space-y-3 font-mono">
                    <div className="flex justify-between text-xs border-b border-neutral-800 pb-2">
                        <span className="text-neutral-500">Legal Integrity</span>
                        <span className="font-bold text-white">{metrics.integrity}%</span>
                    </div>
                    <div className="text-xs pt-1 text-neutral-400 italic">
                        "{metrics.lastContext.substring(0, 50)}..."
                    </div>
                </div>
            </div>

            {/* Concept Selection */}
            <div className="space-y-4">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Legal Concept</label>
                <div className="grid grid-cols-1 gap-2">
                    {(['Negotiability Flow', 'Corporate Veil', 'Security Interest', 'Chain of Title'] as ConceptType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setConceptType(type)}
                            className={`p-4 text-left border rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                conceptType === type 
                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-600'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                {type}
                                {conceptType === type && <div className="w-2 h-2 bg-black rounded-full"></div>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

             <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-900 to-neutral-900 hover:from-indigo-800 hover:to-neutral-800 text-white font-bold uppercase tracking-widest border border-indigo-500/30 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
                >
                {loading ? (
                    <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Synthesizing Concept...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        <span>Visualize Concept</span>
                    </>
                )}
            </button>
        </div>

        {/* Viewport */}
        <div className="lg:col-span-8">
             <div className="h-full min-h-[500px] border border-neutral-800 bg-neutral-950 rounded-xl relative flex items-center justify-center overflow-hidden shadow-inner group">
                {/* Technical Grid Overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ 
                         backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                         backgroundSize: '40px 40px' 
                     }}>
                </div>
                
                {/* Corner Markers */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-neutral-600"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-neutral-600"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-neutral-600"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-neutral-600"></div>

                {generatedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img src={generatedImage} alt="Legal Concept Visualization" className="max-w-full max-h-[600px] object-contain shadow-2xl rounded-sm border border-neutral-800" />
                        <div className="absolute bottom-4 left-4 text-[9px] bg-black/80 px-2 py-1 border border-neutral-800 text-white uppercase tracking-widest">
                            Fig. 1.0 - {conceptType}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-12 relative z-10">
                        {loading ? (
                            <div className="space-y-6">
                                <div className="font-mono text-xs text-indigo-500 uppercase tracking-widest animate-pulse">Computing Abstraction Layer...</div>
                                <div className="w-48 h-1 bg-neutral-800 mx-auto rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 animate-[shimmer_1s_infinite]"></div>
                                </div>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center gap-4 text-neutral-800">
                                 <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                 <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">
                                     Awaiting Input
                                 </div>
                             </div>
                        )}
                    </div>
                )}
                
                {generatedImage && (
                    <a 
                        href={generatedImage} 
                        download={`legal-concept-${conceptType.replace(' ', '-')}-${Date.now()}.png`}
                        className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-md text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all rounded z-20"
                    >
                        Save Diagram
                    </a>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};