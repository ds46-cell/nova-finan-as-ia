import { useState, useEffect } from 'react';
import { Activity, Server, Database, Shield, Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface HealthCheck {
  id: string;
  check_type: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  message: string;
  metadata: Record<string, unknown>;
  checked_at: string;
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Saudável',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Degradado',
  },
  critical: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Crítico',
  },
  unknown: {
    icon: Activity,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary',
    label: 'Desconhecido',
  },
};

const checkTypeConfig: Record<string, { icon: typeof Server; label: string }> = {
  database: { icon: Database, label: 'Banco de Dados' },
  auth: { icon: Shield, label: 'Autenticação' },
  storage: { icon: Server, label: 'Armazenamento' },
  functions: { icon: Zap, label: 'Edge Functions' },
  integration: { icon: Activity, label: 'Integrações' },
};

export default function Monitoramento() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Group by check_type, keeping only the latest for each
      const latestChecks = new Map<string, HealthCheck>();
      (data || []).forEach((check) => {
        if (!latestChecks.has(check.check_type)) {
          latestChecks.set(check.check_type, check as HealthCheck);
        }
      });
      
      setHealthChecks(Array.from(latestChecks.values()));
      
      if (data && data.length > 0) {
        setLastCheck(data[0].checked_at);
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-health-check', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Verificação concluída',
        description: `Status geral: ${data?.status || 'unknown'}`,
      });

      // Refresh the displayed data
      await fetchHealthStatus();
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao executar verificação de saúde',
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const overallStatus = healthChecks.some(c => c.status === 'critical')
    ? 'critical'
    : healthChecks.some(c => c.status === 'degraded')
      ? 'degraded'
      : healthChecks.length > 0
        ? 'healthy'
        : 'unknown';

  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monitoramento 24h</h1>
            <p className="text-muted-foreground">Status do sistema em tempo real</p>
          </div>
          <Button
            onClick={runHealthCheck}
            disabled={refreshing}
            className="bg-gradient-primary shadow-glow"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verificar Agora
          </Button>
        </div>

        {/* Overall Status */}
        <div className={`glass-card p-6 ${overallConfig.bgColor} border-2 ${
          overallStatus === 'healthy' ? 'border-success/30' :
          overallStatus === 'degraded' ? 'border-warning/30' :
          overallStatus === 'critical' ? 'border-destructive/30' : 'border-border'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${overallConfig.bgColor} flex items-center justify-center`}>
              <OverallIcon className={`w-8 h-8 ${overallConfig.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Geral do Sistema</p>
              <p className={`text-2xl font-bold ${overallConfig.color}`}>
                {overallConfig.label}
              </p>
              {lastCheck && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última verificação: {new Date(lastCheck).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-secondary rounded w-1/2 mb-4" />
                <div className="h-4 bg-secondary rounded w-3/4" />
              </div>
            ))
          ) : healthChecks.length === 0 ? (
            <div className="col-span-full glass-card p-8 text-center">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma verificação disponível</p>
              <p className="text-sm text-muted-foreground">Clique em "Verificar Agora" para iniciar</p>
            </div>
          ) : (
            healthChecks.map((check) => {
              const config = statusConfig[check.status];
              const typeConfig = checkTypeConfig[check.check_type] || { icon: Activity, label: check.check_type };
              const StatusIcon = config.icon;
              const TypeIcon = typeConfig.icon;

              return (
                <div key={check.id} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                        <TypeIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{typeConfig.label}</p>
                        <p className={`text-sm ${config.color}`}>{config.label}</p>
                      </div>
                    </div>
                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                  {check.metadata && Object.keys(check.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="space-y-1">
                        {Object.entries(check.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                            <span className="text-foreground font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Auto-Healing Info */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Auto-Healing Ativo
          </h3>
          <p className="text-muted-foreground mb-4">
            O sistema monitora automaticamente os serviços e tenta corrigir problemas detectados.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Verificações automáticas</p>
              <p className="text-2xl font-bold text-foreground">A cada 5 min</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Tentativas de correção</p>
              <p className="text-2xl font-bold text-foreground">3 max</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Alertas</p>
              <p className="text-2xl font-bold text-success">Ativo</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
