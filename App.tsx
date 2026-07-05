
import React from 'react';
import { LegalAdvisor } from './components/LegalAdvisor';
import { ImageGen } from './components/ImageGen';
import { AuditLog } from './components/AuditLog';
import { CaseBoard } from './components/CaseBoard';
import { Library } from './components/Library';
import { EvidenceBoard } from './components/EvidenceBoard';
import { AuditProvider } from './contexts/AuditContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NightModeProvider, useNightMode } from './contexts/NightModeContext';
import { NightModeOverlay } from './components/NightModeOverlay';
import { LoginScreen } from './components/auth/LoginScreen';
import { NavItem } from './components/NavItem';
import { TooltipProvider } from './components/ui';

enum View {
  ADVISOR = 'advisor',
  EVIDENCE = 'evidence',
  LIBRARY = 'library',
  CASE_BOARD = 'case_board',
  STUDIO = 'studio',
  AUDIT = 'audit',
}

// ── Scale of Justice SVG (logo / night-mode off) ─────────────────────────────
const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);

// ── Lamp SVG (logo / night-mode on) ──────────────────────────────────────────
const LampIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#1a0f0a" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6m-3-3v3m-4-6h8l1-8H8l1 8zm3-12V2m5 3l1-1M6 5L5 4m14 7h2M3 11H1" />
  </svg>
);

const AppWorkspace: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<View>(View.ADVISOR);
  const { nightMode, toggleNightMode } = useNightMode();

  return (
    <div
      data-testid="app-root"
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif", background: '#0d0806', color: '#e8dcc8' }}
    >
      {/* Night Mode Reading Lamp Overlay — unique effect, not a theme switch */}
      {nightMode && <NightModeOverlay />}

      {/* ── Sidebar — Mahogany Panel ── */}
      <aside
        data-testid="sidebar"
        className="w-20 md:w-64 flex flex-col z-10 transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, #1e1410 0%, #150d08 100%)',
          borderRight: '2px solid #3d2b1f',
          boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo — click to toggle Night Mode */}
        <div
          data-testid="night-mode-toggle"
          className="p-5 flex items-center justify-center md:justify-start gap-3 cursor-pointer group"
          style={{ borderBottom: '1px solid #3d2b1f' }}
          onClick={toggleNightMode}
          title="Toggle Reading Lamp"
        >
          <div
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-500"
            style={{
              background: nightMode
                ? 'linear-gradient(135deg, #d4af37, #ffd700)'
                : 'linear-gradient(135deg, #3d2b1f, #2a1c12)',
              border: `1px solid ${nightMode ? '#d4af37' : '#5a4030'}`,
              boxShadow: nightMode
                ? '0 0 20px rgba(212,175,55,0.5), 0 0 40px rgba(255,200,100,0.2)'
                : '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {nightMode ? <LampIcon className="w-5 h-5" /> : <ScaleIcon className="w-5 h-5" />}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#d4af37' }}>Arbiter</span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#5a4030' }}>Legal Confidant</span>
          </div>
        </div>

        {/* Navigation */}
        <nav data-testid="sidebar-nav" className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto scrollbar-hide">
          <NavItem
            data-testid="nav-btn-advisor"
            label="Counsel"
            active={currentView === View.ADVISOR}
            onClick={() => setCurrentView(View.ADVISOR)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          />
          <NavItem
            data-testid="nav-btn-evidence"
            label="Evidence"
            active={currentView === View.EVIDENCE}
            onClick={() => setCurrentView(View.EVIDENCE)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
          />
          <NavItem
            data-testid="nav-btn-library"
            label="Library"
            active={currentView === View.LIBRARY}
            onClick={() => setCurrentView(View.LIBRARY)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />
          <NavItem
            data-testid="nav-btn-case_board"
            label="Case Map"
            active={currentView === View.CASE_BOARD}
            onClick={() => setCurrentView(View.CASE_BOARD)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
          />
          <NavItem
            data-testid="nav-btn-studio"
            label="Forensics"
            active={currentView === View.STUDIO}
            onClick={() => setCurrentView(View.STUDIO)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" /></svg>}
          />
          <NavItem
            data-testid="nav-btn-audit"
            label="Ledger"
            active={currentView === View.AUDIT}
            onClick={() => setCurrentView(View.AUDIT)}
            icon={<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
          />
        </nav>

        {/* Night Mode Indicator */}
        <div className="p-3 border-t" style={{ borderColor: '#3d2b1f' }}>
          <div className="flex items-center justify-center md:justify-start gap-2 px-2">
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: nightMode ? '#d4af37' : '#3d2b1f',
                boxShadow: nightMode ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
              }}
            />
            <span className="hidden md:block text-[9px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
              {nightMode ? 'Lamp On' : 'Lamp Off'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        style={{ background: 'linear-gradient(180deg, #0d0806 0%, #0a0604 100%)' }}
      >
        {/* Subtle mahogany grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(139,115,85,0.3) 2px,
              rgba(139,115,85,0.3) 3px
            )`,
          }}
        />

        {/* Mobile Header */}
        <header
          className="h-14 flex items-center px-4 justify-between md:hidden z-20"
          style={{ background: '#1e1410', borderBottom: '1px solid #3d2b1f' }}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={toggleNightMode}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: nightMode ? '#d4af37' : '#3d2b1f' }}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke={nightMode ? '#1a0f0a' : '#d4af37'}
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#d4af37' }}>Arbiter</span>
          </div>
        </header>

        <div data-testid={`view-${currentView}`} className="flex-1 min-h-0 relative z-10 overflow-hidden">
          {currentView === View.ADVISOR    && <LegalAdvisor nightMode={nightMode} />}
          {currentView === View.EVIDENCE   && <EvidenceBoard />}
          {currentView === View.LIBRARY    && <Library />}
          {currentView === View.CASE_BOARD && <CaseBoard />}
          {currentView === View.STUDIO     && <ImageGen />}
          {currentView === View.AUDIT      && <AuditLog />}
        </div>
      </main>
    </div>
  );
};

const AppGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (!user) {
    return <LoginScreen loading={loading} />;
  }

  return <AppWorkspace />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AuditProvider>
      <NightModeProvider>
        <TooltipProvider>
          <AppGate />
        </TooltipProvider>
      </NightModeProvider>
    </AuditProvider>
  </AuthProvider>
);

export default App;
