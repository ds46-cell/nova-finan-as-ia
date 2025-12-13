import { DollarSign, Users, CreditCard, Activity, TrendingUp, Wallet } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickStats from '@/components/dashboard/QuickStats';

const kpis = [
  {
    title: 'Receita Total',
    value: 'R$ 2.4M',
    change: 12.5,
    icon: DollarSign,
    variant: 'primary' as const,
  },
  {
    title: 'Usuários Ativos',
    value: '8,249',
    change: 8.2,
    icon: Users,
    variant: 'success' as const,
  },
  {
    title: 'Transações',
    value: '12,847',
    change: -2.4,
    icon: CreditCard,
    variant: 'default' as const,
  },
  {
    title: 'Taxa de Conversão',
    value: '24.8%',
    change: 4.1,
    icon: TrendingUp,
    variant: 'warning' as const,
  },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema financeiro</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm">
            <Activity className="w-4 h-4" />
            <span>Sistema operacional</span>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <KPICard
              key={kpi.title}
              {...kpi}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart placeholder */}
          <div className="lg:col-span-2 glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Performance Mensal</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Receita
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  Despesas
                </span>
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Gráfico de performance</p>
                <p className="text-xs opacity-60">Dados em tempo real</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <QuickStats />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Financial Summary */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Resumo Financeiro</h3>
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-success/5 border border-success/20">
                <div>
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-xl font-bold font-mono text-success">R$ 3.2M</p>
                </div>
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-xl font-bold font-mono text-destructive">R$ 1.8M</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingUp className="w-5 h-5 text-destructive rotate-180" />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-xl font-bold font-mono text-primary">R$ 1.4M</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
