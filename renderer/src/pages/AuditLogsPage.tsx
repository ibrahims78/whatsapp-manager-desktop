import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ScrollText } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  details: string | null;
  createdAt: string | null;
  userId: number | null;
  username: string | null;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; page: number; limit: number }>({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get(`/api/audit-logs?page=${page}&limit=50`),
  });

  const logs = data?.logs ?? [];

  const getActionColor = (action: string): string => {
    if (action.startsWith('auth.')) return 'text-blue-400';
    if (action.startsWith('session.delete') || action.startsWith('user.delete') || action.startsWith('apikey.delete')) return 'text-destructive';
    if (action.startsWith('session.')) return 'text-primary';
    if (action.startsWith('user.')) return 'text-purple-400';
    if (action.startsWith('apikey.')) return 'text-orange-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all system operations</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-14" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No audit logs yet</p>
          <p className="text-muted-foreground text-sm mt-1">Actions will appear here as they happen</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Action</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">User</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Details</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                let details: Record<string, unknown> = {};
                try { details = JSON.parse(log.details || '{}'); } catch { /* ignore */ }

                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3">
                      <code className={`text-xs font-mono ${getActionColor(log.action)}`}>{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.username || (log.userId ? `#${log.userId}` : 'system')}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {Object.keys(details).length > 0 ? (
                        <code className="text-xs">
                          {Object.entries(details).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}
                        </code>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {logs.length === 50 && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/70 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
