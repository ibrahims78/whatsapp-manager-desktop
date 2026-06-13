import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Send, CheckCircle } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
}

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export default function SendPage() {
  const [activeTab, setActiveTab] = useState<MessageType>('text');
  const [sessionId, setSessionId] = useState('');
  const [number, setNumber] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { data } = useQuery<{ sessions: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/api/sessions'),
  });

  const activeSessions = data?.sessions.filter((s) => s.status === 'connected') ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !number) return;
    setSending(true);
    setError('');
    setSuccess(false);

    try {
      const cleanNumber = number.replace(/\D/g, '');
      const body: Record<string, string> = { number: cleanNumber };

      if (activeTab === 'text') {
        body.text = text;
      } else if (activeTab === 'image') {
        body.imageUrl = mediaUrl;
        body.caption = caption;
      } else if (activeTab === 'video') {
        body.videoUrl = mediaUrl;
        body.caption = caption;
      } else if (activeTab === 'audio') {
        body.audioUrl = mediaUrl;
      } else if (activeTab === 'file') {
        body.fileUrl = mediaUrl;
      }

      await api.post(`/api/sessions/${sessionId}/send/${activeTab}`, body);
      setSuccess(true);
      setText('');
      setMediaUrl('');
      setCaption('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const tabs: MessageType[] = ['text', 'image', 'video', 'audio', 'file'];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Send Message</h1>
        <p className="text-muted-foreground text-sm mt-1">Send messages through a connected WhatsApp session</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Session selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a connected session...</option>
              {activeSessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {activeSessions.length === 0 && (
              <p className="text-xs text-muted-foreground">No connected sessions. Connect a session first.</p>
            )}
          </div>

          {/* Phone number */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="966501234567 (with country code)"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Message content */}
          {activeTab === 'text' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          )}

          {activeTab !== 'text' && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium capitalize">{activeTab} URL</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={`https://example.com/${activeTab}.${activeTab === 'image' ? 'jpg' : activeTab === 'video' ? 'mp4' : activeTab === 'audio' ? 'ogg' : 'pdf'}`}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {(activeTab === 'image' || activeTab === 'video') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Caption (optional)</label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Optional caption..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Message sent successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !sessionId || !number || (activeTab === 'text' && !text) || (activeTab !== 'text' && !mediaUrl)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
