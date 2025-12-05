
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuditEntry, AuditContextType, ArbiterMetadata } from '../types';

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};

// Simple pseudo-hash generator for visual "auditable" feel
const generateHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(16, '0') + Math.random().toString(16).substr(2, 8);
};

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([
    {
      id: 'genesis',
      timestamp: new Date(),
      action: 'ArbiterOS Initialization',
      details: 'Governance ledger instantiated. Constitution loaded.',
      source: 'System',
      status: 'Verified',
      hash: generateHash('genesis-block-governance'),
      metadata: { complianceCheck: true, criticScore: 1.0 }
    }
  ]);

  const addEntry = (
    action: string, 
    details: string, 
    source: AuditEntry['source'], 
    status: AuditEntry['status'] = 'Verified',
    metadata?: ArbiterMetadata
  ) => {
    const newEntry: AuditEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date(),
      action,
      details,
      source,
      status,
      hash: generateHash(action + details + Date.now()),
      metadata
    };
    setEntries(prev => [newEntry, ...prev]);
  };

  const clearLog = () => {
    setEntries([
      {
        id: 'reboot-' + Date.now(),
        timestamp: new Date(),
        action: 'System Reboot',
        details: 'Audit Ledger flushed by user command. Clean state initialized.',
        source: 'System',
        status: 'Verified',
        hash: generateHash('reboot-' + Date.now()),
        metadata: { complianceCheck: true, criticScore: 1.0 }
      }
    ]);
  };

  return (
    <AuditContext.Provider value={{ entries, addEntry, clearLog }}>
      {children}
    </AuditContext.Provider>
  );
};
