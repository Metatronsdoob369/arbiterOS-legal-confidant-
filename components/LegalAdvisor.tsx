
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { sendLegalMessage, runArbiterAudit } from '../services/aiProvider';
import { draftDownloadUrl } from '../services/draftsClient';
import { decodeAudioData, playAudioBuffer } from '../services/audio';
import { segmentRegisterHighlights } from '../services/registerHighlight';
import { useAudit } from '../contexts/AuditContext';
import { ArbiterBadge } from './ArbiterBadge';

interface StagedFile {
  data: string;
  name: string;
  path?: string;
}

export type AdvisorMode = 'counsel' | 'private';

export const LegalAdvisor: React.FC<{ nightMode?: boolean; mode?: AdvisorMode }> = ({
  nightMode = false,
  mode = 'counsel',
}) => {
  const privateMode = mode === 'private';
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
        shadowCounsel,
        undefined,
        privateMode,
      );
      
      setLoadingStage('ARBITER CRITIC: AUDITING RESPONSE...');
      const auditResult = await runArbiterAudit(response.text);

      const surfaces = privateMode ? response.registerSurfaces : undefined;
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        text: response.text,
        timestamp: new Date(),
        audioData: response.audioData,
        draftIds: response.draftIds,
        registerSurfaces: surfaces,
      };

      setHistory((prev) => [
        ...prev.map((msg) =>
          msg.id === userMsg.id
            ? { ...msg, registerSurfaces: surfaces }
            : msg
        ),
        modelMsg,
      ]);

      const latency = Date.now() - startTime;
      addEntry(
        privateMode ? 'Private Confidant Reply' : 'Counsel Dispensed',
        `Audit Score: ${(auditResult.score * 100).toFixed(0)}%`, 
        privateMode ? 'Private Confidant' : 'Arbiter',
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

  const handleDownloadDraft = async (draftId: string) => {
    try {
      const response = await fetch(draftDownloadUrl(draftId), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `draft-${draftId.slice(0, 8)}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      addEntry('Word Export', `Downloaded draft ${draftId.slice(0, 8)}`, 'Advisor', 'Verified');
    } catch (error) {
      console.error(error);
      addEntry('Word Export', 'Failed to download .docx', 'System', 'Error');
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

  const renderRegisteredPlain = (text: string, surfaces?: string[]) => {
    if (!surfaces || surfaces.length === 0) {
      return text;
    }
    return segmentRegisterHighlights(text, surfaces).map((segment, index) =>
      segment.registered ? (
        <mark
          key={`reg-${index}`}
          data-testid="register-surface"
          title="Registered by the private confidant lexicon"
          className="register-surface"
          style={{
            background: 'transparent',
            color: 'inherit',
            borderBottom: '2px solid rgba(212, 175, 55, 0.85)',
            boxShadow: 'inset 0 -0.35em 0 rgba(212, 175, 55, 0.18)',
            borderRadius: '1px',
            padding: '0 1px',
          }}
        >
          {segment.text}
        </mark>
      ) : (
        <React.Fragment key={`plain-${index}`}>{segment.text}</React.Fragment>
      ),
    );
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[(?:SIGNATURE_FIELD|CITATION):.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[SIGNATURE_FIELD')) {
        const label = part.includes(':') ? part.split(':')[1].replace(']', '') : 'SIGN HERE';
        return (
          <div key={index} className="my-4 p-4 border border-dashed border-[#cfd5de] bg-[#cfd5de]/10 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-[#cfd5de]/15 transition-all">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-[#cfd5de] flex items-center justify-center text-black font-bold text-xs animate-pulse">
                 ✍️
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-bold text-[#cfd5de] uppercase tracking-widest">{label}</span>
                 <span className="text-[10px] text-neutral-400">Electronic Signature Required</span>
               </div>
            </div>
            <div className="h-px flex-1 bg-[#cfd5de]/30 mx-4"></div>
            <span className="text-[9px] text-neutral-500 font-mono group-hover:text-[#cfd5de]">CLICK TO SIGN</span>
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
            blockquote: ({children}) => <blockquote className="border-l-2 border-[#cfd5de] pl-3 my-2 text-neutral-400 italic">{children}</blockquote>,
          }}
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div
      data-testid={privateMode ? 'view-private-confidant' : 'view-legal-advisor'}
      className="flex flex-col h-full relative overflow-hidden"
      style={{
      background: nightMode
        ? 'radial-gradient(ellipse 800px 600px at 50% 20%, rgba(42,46,53,0.9) 0%, #0a0a0c 60%)'
        : privateMode
          ? 'linear-gradient(180deg, #14171c 0%, #0a0a0c 100%)'
          : 'linear-gradient(180deg, #0f1216 0%, #0a0a0c 100%)',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      
      {/* System Reset Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] uppercase tracking-widest transition-all backdrop-blur-sm group"
          style={{
            background: 'rgba(28,32,38,0.85)',
            border: '1px solid rgba(207,213,222,0.22)',
            color: '#9aa1ab',
          }}
        >
          <svg className="w-3 h-3 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          System Reset
        </button>
      </div>

      {/* Top: badge stays — room for your next top-area touch */}
      <div className="flex flex-col items-center pt-5 pb-3 z-40 w-full shrink-0">
         <div className="transform hover:scale-105 transition-transform duration-500">
            <ArbiterBadge />
         </div>
         {privateMode && (
           <div
             data-testid="private-mode-badge"
             className="mt-3 px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.2em]"
             style={{
               color: '#c4a574',
               border: '1px solid rgba(196,165,116,0.4)',
               background: 'rgba(196,165,116,0.08)',
             }}
           >
             Private Confidant · Register Mode
           </div>
         )}
      </div>

      {/* Record stream — fills middle */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-4 space-y-10 scrollbar-hide w-full max-w-4xl mx-auto">
        {history.length === 0 && (
          <div className="flex h-full items-center justify-center opacity-30">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(207,213,222,0.22)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#9aa1ab" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: '#9aa1ab' }}>
                {privateMode ? 'Awaiting Your Wording' : 'Awaiting Counsel'}
              </div>
            </div>
          </div>
        )}

        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[80%] ${msg.role === Role.USER ? 'text-right' : 'text-left'}`}>
              
              {msg.role === Role.MODEL && (
                <div className="mb-3 opacity-60">
                  <div className="text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: '#c4a574' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#cfd5de' }}></span>
                    {privateMode ? 'Private Confidant' : 'Arbiter Counsel'}
                  </div>
                </div>
              )}

              {msg.images && msg.images.length > 0 && (
                <div className={`flex flex-wrap gap-2 mb-4 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                  {msg.images.map((attachment, idx) => {
                    const isImage = attachment.startsWith('data:image');
                    return isImage ? (
                      <img key={idx} src={attachment} alt="Evidence" className="max-w-[200px] h-auto opacity-80" style={{ border: '1px solid rgba(207,213,222,0.22)' }} />
                    ) : (
                      <div key={idx} className="p-2 text-xs" style={{ border: '1px solid rgba(207,213,222,0.22)', background: '#1c2026', color: '#9aa1ab' }}>
                        DOC_{idx}
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="inline-block p-5 md:p-6 rounded-lg transition-all duration-500" style={{
                background: msg.role === Role.USER 
                  ? 'linear-gradient(135deg, #2a2e35, #1c2026)' 
                  : nightMode
                    ? 'linear-gradient(135deg, rgba(42,46,53,0.95), rgba(28,32,38,0.95))'
                    : 'linear-gradient(135deg, #14171c, #0f1216)',
                border: '1px solid rgba(207,213,222,0.18)',
                boxShadow: nightMode && msg.role === Role.MODEL
                  ? '0 0 30px rgba(207,213,222,0.06), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.3)',
                color: '#eef1f5',
              }}>
                <div className="text-sm leading-relaxed font-sans">
                  {msg.role === Role.USER ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-0">
                      {renderRegisteredPlain(
                        msg.text,
                        privateMode ? msg.registerSurfaces : undefined,
                      )}
                    </p>
                  ) : (
                    renderMessageText(msg.text)
                  )}
                </div>
                {privateMode && msg.role === Role.USER && msg.registerSurfaces && msg.registerSurfaces.length > 0 && (
                  <div
                    className="mt-2 text-[9px] uppercase tracking-widest"
                    style={{ color: '#a89060' }}
                    data-testid="register-receipt"
                  >
                    Lexicon registered {msg.registerSurfaces.length} term
                    {msg.registerSurfaces.length === 1 ? '' : 's'}
                  </div>
                )}
                {msg.draftIds && msg.draftIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" data-testid="draft-download-actions">
                    {msg.draftIds.map((draftId) => (
                      <button
                        key={draftId}
                        type="button"
                        data-testid={`download-docx-${draftId}`}
                        onClick={() => handleDownloadDraft(draftId)}
                        className="px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-md transition-colors"
                        style={{
                          background: 'rgba(212,175,55,0.12)',
                          border: '1px solid #cfd5de',
                          color: '#cfd5de',
                        }}
                      >
                        Download .docx
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.audioData && (
                <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-widest cursor-pointer transition-colors" 
                     style={{ color: '#9aa1ab' }}
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
              background: '#1c2026',
              border: '1px solid rgba(207,213,222,0.22)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest pb-2" style={{ borderBottom: '1px solid rgba(207,213,222,0.14)' }}>
                <span style={{ color: '#9aa1ab' }}>Status</span>
                <span className="animate-pulse" style={{ color: '#cfd5de' }}>Running</span>
              </div>
              <div className="text-xs uppercase" style={{ color: '#eef1f5' }}>{loadingStage || 'Processing...'}</div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(207,213,222,0.15)' }}>
                <div className="h-full w-1/3 animate-[shimmer_1s_infinite]" style={{ background: '#cfd5de' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom dock: chips + composer — badge stays top */}
      <div className="shrink-0 z-40 w-full px-4 pb-4 pt-2" style={{
        background: 'radial-gradient(120% 90% at 50% 130%, rgba(215,224,234,0.08), transparent 55%)',
      }}>
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex gap-2 mb-2.5 text-[10px] flex-wrap justify-center overflow-visible relative z-50">
            {privateMode && (
              <>
                <button
                  onClick={() =>
                    handleSend(
                      'Mirror how I used “money” here, then distinguish the institutional sense if it differs.',
                    )
                  }
                  className="px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1c2026',
                    border: '1px solid rgba(196,165,116,0.4)',
                    color: '#c4a574',
                  }}
                >
                  Mirror a Term
                </button>
                <button
                  onClick={() =>
                    handleSend(
                      'Clarify “Minor” vs “minor” before we propose anything — case matters.',
                    )
                  }
                  className="px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1c2026',
                    border: '1px solid rgba(207,213,222,0.22)',
                    color: '#9aa1ab',
                  }}
                >
                  Clarify Casing
                </button>
                <button
                  onClick={() =>
                    setInputText(
                      'I noticed a phrase that may need a lexicon entry. Research it first, then propose if clear.',
                    )
                  }
                  className="px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1c2026',
                    border: '1px solid rgba(207,213,222,0.22)',
                    color: '#9aa1ab',
                  }}
                >
                  Propose After Research
                </button>
              </>
            )}

            {!privateMode && (
              <>
                <button
                  onClick={() => {
                    setPendingAction('ANALYZE_RISK');
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2 group transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1c2026',
                    border: '1px solid rgba(94,234,212,0.45)',
                    color: '#5eead4',
                  }}
                >
                  <svg className="group-hover:animate-bounce" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload & Analyze
                </button>
                <button
                  onClick={() => setInputText('Where do I sign on this type of document?')}
                  className="px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#1c2026',
                    border: '1px solid rgba(207,213,222,0.22)',
                    color: '#9aa1ab',
                  }}
                >
                  Show Signature Areas
                </button>
              </>
            )}

            {/* Draft Instruments — both modes */}
            <div className="relative">
              <button
                onClick={() => setDraftMenuOpen(!draftMenuOpen)}
                className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: '#1c2026',
                  border: '1px solid rgba(207,213,222,0.28)',
                  color: '#cfd5de',
                }}
              >
                <span>Draft Instruments</span>
                <svg className={`w-3 h-3 transition-transform ${draftMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {draftMenuOpen && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-xl overflow-hidden flex flex-col p-1 z-[60]"
                  style={{
                    background: 'linear-gradient(180deg, #2a2e35 0%, #1c2026 100%)',
                    border: '1px solid rgba(207,213,222,0.22)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                  }}
                >
                  <div className="px-3 py-2 text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#9aa1ab', borderBottom: '1px solid rgba(207,213,222,0.14)' }}>
                    Select Template
                  </div>
                  <button onClick={() => { setDraftMenuOpen(false); handleSend('Generate a UCC compliant Promissory Note for $10,000 between generic parties.'); }} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 hover:bg-white/5" style={{ color: '#eef1f5' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }}></span>
                    Promissory Note ($10k)
                  </button>
                  <button onClick={() => { setDraftMenuOpen(false); handleSend("Generate a UCC Article 9 Security Agreement. Collateral: '2023 Ford F-150 VIN#12345'."); }} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 hover:bg-white/5" style={{ color: '#eef1f5' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }}></span>
                    Security Agreement
                  </button>
                  <button onClick={() => { setDraftMenuOpen(false); handleSend('Draft a Bill of Sale for 500 Industrial Widgets. Price $2000.'); }} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 hover:bg-white/5" style={{ color: '#eef1f5' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#16a34a' }}></span>
                    Bill of Sale
                  </button>
                  <button onClick={() => { setDraftMenuOpen(false); handleSend('Draft an Independent Contractor Agreement for generic web services.'); }} className="text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 hover:bg-white/5" style={{ color: '#eef1f5' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#c4a574' }}></span>
                    Contractor Agreement
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden" style={{
            background:
              'radial-gradient(120% 90% at 50% 130%, rgba(215,224,234,0.1), transparent 55%), linear-gradient(180deg, #2a2e35 0%, #1c2026 70%, #14171c 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            border: '1px solid rgba(207,213,222,0.32)',
          }}>
            <div className="h-px w-full" style={{
              background: 'linear-gradient(90deg, transparent, rgba(207,213,222,0.45), transparent)',
            }} />

            {selectedFiles.length > 0 && (
              <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hide">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap" style={{
                    background: 'rgba(10,10,12,0.55)',
                    border: '1px solid rgba(207,213,222,0.22)',
                    color: '#cfd5de',
                  }}>
                    <span className="truncate max-w-[100px]">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="hover:text-red-400 ml-1 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 pt-3 pb-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  privateMode
                    ? 'Point at a word, a casing, a policy phrase — we map it before we keep it...'
                    : 'State your case, counselor...'
                }
                rows={2}
                className="w-full bg-transparent text-sm font-sans resize-none outline-none leading-relaxed scrollbar-hide placeholder:text-silver-den/60"
                style={{
                  color: '#eef1f5',
                  minHeight: '56px',
                  caretColor: '#cfd5de',
                }}
              />
            </div>

            <div className="flex justify-between items-center px-4 pb-3">
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="transition-all duration-300 hover:-translate-y-0.5 hover:text-silver-bright"
                  style={{ color: '#9aa1ab' }}
                  title="Attach"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="transition-all duration-300 hover:-translate-y-0.5 hover:text-silver-bright"
                  style={{ color: '#9aa1ab' }}
                  title="Add Knowledge Base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" /></svg>
                </button>
                <button
                  onClick={() => setSearchEnabled(!searchEnabled)}
                  className="transition-all duration-300 hover:-translate-y-0.5"
                  style={{ color: searchEnabled ? '#5eead4' : '#9aa1ab' }}
                  title="Live Analysis Mode"
                >
                  <svg viewBox="0 0 24 24" height={22} width={22} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>
                </button>
                <button
                  onClick={() => setShadowCounsel(!shadowCounsel)}
                  className="transition-all duration-300 hover:-translate-y-0.5"
                  style={{ color: shadowCounsel ? '#c4a574' : '#9aa1ab' }}
                  title="Shadow Counsel (Heavy Model)"
                >
                  <svg viewBox="0 0 24 24" height={22} width={22} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </button>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={(!inputText && selectedFiles.length === 0) || isLoading}
                className="rounded-xl transition-all active:scale-95 hover:border-silver-bright disabled:opacity-30"
                style={{
                  background: '#2a2e35',
                  border: '1.5px solid #cfd5de',
                  padding: '10px 14px',
                  color: '#eef1f5',
                }}
              >
                <svg viewBox="0 0 512 512" className="w-5 h-5" style={{ color: '#cfd5de' }}>
                  <path fill="currentColor" d="M473 39.05a24 24 0 0 0-25.5-5.46L47.47 185h-.08a24 24 0 0 0 1 45.16l.41.13l137.3 58.63a16 16 0 0 0 15.54-3.59L422 80a7.07 7.07 0 0 1 10 10L226.66 310.26a16 16 0 0 0-3.59 15.54l58.65 137.38c.06.2.12.38.19.57c3.2 9.27 11.3 15.81 21.09 16.25h1a24.63 24.63 0 0 0 23-15.46L478.39 64.62A24 24 0 0 0 473 39.05" />
                </svg>
              </button>
            </div>
          </div>
        </div>

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
          {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={handleFileChange}
        />
      </div>

    </div>
  );
};
