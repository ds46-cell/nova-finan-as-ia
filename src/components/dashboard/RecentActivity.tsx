import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Clock, User, LogIn, LogOut, FileEdit, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  details: unknown;
  created_at: string;
}

const actionIcons: Record<string, typeof User> = {
  USER_LOGIN: LogIn,
  USER_LOGOUT: LogOut,
  USER_REGISTERED: User,
  DEFAULT: FileEdit,
};

const actionLabels: Record<string, string> = {
  USER_LOGIN: 'Login realizado',
  USER_LOGOUT: 'Logout realizado',
  USER_REGISTERED: 'Conta criada',
};

export default function RecentActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function fetchLogs() {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }

    fetchLogs();
  }, [user]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 bg-secondary rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-secondary rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-2/3" />
                <div className="h-3 bg-secondary rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Atividade Recente</h3>
        <Shield className="w-5 h-5 text-muted-foreground" />
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => {
            const Icon = actionIcons[log.action] || actionIcons.DEFAULT;
            const label = actionLabels[log.action] || log.action;

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 animate-fade-in"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
