import { Activity, Shield, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecentActivity from '@/components/dashboard/RecentActivity';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  analyst: 'Analista',
  viewer: 'Visualizador',
};

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  analyst: 'bg-warning/10 text-warning border-warning/20',
  viewer: 'bg-primary/10 text-primary border-primary/20',
};

const statusConfig = {
  active: {
    label: 'Ativo',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  suspended: {
    label: 'Suspenso',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, role, loading, displayName, error } = useUserProfile();

  const status = profile?.status || 'active';
  const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = statusInfo.icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema enterprise</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm">
            <Activity className="w-4 h-4" />
            <span>Sistema operacional</span>
          </div>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="glass-card p-6 animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Usuário</p>
                <p className="text-xl font-bold text-foreground truncate">
                  {loading ? '...' : displayName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email || 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          {/* Role Card */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Papel no Sistema</p>
                <div className="mt-2">
                  {loading ? (
                    <div className="h-6 w-24 bg-secondary animate-pulse rounded" />
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleColors[role || 'viewer']}`}>
                      {roleLabels[role || 'viewer']}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${statusInfo.bgColor} flex items-center justify-center`}>
                <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Status da Conta</p>
                <p className={`text-xl font-bold ${statusInfo.color}`}>
                  {loading ? '...' : statusInfo.label}
                </p>
                {profile?.created_at && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Criada {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="glass-card p-4 border-destructive/50 bg-destructive/5">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity - Real data from database */}
          <RecentActivity />

          {/* System Info */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-6">Informações do Sistema</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Ambiente</span>
                <span className="text-foreground font-medium">Produção</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Versão</span>
                <span className="text-foreground font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Backend</span>
                <span className="text-success font-medium">Conectado</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Auditoria</span>
                <span className="text-success font-medium">Ativa</span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Este é o painel de controle enterprise. Todas as ações são registradas para compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
