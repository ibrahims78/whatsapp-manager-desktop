import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import {
  Wifi, WifiOff, Loader2, QrCode, AlertCircle, Link, Zap,
  MessageSquare, Settings, ArrowUpRight, ArrowDownLeft, LayoutGrid,
} from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
  phoneNumber: string | null;
  webhookUrl: string | null;
  webhookEvents: string;
  features: string;
  qrCode: string | null;
}

interface SessionStats {
  total: number;
  sent: number;
  received: number;
}

interface Message {
  id: number;
  direction: 'in' | 'out';
  type: string;
  to_: string | null;
  from_: string | null;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string | null;
}

const ALL_EVENTS = ['message', 'status', 'qr'];

const FEATURES_CONFIG = [
  { key: 'storeIncomingMessages', label: 'Store incoming messages', description: 'Save received messages to the database' },
  { key: 'autoReadReceipts', label: 'Auto read receipts', description: 'Mark received messages as read automatically' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: 'Connected', color: 'text-primary', bg: 'bg-primary/15' },
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', bg: 'bg-muted' },
  connecting: { label: 'Connecting...', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  qr_ready: { label: 'Scan QR Code', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  error: { label: 'Error', color: 'text-destructive', bg: 'bg-destructive/15' },
};

type Tab = 'overview' | 'messages' | 'settings';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['message']);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(1);

  const { data, isLoading } = useQuery<{ session: Session }>({
    queryKey: ['session', id],
    queryFn: () => api.get(`/api/sessions/${id}`),
  });

  const { data: statsData } = useQuery<SessionStats>({
    queryKey: ['session-stats', id],
    queryFn: () => api.get(`/api/sessions/${id}/stats`),
  });

  const { data: messagesData } = useQuery<{ messages: Message[] }>({
    queryKey: ['session-messages', id, msgPage],
    queryFn: () => api.get(`/api/sessions/${id}/messages?page=${msgPage}&limit=50`),
    enabled: tab === 'messages',
  });

  useSocket({
    qr: (d: unknown) => {
      const data = d as { sessionId: string; qr: string };
      if (data.sessionId === id) setQrCode(data.qr);
    },
    session_status: (d: unknown) => {
      const data = d as { sessionId: string; status: string };
      if (data.sessionId === id) {
        queryClient.invalidateQueries({ queryKey: ['session', id] });
        if (data.status !== 'qr_ready') setQrCode(null);
      }
    },
  });

  useEffect(() => {
    if (data?.session?.qrCode && data.session.status === 'qr_ready') {
      setQrCode(data.session.qrCode);
    }
  }, [data?.session?.qrCode, data?.session?.status]);

  useEffect(() => {
    if (data?.session) {
      setWebhookUrl(data.session.webhookUrl || '');
      try { setWebhookEvents(JSON.parse(data.session.webhookEvents || '["message"]')); } catch { setWebhookEvents(['message']); }
      try { setFeatures(JSON.parse(data.session.features || '{}')); } catch { setFeatures({}); }
    }
  }, [data?.session]);

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
        events: webhookEvents,
      });
    } catch (e) { alert(String(e)); }
    finally { setSavingWebhook(false); }
  };

  const saveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await api.patch(`/api/sessions/${id}/features`, { features });
    } catch (e) { alert(String(e)); }
    finally { setSavingFeatures(false); }
  };

  const toggleEvent = (ev: string) => {
    setWebhookEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-card rounded w-48" /><div className="h-40 bg-card rounded" /></div>;
  if (!session) return <div className="text-muted-foreground">Session not found</div>;

  const cfg = statusConfig[session.status] ?? statusConfig.disconnected;
  const messages = messagesData?.messages ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">{id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {([
          { key: 'overview', icon: LayoutGrid, label: 'Overview' },
          { key: 'messages', icon: MessageSquare, label: 'Messages' },
          { key: 'settings', icon: Settings, label: 'Settings' },
        ] as { key: Tab; icon: React.FC<{ className?: string }>; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            {session.phoneNumber && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                <p className="font-mono text-sm">+{session.phoneNumber}</p>
              </div>
            )}
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
              { label: 'Sent', value: statsData?.sent ?? 0, icon: ArrowUpRight },
              { label: 'Received', value: statsData?.received ?? 0, icon: AlertCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MESSAGES TAB ── */}
      {tab === 'messages' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No messages yet</p>
              <p className="text-muted-foreground text-sm mt-1">Messages sent and received will appear here</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Dir</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">To / From</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Content</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        {msg.direction === 'out'
                          ? <ArrowUpRight className="w-4 h-4 text-primary" />
                          : <ArrowDownLeft className="w-4 h-4 text-green-400" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{msg.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {msg.direction === 'out' ? msg.to_ : msg.from_}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {msg.content || (msg.mediaUrl ? <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-primary underline">media</a> : '—')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <button
                  onClick={() => setMsgPage(p => Math.max(1, p - 1))}
                  disabled={msgPage === 1}
                  className="text-xs px-3 py-1.5 bg-muted rounded-lg disabled:opacity-40 hover:bg-muted/70 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-muted-foreground">Page {msgPage}</span>
                <button
                  onClick={() => setMsgPage(p => p + 1)}
                  disabled={messages.length < 50}
                  className="text-xs px-3 py-1.5 bg-muted rounded-lg disabled:opacity-40 hover:bg-muted/70 transition-colors"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div className="space-y-5">
          {/* Webhook */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Link className="w-4 h-4 text-muted-foreground" />
              Webhook
            </h2>
            <form onSubmit={saveWebhook} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground">Incoming messages will be POSTed to this URL with HMAC-SHA256 signature.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Events</label>
                <div className="flex flex-wrap gap-3">
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm font-mono">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingWebhook}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingWebhook ? 'Saving...' : 'Save Webhook'}
              </button>
            </form>
          </div>

          {/* Features */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Session Features
            </h2>
            <div className="space-y-3">
              {FEATURES_CONFIG.map(({ key, label, description }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!features[key]}
                    onChange={() => toggleFeature(key)}
                    className="accent-primary w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={saveFeatures}
              disabled={savingFeatures}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingFeatures ? 'Saving...' : 'Save Features'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
