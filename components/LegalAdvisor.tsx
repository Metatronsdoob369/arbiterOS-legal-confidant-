
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { sendLegalMessage, runArbiterAudit } from '../services/aiProvider';
import { decodeAudioData, playAudioBuffer } from '../services/audio';
import { useAudit } from '../contexts/AuditContext';
import { ArbiterBadge } from './ArbiterBadge';

interface StagedFile {
  data: string;
  name: string;
  path?: string;
}

export const LegalAdvisor: React.FC<{ nightMode?: boolean }> = ({ nightMode = false }) => {
  const { addEntry, clearLog } = useAudit();
  // Start empty to remove visual clutter on load
  const [history, setHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<StagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>(''); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [shadowCounsel, setShadowCounsel] = useState(false);
  const [draftMenuOpen, setDraftMenuOpen] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Auto-scroll — MutationObserver watches the scroll container for DOM changes
  // and scrolls to bottom whenever content is added. This is more reliable than
  // useEffect because it fires after the browser has actually painted new nodes.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Auto-Analyze Effect
  useEffect(() => {
    if (pendingAction === 'ANALYZE_RISK' && selectedFiles.length > 0 && !isLoading) {
      handleSend("Analyze the uploaded document for clause risks, specifically looking for violations of USC/UCC, hidden waivers, or Confession of Judgment terms.");
      setPendingAction(null);
    }
  }, [selectedFiles, pendingAction, isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
      const filesToProcess = files.slice(0, 20); 
      
      const filePromises = filesToProcess.map(file => new Promise<StagedFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            data: ev.target?.result as string,
            name: file.name,
            path: (file as any).webkitRelativePath || file.name
          });
        };
        reader.readAsDataURL(file);
      }));

      const newFiles = await Promise.all(filePromises);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      addEntry('Evidence Ingestion', `Ingested ${files.length} artifacts`, 'Advisor');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setHistory([]);
    setSelectedFiles([]);
    setInputText('');
    setLoadingStage('');
    setPendingAction(null);
    clearLog();
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if ((!textToSend.trim() && selectedFiles.length === 0) || isLoading) return;

    setDraftMenuOpen(false);

    const startTime = Date.now();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: textToSend,
      timestamp: new Date(),
      images: selectedFiles.length > 0 ? selectedFiles.map(f => f.data) : undefined
    };

    setHistory(prev => [...prev, userMsg]);
    
    addEntry(
      'Eye Witness Input', 
      textToSend || `Processing ${selectedFiles.length} artifacts`, 
      'Advisor',
      'Pending'
    );

    setInputText('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      setLoadingStage('EXECUTING GOVERNANCE PROTOCOLS...');
      
      const response = await sendLegalMessage(
        history, 
        userMsg.text, 
        userMsg.images,
        addEntry,
        shadowCounsel
      );
      
      setLoadingStage('ARBITER CRITIC: AUDITING RESPONSE...');
      const auditResult = await runArbiterAudit(response.text);

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        text: response.text,
        timestamp: new Date(),
        audioData: response.audioData
      };

      setHistory(prev => [...prev, modelMsg]);

      const latency = Date.now() - startTime;
      addEntry(
        'Counsel Dispensed', 
        `Audit Score: ${(auditResult.score * 100).toFixed(0)}%`, 
        'Arbiter',
        auditResult.score > 0.8 ? 'Verified' : 'Refining',
        {
          criticScore: auditResult.score,
          refinementIterations: 1,
          complianceCheck: true,
          latencyMs: latency
        }
      );

      if (response.audioData) playAudioResponse(response.audioData);

    } catch (error) {
      console.error(error);
      addEntry('System Interrupt', 'Failed to retrieve legal counsel', 'System', 'Error');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  const playAudioResponse = async (audioData: Uint8Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

    try {
      setIsSpeaking(true);
      const buffer = await decodeAudioData(audioData, audioContextRef.current);
      const source = playAudioBuffer(audioContextRef.current, buffer);
      source.onended = () => setIsSpeaking(false);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[(?:SIGNATURE_FIELD|CITATION):.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[SIGNATURE_FIELD')) {
        const label = part.includes(':') ? part.split(':')[1].replace(']', '') : 'SIGN HERE';
        return (
          <div key={index} className="my-4 p-4 border border-dashed border-[#d4af37] bg-[#d4af37]/10 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-[#d4af37]/20 transition-all">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-bold text-xs animate-pulse">
                 ✍️
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-bold text-[#d4af37] uppercase tracking-widest">{label}</span>
                 <span className="text-[10px] text-neutral-400">Electronic Signature Required</span>
               </div>
            </div>
            <div className="h-px flex-1 bg-[#d4af37]/30 mx-4"></div>
            <span className="text-[9px] text-neutral-500 font-mono group-hover:text-[#d4af37]">CLICK TO SIGN</span>
          </div>
        );
      }
      if (part.startsWith('[CITATION')) {
        const content = part.replace('[CITATION:', '').replace(']', '');
        const [title, source] = content.split('|');
        return (
          <div key={index} className="my-3 inline-block w-full">
            <div className="bg-neutral-900 border-l-2 border-[#14b8a6] p-3 rounded-r-md shadow-glow">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#14b8a6] uppercase tracking-widest">Verified Source</span>
                    <span className="text-[9px] text-neutral-500 font-mono">RETRIEVED FROM VECTOR DB</span>
                </div>
                <div className="text-xs font-bold text-neutral-200">{title}</div>
                <div className="text-[10px] text-neutral-400 italic mt-1">{source}</div>
            </div>
          </div>
        );
      }
      return (
        <ReactMarkdown
          key={index}
          components={{
            h1: ({children}) => <h1 className="text-lg font-bold text-neutral-100 mt-4 mb-2">{children}</h1>,
            h2: ({children}) => <h2 className="text-base font-bold text-neutral-200 mt-3 mb-2">{children}</h2>,
            h3: ({children}) => <h3 className="text-sm font-bold text-neutral-300 mt-3 mb-1">{children}</h3>,
            h4: ({children}) => <h4 className="text-sm font-semibold text-neutral-400 mt-2 mb-1">{children}</h4>,
            p: ({children}) => <p className="text-sm text-neutral-300 leading-relaxed mb-2">{children}</p>,
            ul: ({children}) => <ul className="list-disc list-inside text-sm text-neutral-300 space-y-1 mb-2 ml-2">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal list-inside text-sm text-neutral-300 space-y-1 mb-2 ml-2">{children}</ol>,
            li: ({children}) => <li className="text-sm text-neutral-300">{children}</li>,
            strong: ({children}) => <strong className="text-neutral-100 font-semibold">{children}</strong>,
            em: ({children}) => <em className="text-neutral-400 italic">{children}</em>,
            code: ({children}) => <code className="bg-neutral-800 text-[#14b8a6] px-1 rounded text-xs font-mono">{children}</code>,
            blockquote: ({children}) => <blockquote className="border-l-2 border-[#d4af37] pl-3 my-2 text-neutral-400 italic">{children}</blockquote>,
          }}
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div data-testid="view-legal-advisor" className="flex flex-col h-full relative overflow-hidden" style={{
      background: nightMode
        ? 'radial-gradient(ellipse 800px 600px at 50% 20%, rgba(42,28,18,0.95) 0%, #0d0806 60%)'
        : 'linear-gradient(180deg, #1a0f0a 0%, #0d0806 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      
      {/* System Reset Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] uppercase tracking-widest transition-all backdrop-blur-sm group"
          style={{
            background: 'rgba(26,15,10,0.8)',
            border: '1px solid #3d2b1f',
            color: '#5a4030',
          }}
        >
          <svg className="w-3 h-3 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          System Reset
        </button>
      </div>

      {/* HEADER SECTION: Badge + THE BIG INPUT */}
      <div className="flex flex-col items-center justify-center pt-6 pb-4 z-40 w-full">
         <div className="mb-5 transform hover:scale-105 transition-transform duration-500">
            <ArbiterBadge />
         </div>

         {/* ═══ THE COUNSEL BAR — Large, Heavy, Mahogany ═══ */}
         <div className="w-full max-w-2xl mx-auto px-4">
            <div className="relative rounded-2xl overflow-hidden" style={{
              background: 'linear-gradient(135deg, #3d2b1f 0%, #2a1c12 50%, #1e1410 100%)',
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.6),
                0 2px 0 rgba(212,175,55,0.15),
                inset 0 1px 0 rgba(255,255,255,0.05),
                inset 0 -1px 0 rgba(0,0,0,0.3)
              `,
              border: '1px solid #5a4030',
            }}>
              {/* Gold trim top edge */}
              <div className="h-[2px] w-full" style={{
                background: 'linear-gradient(90deg, transparent, #d4af37, #ffd700, #d4af37, transparent)',
              }} />

              {/* Staged Files */}
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hide">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap" style={{
                      background: '#1a0f0a',
                      border: '1px solid #3d2b1f',
                      color: '#d4af37',
                    }}>
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="hover:text-red-400 ml-1 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* THE BIG TEXTAREA — Leather pad feel */}
              <div className="p-4">
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="State your case, counselor..."
                  rows={3}
                  className="w-full bg-transparent text-sm font-sans resize-none outline-none leading-relaxed scrollbar-hide"
                  style={{
                    color: '#e8dcc8',
                    minHeight: '80px',
                    caretColor: '#d4af37',
                  }}
                />
              </div>

              {/* Actions Row — Brass fixtures */}
              <div className="flex justify-between items-center px-4 pb-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="transition-all duration-300 hover:-translate-y-1 hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                    style={{ color: '#8b7355' }}
                    title="Add Evidence"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
                  </button>
                  <button 
                    onClick={() => folderInputRef.current?.click()}
                    className="transition-all duration-300 hover:-translate-y-1 hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                    style={{ color: '#8b7355' }}
                    title="Add Knowledge Base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" /></svg>
                  </button>
                  <button 
                    onClick={() => setSearchEnabled(!searchEnabled)}
                    className="transition-all duration-300 hover:-translate-y-1"
                    style={{ color: searchEnabled ? '#14b8a6' : '#8b7355' }}
                    title="Live Analysis Mode"
                  >
                    <svg viewBox="0 0 24 24" height={22} width={22} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>
                  </button>
                  <button 
                    onClick={() => setShadowCounsel(!shadowCounsel)}
                    className="transition-all duration-300 hover:-translate-y-1"
                    style={{ color: shadowCounsel ? '#d4af37' : '#8b7355' }}
                    title="Shadow Counsel (Heavy Model)"
                  >
                    <svg viewBox="0 0 24 24" height={22} width={22} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </button>
                </div>

                {/* Send — Gold button */}
                <button 
                  onClick={() => handleSend()}
                  disabled={(!inputText && selectedFiles.length === 0) || isLoading}
                  className="rounded-xl transition-all active:scale-95 hover:scale-105 disabled:opacity-30"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37, #b8941e)',
                    padding: '10px 14px',
                    boxShadow: '0 2px 8px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <svg viewBox="0 0 512 512" className="w-5 h-5" style={{ color: '#1a0f0a' }}>
                    <path fill="currentColor" d="M473 39.05a24 24 0 0 0-25.5-5.46L47.47 185h-.08a24 24 0 0 0 1 45.16l.41.13l137.3 58.63a16 16 0 0 0 15.54-3.59L422 80a7.07 7.07 0 0 1 10 10L226.66 310.26a16 16 0 0 0-3.59 15.54l58.65 137.38c.06.2.12.38.19.57c3.2 9.27 11.3 15.81 21.09 16.25h1a24.63 24.63 0 0 0 23-15.46L478.39 64.62A24 24 0 0 0 473 39.05" />
                  </svg>
                </button>
              </div>

              {/* Gold trim bottom edge */}
              <div className="h-[1px] w-full" style={{
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
              }} />
            </div>

            {/* Quick Actions — Brass tags */}
            <div className="flex gap-2 mt-3 text-[10px] flex-wrap justify-center overflow-visible z-50">
              <button 
                onClick={() => {
                  setPendingAction('ANALYZE_RISK');
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-lg flex items-center gap-2 group transition-all hover:-translate-y-0.5"
                style={{
                  background: '#1e1410',
                  border: '1px solid #14b8a6',
                  color: '#14b8a6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <svg className="group-hover:animate-bounce" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload & Analyze
              </button>

              <div className="relative">
                <button 
                  onClick={() => setDraftMenuOpen(!draftMenuOpen)}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1e1410',
                    border: '1px solid #3d2b1f',
                    color: '#d4af37',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <span>Draft Instruments</span>
                  <svg className={`w-3 h-3 transition-transform ${draftMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {draftMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 rounded-xl overflow-hidden flex flex-col p-1 z-[60]" style={{
                    background: 'linear-gradient(135deg, #2a1c12 0%, #1e1410 100%)',
                    border: '1px solid #3d2b1f',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1)',
                  }}>
                    <div className="px-3 py-2 text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#5a4030', borderBottom: '1px solid #3d2b1f' }}>
                      Select Template
                    </div>
                    <button onClick={() => handleSend("Generate a UCC compliant Promissory Note for $10,000 between generic parties.")} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2" style={{ color: '#e8dcc8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }}></span>
                      Promissory Note ($10k)
                    </button>
                    <button onClick={() => handleSend("Generate a UCC Article 9 Security Agreement. Collateral: '2023 Ford F-150 VIN#12345'.")} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2" style={{ color: '#e8dcc8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }}></span>
                      Security Agreement
                    </button>
                    <button onClick={() => handleSend("Draft a Bill of Sale for 500 Industrial Widgets. Price $2000.")} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2" style={{ color: '#e8dcc8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#16a34a' }}></span>
                      Bill of Sale
                    </button>
                    <button onClick={() => handleSend("Draft an Independent Contractor Agreement for generic web services.")} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2" style={{ color: '#e8dcc8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#eab308' }}></span>
                      Contractor Agreement
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setInputText("Where do I sign on this type of document?")}
                className="px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
                style={{
                  background: '#1e1410',
                  border: '1px solid #3d2b1f',
                  color: '#8b7355',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                Show Signature Areas
              </button>
            </div>
         </div>
         
         {/* Hidden file inputs */}
         <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple
            accept="image/*,application/pdf,text/plain" 
            onChange={handleFileChange}
          />
         <input
            type="file"
            ref={folderInputRef}
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={handleFileChange}
         />
      </div>

      {/* ═══ RESULT STREAM — The Record ═══ */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-8 space-y-10 scrollbar-hide w-full max-w-4xl mx-auto">
        {history.length === 0 && (
          <div className="flex h-full items-center justify-center opacity-20">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ border: '1px solid #3d2b1f' }}>
                <svg className="w-8 h-8" fill="none" stroke="#5a4030" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: '#3d2b1f' }}>
                Awaiting Counsel
              </div>
            </div>
          </div>
        )}

        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[80%] ${msg.role === Role.USER ? 'text-right' : 'text-left'}`}>
              
              {msg.role === Role.MODEL && (
                <div className="mb-3 opacity-60">
                  <div className="text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: '#d4af37' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af37' }}></span>
                    Arbiter Counsel
                  </div>
                </div>
              )}

              {msg.images && msg.images.length > 0 && (
                <div className={`flex flex-wrap gap-2 mb-4 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                  {msg.images.map((attachment, idx) => {
                    const isImage = attachment.startsWith('data:image');
                    return isImage ? (
                      <img key={idx} src={attachment} alt="Evidence" className="max-w-[200px] h-auto opacity-80" style={{ border: '1px solid #3d2b1f' }} />
                    ) : (
                      <div key={idx} className="p-2 text-xs" style={{ border: '1px solid #3d2b1f', background: '#1e1410', color: '#8b7355' }}>
                        DOC_{idx}
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="inline-block p-5 md:p-6 rounded-lg transition-all duration-500" style={{
                background: msg.role === Role.USER 
                  ? 'linear-gradient(135deg, #2a1c12, #1e1410)' 
                  : nightMode
                    ? 'linear-gradient(135deg, rgba(42,28,18,0.9), rgba(30,20,16,0.9))'
                    : 'linear-gradient(135deg, #1a0f0a, #150d08)',
                border: `1px solid ${msg.role === Role.USER ? '#3d2b1f' : '#3d2b1f'}`,
                boxShadow: nightMode && msg.role === Role.MODEL
                  ? '0 0 30px rgba(255,200,100,0.05), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.3)',
                color: '#e8dcc8',
              }}>
                <div className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                   {renderMessageText(msg.text)}
                </div>
              </div>

              {msg.audioData && (
                <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-widest cursor-pointer transition-colors" 
                     style={{ color: '#5a4030' }}
                     onClick={() => playAudioResponse(msg.audioData!)}>
                   <span className="w-2 h-2 border border-current rounded-full flex items-center justify-center">
                     {isSpeaking ? <span className="w-1 h-1 bg-current rounded-full animate-ping"/> : <span className="w-1 h-1 bg-current rounded-full"/>}
                   </span>
                   {isSpeaking ? 'Transmission Active' : 'Replay Audio Log'}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="p-5 flex flex-col gap-3 min-w-[300px] rounded-lg" style={{
              background: '#1e1410',
              border: '1px solid #3d2b1f',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest pb-2" style={{ borderBottom: '1px solid #3d2b1f' }}>
                <span style={{ color: '#5a4030' }}>Status</span>
                <span className="animate-pulse" style={{ color: '#d4af37' }}>Running</span>
              </div>
              <div className="text-xs uppercase" style={{ color: '#e8dcc8' }}>{loadingStage || 'Processing...'}</div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: '#3d2b1f' }}>
                <div className="h-full w-1/3 animate-[shimmer_1s_infinite]" style={{ background: '#d4af37' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
};
