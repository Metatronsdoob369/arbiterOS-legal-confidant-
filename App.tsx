
import React, { useState } from 'react';
import { LegalAdvisor } from './components/LegalAdvisor';
import { ImageGen } from './components/ImageGen';
import { AuditLog } from './components/AuditLog';
import { CaseBoard } from './components/CaseBoard';
import { AuditProvider } from './contexts/AuditContext';

enum View {
  ADVISOR = 'advisor',
  STUDIO = 'studio',
  AUDIT = 'audit',
  CASE_BOARD = 'case_board'
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.ADVISOR);

  return (
    <div className="flex h-screen w-screen bg-black text-neutral-200 overflow-hidden font-mono">
      
      {/* Sidebar */}
      <aside className="w-20 md:w-64 flex flex-col border-r border-neutral-800 bg-black z-10 transition-all duration-300">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-center md:justify-start gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-3">
          <button
            onClick={() => setCurrentView(View.ADVISOR)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
              currentView === View.ADVISOR 
                ? 'bg-white text-black border border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'text-neutral-500 hover:text-white hover:border hover:border-neutral-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <span className="hidden md:block text-sm uppercase tracking-wider">Legal Guide</span>
          </button>

          <button
            onClick={() => setCurrentView(View.CASE_BOARD)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
              currentView === View.CASE_BOARD 
                ? 'bg-white text-black border border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'text-neutral-500 hover:text-white hover:border hover:border-neutral-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            <span className="hidden md:block text-sm uppercase tracking-wider">Case Map</span>
          </button>

          <button
            onClick={() => setCurrentView(View.STUDIO)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
              currentView === View.STUDIO 
                ? 'bg-white text-black border border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'text-neutral-500 hover:text-white hover:border hover:border-neutral-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" /></svg>
            <span className="hidden md:block text-sm uppercase tracking-wider">Forensic Maps</span>
          </button>

          <button
            onClick={() => setCurrentView(View.AUDIT)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
              currentView === View.AUDIT
                ? 'bg-white text-black border border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'text-neutral-500 hover:text-white hover:border hover:border-neutral-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span className="hidden md:block text-sm uppercase tracking-wider">Ledger</span>
          </button>

        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-black to-black"></div>
        
        <header className="h-16 border-b border-neutral-800 bg-black flex items-center px-6 justify-between md:hidden z-20">
             <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
             </div>
        </header>
        
        <div className="flex-1 relative z-10">
           {currentView === View.ADVISOR && <LegalAdvisor />}
           {currentView === View.CASE_BOARD && <CaseBoard />}
           {currentView === View.STUDIO && <ImageGen />}
           {currentView === View.AUDIT && <AuditLog />}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuditProvider>
      <AppContent />
    </AuditProvider>
  );
};

export default App;
