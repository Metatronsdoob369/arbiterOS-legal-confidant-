import React from 'react';
import { ProcessedFilesPanel } from './ProcessedFilesPanel';
import { apiFetch } from '../services/localApiClient';

interface AuditEventItem {
  id: string;
  userId: string | null;
  domain: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export const AuditLog: React.FC = () => {
  const [entries, setEntries] = React.useState<AuditEventItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    void apiFetch<{ items: AuditEventItem[] }>('/api/audit-events')
      .then((payload) => {
        if (mounted) {
          setEntries(payload.items);
        }
      })
      .catch(() => {
        if (mounted) {
          setEntries([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div data-testid="view-audit-log" className="h-full overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto flex flex-col font-mono" style={{ background: 'linear-gradient(180deg, #0f1216 0%, #0a0a0c 100%)', color: '#eef1f5' }}>
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid rgba(207,213,222,0.14)' }}>
        <h2 data-testid="heading-audit-log" className="text-3xl font-bold mb-2 uppercase tracking-tight font-sans" style={{ color: '#eef1f5' }}>Governance Ledger</h2>
        <p className="text-xs uppercase tracking-wider max-w-xl" style={{ color: '#9aa1ab' }}>
          Persisted audit events and processing records for the logged-in user.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] mb-8">
        <div className="rounded-lg overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(207,213,222,0.22)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(207,213,222,0.14)', background: '#14171c' }}>
            <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#9aa1ab' }}>Audit Events</h3>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: '#9aa1ab' }}>{entries.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[10px] uppercase tracking-widest">
                  <th className="p-4 font-bold">Timestamp</th>
                  <th className="p-4 font-bold">Domain</th>
                  <th className="p-4 font-bold">Action</th>
                  <th className="p-4 font-bold">Resource</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td className="p-8 text-center text-neutral-600" colSpan={4}>
                      Loading audit ledger...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td className="p-8 text-center text-neutral-600" colSpan={4}>
                      Ledger empty.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-neutral-900 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 align-top whitespace-nowrap text-neutral-500 text-xs">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 align-top text-neutral-300 text-xs uppercase tracking-widest">
                        {entry.domain}
                      </td>
                      <td className="p-4 align-top text-white font-medium">
                        {entry.action}
                        <div className="text-[10px] text-neutral-500 mt-1 max-w-md leading-relaxed">
                          {typeof entry.details.query === 'string' ? `Query: ${entry.details.query}` : entry.resourceType}
                        </div>
                      </td>
                      <td className="p-4 align-top text-neutral-400 text-xs">
                        {entry.resourceType}:{entry.resourceId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ProcessedFilesPanel />
      </div>
    </div>
  );
};
