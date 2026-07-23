import React from 'react';
import { apiFetch } from '../services/localApiClient';

interface ProcessedFileItem {
  id: string;
  sourceFilename: string;
  processingStatus: string;
}

export const ProcessedFilesPanel: React.FC = () => {
  const [items, setItems] = React.useState<ProcessedFileItem[]>([]);

  React.useEffect(() => {
    void apiFetch<{ items: ProcessedFileItem[] }>('/api/processed-files')
      .then((payload) => setItems(payload.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <section data-testid="processed-files-panel" className="rounded-lg p-4" style={{ border: '1px solid rgba(207,213,222,0.22)', background: '#1c2026' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#9aa1ab' }}>Processed Files</h3>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: '#9aa1ab' }}>{items.length} records</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs" style={{ color: '#9aa1ab' }}>No processed files yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded px-3 py-2 text-xs" style={{ border: '1px solid rgba(207,213,222,0.14)', background: '#0a0a0c' }}>
              <span className="truncate pr-3" style={{ color: '#eef1f5' }}>{item.sourceFilename}</span>
              <span className="uppercase tracking-widest text-[9px]" style={{ color: '#9aa1ab' }}>{item.processingStatus}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
