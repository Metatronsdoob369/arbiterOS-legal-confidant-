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
    <div data-testid="view-audit-log" className="h-full overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto flex flex-col font-mono bg-black">
      <div className="mb-8 border-b border-neutral-800 pb-6">
        <h2 data-testid="heading-audit-log" className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Governance Ledger</h2>
        <p className="text-neutral-500 text-xs uppercase tracking-wider max-w-xl">
          Persisted audit events and processing records for the logged-in user.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] mb-8">
        <div className="bg-[#050505] border border-neutral-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-800 bg-[#0a0a0a] px-4 py-3">
            <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Audit Events</h3>
            <span className="text-[9px] uppercase tracking-widest text-neutral-600">{entries.length} records</span>
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
