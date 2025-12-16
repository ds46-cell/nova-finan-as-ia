import { useState } from 'react';
import { Bell, Send, Users, CheckCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  type: string;
  created_at: string;
}

export default function AdminNotificacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserProfile();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_role: 'all',
    type: 'info',
  });

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      toast.error('Acesso negado');
      navigate('/dashboard');
    }
  }, [role, roleLoading, navigate]);

  const { data: notifications, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: role === 'admin',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSending(true);

      const { error } = await supabase.from('notifications').insert({
        title: form.title,
        message: form.message,
        target_role: form.target_role,
        type: form.type,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Notificação enviada com sucesso');
      setForm({ title: '', message: '', target_role: 'all', type: 'info' });
      refetch();
    } catch (err) {
      console.error('Error sending notification:', err);
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin') return null;

  const typeColors: Record<string, string> = {
    info: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-destructive/10 text-destructive',
  };

  const roleLabels: Record<string, string> = {
    all: 'Todos',
    admin: 'Administradores',
    analyst: 'Analistas',
    viewer: 'Visualizadores',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground">Envie comunicados para os usuários</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Notification */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Nova Notificação
              </CardTitle>
              <CardDescription>
                Envie uma mensagem para usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título da notificação"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Conteúdo da notificação..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Destinatários</Label>
                    <Select
                      value={form.target_role}
                      onValueChange={(v) => setForm(f => ({ ...f, target_role: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="admin">Administradores</SelectItem>
                        <SelectItem value="analyst">Analistas</SelectItem>
                        <SelectItem value="viewer">Visualizadores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm(f => ({ ...f, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Notificação
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificações Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-lg bg-secondary/30 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground">{notif.title}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[notif.type]}`}>
                          {notif.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {roleLabels[notif.target_role || 'all']}
                        </div>
                        <span>
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma notificação enviada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
