import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { Wifi, WifiOff, Loader2, QrCode, AlertCircle, Link, Zap } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
  phoneNumber: string | null;
  webhookUrl: string | null;
  webhookEvents: string;
  features: string;
}

interface SessionStats {
  total: number;
  sent: number;
  received: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: 'Connected', color: 'text-primary', bg: 'bg-primary/15' },
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', bg: 'bg-muted' },
  connecting: { label: 'Connecting...', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  qr_ready: { label: 'Scan QR Code', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  error: { label: 'Error', color: 'text-destructive', bg: 'bg-destructive/15' },
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading } = useQuery<{ session: Session }>({
    queryKey: ['session', id],
    queryFn: () => api.get(`/api/sessions/${id}`),
  });

  const { data: statsData } = useQuery<SessionStats>({
    queryKey: ['session-stats', id],
    queryFn: () => api.get(`/api/sessions/${id}/stats`),
  });

  useSocket({
    qr: (d: unknown) => {
      const data = d as { sessionId: string; qr: string };
      if (data.sessionId === id) setQrCode(data.qr);
    },
    session_status: (d: unknown) => {
      const data = d as { sessionId: string };
      if (data.sessionId === id) {
        queryClient.invalidateQueries({ queryKey: ['session', id] });
        setQrCode(null);
      }
    },
  });

  useEffect(() => {
    if (data?.session?.webhookUrl) setWebhookUrl(data.session.webhookUrl);
  }, [data?.session?.webhookUrl]);

  const session = data?.session;

  const handleConnect = async () => {
    setActionLoading(true);
    try { await api.post(`/api/sessions/${id}/connect`); } catch (e) { alert(String(e)); }
    finally { setActionLoading(false); }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/sessions/${id}/disconnect`);
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    } catch (e) { alert(String(e)); }
    finally { setActionLoading(false); }
  };

  const saveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    try {
      await api.patch(`/api/sessions/${id}/webhook`, {
        webhookUrl: webhookUrl || null,
        events: ['message'],
      });
    } catch (e) { alert(String(e)); }
    finally { setSavingWebhook(false); }
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-card rounded w-48" /><div className="h-40 bg-card rounded" /></div>;
  if (!session) return <div className="text-muted-foreground">Session not found</div>;

  const cfg = statusConfig[session.status] ?? statusConfig.disconnected;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">{id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Status + actions */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          {session.phoneNumber && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
              <p className="font-mono text-sm">+{session.phoneNumber}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {session.status !== 'connected' && session.status !== 'connecting' && (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Connect
            </button>
          )}
          {(session.status === 'connected' || session.status === 'connecting') && (
            <button
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/70 disabled:opacity-50 transition-colors"
            >
              <WifiOff className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>

        {/* QR Code */}
        {(session.status === 'qr_ready' || qrCode) && qrCode && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <QrCode className="w-4 h-4 text-yellow-400" />
              Scan with WhatsApp
            </p>
            <div className="bg-white p-3 rounded-xl">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-muted-foreground">Open WhatsApp → Linked Devices → Link a Device</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: statsData?.total ?? 0, icon: Zap },
          { label: 'Sent', value: statsData?.sent ?? 0, icon: Wifi },
          { label: 'Received', value: statsData?.received ?? 0, icon: AlertCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Webhook */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Link className="w-4 h-4 text-muted-foreground" />
          Webhook
        </h2>
        <form onSubmit={saveWebhook} className="flex gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={savingWebhook}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingWebhook ? 'Saving...' : 'Save'}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">Incoming messages will be POSTed to this URL with HMAC-SHA256 signature.</p>
      </div>
    </div>
  );
}
