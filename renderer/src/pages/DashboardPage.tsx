import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Smartphone, MessageSquare, Users, Wifi } from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  totalUsers: number;
  chart: { date: string; sent: number; received: number }[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Smartphone; label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="w-9 h-9 bg-muted rounded-lg mb-3" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time overview of your WhatsApp sessions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wifi}
          label="Active Sessions"
          value={data?.activeSessions ?? 0}
          color="bg-primary/15 text-primary"
        />
        <StatCard
          icon={Smartphone}
          label="Total Sessions"
          value={data?.totalSessions ?? 0}
          color="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Messages"
          value={data?.totalMessages ?? 0}
          color="bg-purple-500/15 text-purple-400"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={data?.totalUsers ?? 0}
          color="bg-orange-500/15 text-orange-400"
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-5">Messages — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data?.chart || []} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short' })}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="received" name="Received" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
