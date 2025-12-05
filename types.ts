
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  images?: string[]; // base64 data URIs
  audioData?: Uint8Array; // Raw PCM for TTS playback
  isError?: boolean;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface ArbiterMetadata {
  refinementIterations?: number;
  criticScore?: number; // 0.0 to 1.0
  complianceCheck?: boolean;
  latencyMs?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;      // e.g., "Legal Inquiry", "Contract Analysis"
  details: string;     // Brief description
  source: 'Advisor' | 'Studio' | 'System' | 'Arbiter';
  status: 'Verified' | 'Pending' | 'Error' | 'Refining';
  hash: string;        // Simulated transaction hash
  metadata?: ArbiterMetadata;
}

export interface AuditContextType {
  entries: AuditEntry[];
  addEntry: (
    action: string, 
    details: string, 
    source: AuditEntry['source'], 
    status?: AuditEntry['status'],
    metadata?: ArbiterMetadata
  ) => void;
  clearLog: () => void;
}

// Global declaration for window.aistudio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext?: typeof AudioContext;
  }
}
