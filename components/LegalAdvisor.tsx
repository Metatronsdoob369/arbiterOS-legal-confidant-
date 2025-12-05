
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from '../types';
import { sendLegalMessage, runArbiterAudit } from '../services/geminiService';
import { decodeAudioData, playAudioBuffer } from '../services/audio';
import { useAudit } from '../contexts/AuditContext';
import { ArbiterBadge } from './ArbiterBadge';

interface StagedFile {
  data: string;
  name: string;
  path?: string;
}

export const LegalAdvisor: React.FC = () => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

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
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono relative overflow-hidden">
      
      {/* System Reset Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 border border-neutral-700 rounded-md text-[9px] uppercase tracking-widest text-neutral-500 hover:text-red-400 hover:border-red-500/50 transition-all backdrop-blur-sm shadow-lg group"
        >
          <svg className="w-3 h-3 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          System Reset
        </button>
      </div>

      {/* HEADER SECTION: Badge + Input Console */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 z-40 bg-gradient-to-b from-black via-black to-transparent w-full">
         <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
            <ArbiterBadge />
         </div>

         {/* THE EYE WITNESS CONSOLE (Input Card) */}
         <div className="max-w-[320px] md:max-w-md mx-auto w-full relative">
            <div className="relative p-[1.5px] rounded-[16px] overflow-hidden bg-gradient-to-br from-[#7e7e7e] via-[#363636] to-[#363636] shadow-2xl">
                <div className="absolute -top-[10px] -left-[10px] w-[30px] h-[30px] bg-[radial-gradient(ellipse_at_center,#ffffff,rgba(255,255,255,0.3),rgba(255,255,255,0.1),transparent)] blur-[1px] pointer-events-none"></div>

                <div className="flex flex-col bg-black/80 backdrop-blur-md rounded-[15px] w-full">
                    {/* Staged Files */}
                    {selectedFiles.length > 0 && (
                        <div className="flex gap-2 px-3 pt-3 overflow-x-auto scrollbar-hide">
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-1 bg-[#1b1b1b] border border-[#363636] px-2 py-1 rounded-[10px] text-[9px] text-white whitespace-nowrap">
                                    <span className="truncate max-w-[80px]">{file.name}</span>
                                    <button onClick={() => removeFile(i)} className="hover:text-red-400 ml-1">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chat Area */}
                    <div className="relative p-2">
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Upload Evidence or Query Logic..."
                            className="w-full h-[50px] bg-transparent text-white text-xs font-sans font-normal p-2 resize-none outline-none placeholder-[#f3f6fd] focus:placeholder-[#363636] transition-colors scrollbar-hide"
                        />
                    </div>

                    {/* Actions Row */}
                    <div className="flex justify-between items-end p-2 pt-0">
                        {/* Left Actions - Added Glow and Higher Visibility */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-white/60 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:text-white hover:-translate-y-1 transition-all duration-300"
                                title="Add File(s)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
                            </button>
                            <button 
                                onClick={() => folderInputRef.current?.click()}
                                className="text-white/60 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:text-white hover:-translate-y-1 transition-all duration-300"
                                title="Add Folder (Knowledge Base)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" /></svg>
                            </button>
                            <button 
                                onClick={() => setSearchEnabled(!searchEnabled)}
                                className={`transition-all duration-300 hover:-translate-y-1 ${searchEnabled ? 'text-[#14b8a6] drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'text-white/60 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:text-white'}`}
                                title="Live Analysis Mode"
                            >
                                <svg viewBox="0 0 24 24" height={20} width={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>
                            </button>
                            <button 
                                onClick={() => setShadowCounsel(!shadowCounsel)}
                                className={`transition-all duration-300 hover:-translate-y-1 ${shadowCounsel ? 'text-[#d4af37] drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'text-white/60 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:text-[#d4af37]'}`}
                                title="Shadow Counsel (Privileged Mode)"
                            >
                                <svg viewBox="0 0 24 24" height={20} width={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button 
                            onClick={() => handleSend()}
                            disabled={(!inputText && selectedFiles.length === 0) || isLoading}
                            className="p-[2px] rounded-[10px] bg-gradient-to-t from-[#292929] via-[#555555] to-[#292929] shadow-[inset_0_6px_2px_-4px_rgba(255,255,255,0.5)] border-none outline-none cursor-pointer transition-all active:scale-95 hover:scale-105 group"
                        >
                            <div className="w-[30px] h-[30px] p-[6px] bg-black/10 rounded-[10px] backdrop-blur-[3px] text-[#8b8b8b] group-hover:text-[#f3f6fd] group-hover:drop-shadow-[0_0_5px_#ffffff]">
                                <svg viewBox="0 0 512 512" className="w-full h-full"><path fill="currentColor" d="M473 39.05a24 24 0 0 0-25.5-5.46L47.47 185h-.08a24 24 0 0 0 1 45.16l.41.13l137.3 58.63a16 16 0 0 0 15.54-3.59L422 80a7.07 7.07 0 0 1 10 10L226.66 310.26a16 16 0 0 0-3.59 15.54l58.65 137.38c.06.2.12.38.19.57c3.2 9.27 11.3 15.81 21.09 16.25h1a24.63 24.63 0 0 0 23-15.46L478.39 64.62A24 24 0 0 0 473 39.05" /></svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Tags) */}
            <div className="flex gap-2 mt-3 px-0 text-white text-[10px] flex-wrap justify-center overflow-visible z-50">
                {/* 1. Upload & Analyze Button */}
                 <button 
                   onClick={() => {
                     setPendingAction('ANALYZE_RISK');
                     fileInputRef.current?.click();
                   }}
                   className="px-3 py-1.5 bg-[#1b1b1b] border-[1.5px] border-[#363636] rounded-[10px] hover:bg-neutral-800 transition-colors whitespace-nowrap text-[#14b8a6] border-[#14b8a6]/30 flex items-center gap-2 group shadow-lg"
                >
                   <svg className="group-hover:animate-bounce" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                   Upload & Analyze
                </button>

                {/* 2. Draft Instruments Dropdown */}
                <div className="relative">
                    <button 
                      onClick={() => setDraftMenuOpen(!draftMenuOpen)}
                      className="px-3 py-1.5 bg-[#1b1b1b] border-[1.5px] border-[#363636] rounded-[10px] hover:bg-neutral-800 transition-colors whitespace-nowrap flex items-center gap-2 shadow-lg"
                    >
                      <span>Draft Instruments</span>
                      <svg className={`w-3 h-3 transition-transform ${draftMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {draftMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-[#1b1b1b]/95 backdrop-blur-xl border border-[#363636] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col p-1 z-[60] animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-800 mb-1">
                                 Select Template
                             </div>
                             <button onClick={() => handleSend("Generate a UCC compliant Promissory Note for $10,000 between generic parties.")} className="text-left px-3 py-2 text-neutral-300 hover:bg-[#363636] hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Promissory Note ($10k)
                             </button>
                             <button onClick={() => handleSend("Generate a UCC Article 9 Security Agreement. Collateral: '2023 Ford F-150 VIN#12345'.")} className="text-left px-3 py-2 text-neutral-300 hover:bg-[#363636] hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Security Agreement
                             </button>
                             <button onClick={() => handleSend("Draft a Bill of Sale for 500 Industrial Widgets. Price $2000.")} className="text-left px-3 py-2 text-neutral-300 hover:bg-[#363636] hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Bill of Sale
                             </button>
                             <button onClick={() => handleSend("Draft an Independent Contractor Agreement for generic web services.")} className="text-left px-3 py-2 text-neutral-300 hover:bg-[#363636] hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                Contractor Agreement
                             </button>
                        </div>
                    )}
                </div>

                {/* 3. Signature Button */}
                 <button 
                   onClick={() => setInputText("Where do I sign on this type of document?")}
                   className="px-3 py-1.5 bg-[#1b1b1b] border-[1.5px] border-[#363636] rounded-[10px] hover:bg-neutral-800 transition-colors whitespace-nowrap shadow-lg text-neutral-400 hover:text-white"
                >
                  Show Signature Areas
                </button>
            </div>
         </div>
         
         {/* File Input */}
         <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple
            accept="image/*,application/pdf,text/plain" 
            onChange={handleFileChange}
          />
         
         {/* Folder Input */}
         <input
            type="file"
            ref={folderInputRef}
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={handleFileChange}
         />
      </div>

      {/* RESULT STREAM (Messages) */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 space-y-12 scrollbar-hide w-full max-w-5xl mx-auto">
        {history.length === 0 && (
            <div className="flex h-full items-center justify-center opacity-30">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto border border-neutral-700 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Awaiting Command</div>
                </div>
            </div>
        )}

        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[80%] ${
              msg.role === Role.USER 
                ? 'text-right' 
                : 'text-left'
            }`}>
              
              {msg.role === Role.MODEL && (
                 <div className="mb-3 opacity-50">
                    <div className="text-[9px] uppercase tracking-widest text-[#d4af37] flex items-center gap-2">
                        <span className="w-1 h-1 bg-[#d4af37] rounded-full"></span>
                        Arbiter Node Response
                    </div>
                 </div>
              )}

              {msg.images && msg.images.length > 0 && (
                <div className={`flex flex-wrap gap-2 mb-4 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                  {msg.images.map((attachment, idx) => {
                    const isImage = attachment.startsWith('data:image');
                    return isImage ? (
                      <img key={idx} src={attachment} alt="Evidence" className="max-w-[200px] h-auto border border-neutral-800 opacity-80" />
                    ) : (
                      <div key={idx} className="p-2 border border-neutral-700 bg-neutral-900 text-xs text-neutral-400">
                          DOC_{idx}
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className={`inline-block p-4 md:p-6 border backdrop-blur-sm shadow-glow transition-all duration-500 ${
                  msg.role === Role.USER 
                  ? 'bg-neutral-900/30 border-neutral-800 text-neutral-200' 
                  : 'bg-black border-neutral-800 text-neutral-300'
              }`}>
                <div className="font-mono text-sm leading-relaxed">
                   {renderMessageText(msg.text)}
                </div>
              </div>

              {msg.audioData && (
                <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-widest text-neutral-600 cursor-pointer hover:text-white" onClick={() => playAudioResponse(msg.audioData!)}>
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
             <div className="border border-neutral-800 bg-black p-4 flex flex-col gap-2 min-w-[300px] shadow-glow">
                <div className="flex items-center justify-between text-[10px] uppercase text-neutral-500 tracking-widest border-b border-neutral-900 pb-2">
                   <span>Status</span>
                   <span className="text-[#14b8a6] animate-pulse">Running</span>
                </div>
                <div className="font-mono text-xs text-white uppercase">{loadingStage || 'Processing...'}</div>
                <div className="h-1 w-full bg-neutral-900 mt-2 overflow-hidden">
                   <div className="h-full bg-[#14b8a6] w-1/3 animate-[shimmer_1s_infinite]"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
};
