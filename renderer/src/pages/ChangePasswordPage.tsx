import { useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setAuth, token } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/api/users/${user!.id}`, { password });
      setAuth({ ...user!, mustChangePassword: false }, token!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            You must set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoFocus
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Set New Password'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Signed in as <strong>{user?.username}</strong>
        </p>
      </div>
    </div>
  );
}
