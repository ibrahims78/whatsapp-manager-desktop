import { useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './store/ui';
import { useAuthStore } from './store/auth';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import SendPage from './pages/SendPage';
import UsersPage from './pages/UsersPage';
import ApiKeysPage from './pages/ApiKeysPage';
import AuditLogsPage from './pages/AuditLogsPage';
import N8nPage from './pages/N8nPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppRoutes() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/sessions" component={SessionsPage} />
        <Route path="/sessions/:id" component={SessionDetailPage} />
        <Route path="/send" component={SendPage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/api-keys" component={ApiKeysPage} />
        <Route path="/n8n" component={N8nPage} />
        <Route path="/audit-logs" component={AuditLogsPage} />
        <Route>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Page not found
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

export default function App() {
  const { theme, lang } = useUIStore();

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [theme, lang]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}
