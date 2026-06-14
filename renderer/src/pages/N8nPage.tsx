import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Workflow, Play, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  updatedAt?: string;
}

export default function N8nPage() {
  const [triggerUrl, setTriggerUrl] = useState('');
  const [payload, setPayload] = useState('{}');
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [payloadError, setPayloadError] = useState('');

  const { data, isLoading, error } = useQuery<{ workflows: N8nWorkflow[]; message?: string }>({
    queryKey: ['n8n-workflows'],
    queryFn: () => api.get('/api/n8n/workflows'),
    retry: false,
  });

  const notConfigured = data?.message?.includes('not configured');
  const workflows = data?.workflows ?? [];

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayloadError('');
    setTriggerResult(null);

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      setPayloadError('Invalid JSON payload');
      return;
    }

    setTriggering(true);
    try {
      await api.post('/api/n8n/trigger', { webhookUrl: triggerUrl, payload: parsedPayload });
      setTriggerResult({ ok: true, msg: 'Trigger sent successfully' });
    } catch (err) {
      setTriggerResult({ ok: false, msg: err instanceof Error ? err.message : 'Trigger failed' });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">n8n Integration</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect WhatsApp sessions with n8n automation workflows</p>
      </div>

      {/* Config notice */}
      {notConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-400">n8n not configured</p>
            <p className="text-xs text-muted-foreground">
              Set <code className="bg-muted px-1 rounded">N8N_BASE_URL</code> and <code className="bg-muted px-1 rounded">N8N_API_KEY</code> environment variables to connect to your n8n instance.
            </p>
          </div>
        </div>
      )}

      {error && !notConfigured && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">Could not reach n8n. Check that the service is running and N8N_BASE_URL is correct.</p>
        </div>
      )}

      {/* Workflow list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Workflow className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Workflows</h2>
          {!isLoading && !notConfigured && (
            <span className="ml-auto text-xs text-muted-foreground">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notConfigured || workflows.length === 0 ? (
          <div className="p-12 text-center">
            <Workflow className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">{notConfigured ? 'n8n not connected' : 'No workflows found'}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {notConfigured ? 'Configure N8N_BASE_URL and N8N_API_KEY to see workflows' : 'Create workflows in your n8n instance first'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {workflows.map((wf) => (
              <div key={wf.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/20 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? 'bg-primary' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wf.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {wf.id}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wf.active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {wf.active ? 'Active' : 'Inactive'}
                </span>
                {wf.updatedAt && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(wf.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Trigger */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Play className="w-4 h-4 text-muted-foreground" />
          Trigger Webhook
        </h2>
        <p className="text-xs text-muted-foreground">Send a POST request to any n8n webhook URL with a custom JSON payload.</p>

        <form onSubmit={handleTrigger} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              Webhook URL
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <input
              type="url"
              value={triggerUrl}
              onChange={(e) => setTriggerUrl(e.target.value)}
              placeholder="https://your-n8n.com/webhook/..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payload (JSON)</label>
            <textarea
              value={payload}
              onChange={(e) => { setPayload(e.target.value); setPayloadError(''); }}
              rows={5}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            {payloadError && <p className="text-xs text-destructive">{payloadError}</p>}
          </div>

          {triggerResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${triggerResult.ok ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {triggerResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {triggerResult.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={triggering || !triggerUrl}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {triggering ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
            {triggering ? 'Triggering...' : 'Send Trigger'}
          </button>
        </form>
      </div>
    </div>
  );
}
