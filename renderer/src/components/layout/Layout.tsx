import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Smartphone, Send, Users, Key, ScrollText,
  LogOut, Sun, Moon, Globe, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/sessions', icon: Smartphone, labelKey: 'nav.sessions' },
  { path: '/send', icon: Send, labelKey: 'nav.send' },
  { path: '/users', icon: Users, labelKey: 'nav.users' },
  { path: '/api-keys', icon: Key, labelKey: 'nav.apikeys' },
  { path: '/audit-logs', icon: ScrollText, labelKey: 'nav.auditlogs' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { clearAuth, user } = useAuthStore();
  const { theme, lang, toggleTheme, setLang } = useUIStore();

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    clearAuth();
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-64 bg-card border-r border-border">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">W</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">WhatsApp Manager</p>
          <p className="text-xs text-muted-foreground truncate">{user?.username}</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          if (labelKey === 'nav.users' && user?.role !== 'admin') return null;
          if (labelKey === 'nav.auditlogs' && user?.role !== 'admin') return null;
          const active = path === '/' ? location === '/' : location.startsWith(path);
          return (
            <Link key={path} href={path} onClick={() => setSidebarOpen(false)}>
              <a className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t(lang, labelKey)}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-0.5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <Globe className="w-4 h-4" />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          {t(lang, 'nav.logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">WhatsApp Manager</span>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
