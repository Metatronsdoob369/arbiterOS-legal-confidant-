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
    <section data-testid="processed-files-panel" className="border border-neutral-800 bg-[#050505] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Processed Files</h3>
        <span className="text-[9px] uppercase tracking-widest text-neutral-600">{items.length} records</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-neutral-600">No processed files yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border border-neutral-800 bg-black px-3 py-2 text-xs">
              <span className="text-neutral-200 truncate pr-3">{item.sourceFilename}</span>
              <span className="text-neutral-500 uppercase tracking-widest text-[9px]">{item.processingStatus}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
