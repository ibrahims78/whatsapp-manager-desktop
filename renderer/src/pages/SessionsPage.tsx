import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { Plus, Wifi, WifiOff, Loader2, AlertCircle, QrCode, Trash2, ChevronRight } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
  phoneNumber: string | null;
  createdAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  connected: { label: 'Connected', color: 'text-primary', icon: Wifi },
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', icon: WifiOff },
  connecting: { label: 'Connecting', color: 'text-blue-400', icon: Loader2 },
  qr_ready: { label: 'Scan QR', color: 'text-yellow-400', icon: QrCode },
  error: { label: 'Error', color: 'text-destructive', icon: AlertCircle },
};

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery<{ sessions: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/api/sessions'),
  });

  useSocket({
    session_status: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/api/sessions', { name: newName.trim() });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setNewName('');
      setShowNew(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (id: string, name: string) => {
    if (!confirm(`Delete session "${name}"?`)) return;
    try {
      await api.delete(`/api/sessions/${id}`);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">{sessions.length} WhatsApp session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {showNew && (
        <form onSubmit={createSession} className="bg-card border border-border rounded-xl p-5 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name (e.g. Sales, Support)"
            autoFocus
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="px-4 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/70 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No sessions yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create your first WhatsApp session</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const cfg = statusConfig[session.status] ?? statusConfig.disconnected;
            const StatusIcon = cfg.icon;
            return (
              <div key={session.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-muted flex-shrink-0`}>
                  <StatusIcon className={`w-4 h-4 ${cfg.color} ${session.status === 'connecting' ? 'animate-spin' : ''}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{session.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session.phoneNumber ? `+${session.phoneNumber}` : session.id}
                  </p>
                </div>

                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => deleteSession(session.id, session.name)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link href={`/sessions/${session.id}`}>
                    <a className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Smartphone({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
