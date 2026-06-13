import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Trash2, Copy, Check, Eye, EyeOff, Key } from 'lucide-react';

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string | null;
}

interface NewKeyResponse {
  key: string;
  prefix: string;
  name: string;
  message: string;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{ keys: ApiKey[] }>({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api/api-keys'),
  });

  const keys = data?.keys ?? [];

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const result = await api.post<NewKeyResponse>('/api/api-keys', { name: keyName.trim() });
      setNewKey(result);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setKeyName('');
      setShowNew(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: number, name: string) => {
    if (!confirm(`Revoke key "${name}"?`)) return;
    try {
      await api.delete(`/api/api-keys/${id}`);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Use API keys to authenticate programmatic access</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      </div>

      {/* Revealed new key */}
      {newKey && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-primary">New API Key — Save it now, it will not be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono break-all">
              {newKey.key}
            </code>
            <button
              onClick={() => copyKey(newKey.key)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            I've saved it, dismiss
          </button>
        </div>
      )}

      {showNew && (
        <form onSubmit={createKey} className="bg-card border border-border rounded-xl p-5 flex gap-3">
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. Automation Bot)"
            autoFocus
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Generating...' : 'Generate'}
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
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No API keys</p>
          <p className="text-muted-foreground text-sm mt-1">Generate a key to integrate with external tools</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Name</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Prefix</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Last used</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Created</th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{key.prefix}...</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteKey(key.id, key.name)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Using API keys</p>
        <p>Add the <code className="bg-muted px-1 rounded">X-API-Key</code> header to your requests:</p>
        <code className="block bg-background border border-border p-2 rounded font-mono">
          curl -H "X-API-Key: wm_..." http://127.0.0.1:43210/api/sessions
        </code>
      </div>
    </div>
  );
}
