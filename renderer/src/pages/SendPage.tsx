import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Send, CheckCircle, Upload, Link, X, FileAudio, FileVideo, FileImage, File } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
}

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
type SourceMode = 'url' | 'upload';

const ACCEPT: Record<MessageType, string> = {
  text: '',
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  file: '*/*',
};

const FILE_ICONS: Record<MessageType, React.FC<{ className?: string }>> = {
  text: File,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  file: File,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SendPage() {
  const [activeTab, setActiveTab] = useState<MessageType>('text');
  const [sourceMode, setSourceMode] = useState<SourceMode>('url');
  const [sessionId, setSessionId] = useState('');
  const [number, setNumber] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery<{ sessions: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/api/sessions'),
  });

  const activeSessions = data?.sessions.filter((s) => s.status === 'connected') ?? [];

  const handleTabChange = (tab: MessageType) => {
    setActiveTab(tab);
    setSourceMode('url');
    setMediaUrl('');
    setCaption('');
    setSelectedFile(null);
    setFilename('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    e.target.value = '';
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !number) return;
    setSending(true);
    setError('');
    setSuccess(false);

    try {
      const cleanNumber = number.replace(/\D/g, '');
      const endpoint = `/api/sessions/${sessionId}/send/${activeTab}`;

      if (activeTab === 'text') {
        await api.post(endpoint, { number: cleanNumber, text });
      } else {
        const form = new FormData();
        form.append('number', cleanNumber);

        if (sourceMode === 'upload' && selectedFile) {
          form.append('file', selectedFile, selectedFile.name);
          if (caption && (activeTab === 'image' || activeTab === 'video')) {
            form.append('caption', caption);
          }
          if (activeTab === 'file' && filename.trim()) {
            form.append('filename', filename.trim());
          }
        } else {
          if (activeTab === 'image') {
            form.append('imageUrl', mediaUrl);
            if (caption) form.append('caption', caption);
          } else if (activeTab === 'video') {
            form.append('videoUrl', mediaUrl);
            if (caption) form.append('caption', caption);
          } else if (activeTab === 'audio') {
            form.append('audioUrl', mediaUrl);
          } else if (activeTab === 'file') {
            form.append('fileUrl', mediaUrl);
            if (filename.trim()) form.append('filename', filename.trim());
          }
        }

        const token = localStorage.getItem('wa_token');
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!resp.ok) {
          const json = await resp.json().catch(() => ({ error: resp.statusText }));
          throw new Error((json as { error?: string }).error || resp.statusText);
        }
      }

      setSuccess(true);
      setText('');
      setMediaUrl('');
      setCaption('');
      setFilename('');
      setSelectedFile(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const tabs: MessageType[] = ['text', 'image', 'video', 'audio', 'file'];
  const hasMedia = activeTab !== 'text';
  const FileIcon = FILE_ICONS[activeTab];

  const isValid = (() => {
    if (!sessionId || !number) return false;
    if (activeTab === 'text') return text.trim().length > 0;
    if (sourceMode === 'upload') return selectedFile !== null;
    return mediaUrl.trim().length > 0;
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Send Message</h1>
        <p className="text-muted-foreground text-sm mt-1">Send messages through a connected WhatsApp session</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Type tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
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

          {/* Text message */}
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

          {/* Media: source toggle + input */}
          {hasMedia && (
            <div className="space-y-3">
              {/* URL / Upload toggle */}
              <div className="flex gap-1 bg-muted rounded-md p-1 w-fit">
                <button
                  type="button"
                  onClick={() => { setSourceMode('url'); setSelectedFile(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                    sourceMode === 'url' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Link className="w-3 h-3" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => { setSourceMode('upload'); setMediaUrl(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                    sourceMode === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="w-3 h-3" /> From Device
                </button>
              </div>

              {/* URL input */}
              {sourceMode === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium capitalize">{activeTab} URL</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={`https://example.com/file.${activeTab === 'image' ? 'jpg' : activeTab === 'video' ? 'mp4' : activeTab === 'audio' ? 'ogg' : 'pdf'}`}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              {/* File upload */}
              {sourceMode === 'upload' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium capitalize">{activeTab} File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT[activeTab]}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <FileIcon className="w-8 h-8" />
                      <span className="text-sm">Click to choose a {activeTab} file</span>
                      <span className="text-xs">Max 64 MB</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3">
                      <FileIcon className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Caption for image / video */}
              {(activeTab === 'image' || activeTab === 'video') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Caption <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Optional caption..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              {/* Filename for file type */}
              {activeTab === 'file' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">File Name <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="document.pdf"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">Override the displayed filename in WhatsApp</p>
                </div>
              )}
            </div>
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
            disabled={sending || !isValid}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
