import { useState, useEffect } from 'react';
import { Settings, User, Lock, Shield, Bell, Database, Loader2, Save } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEvent, AuditActions, AuditEntities } from '@/lib/audit';

export default function Configuracoes() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
  });

  const [securityCode, setSecurityCode] = useState('');
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_alerts: true,
    audit_detailed: true,
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchSettings();
      fetchSecurityCode();
    }
  }, [session?.user?.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || data.name || '',
          email: data.email,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSecurityCode = async () => {
    try {
      const { data, error } = await supabase
        .from('security_codes')
        .select('code')
        .eq('user_id', session?.user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setSecurityCode(data.code);
      }
    } catch (error) {
      console.error('Error fetching security code:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('user_id', session?.user?.id);

      if (data) {
        const settingsMap: Record<string, boolean> = {};
        data.forEach((s) => {
          settingsMap[s.setting_key] = (s.setting_value as { enabled?: boolean })?.enabled ?? true;
        });
        setSettings(prev => ({ ...prev, ...settingsMap }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          name: profile.full_name,
        })
        .eq('id', session?.user?.id);

      if (error) throw error;

      await logAuditEvent({
        action: AuditActions.UPDATE,
        entity: AuditEntities.PROFILE,
        entity_id: session?.user?.id,
      });

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar perfil',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (key: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          user_id: session?.user?.id,
          setting_key: key,
          setting_value: { enabled: value },
        }, {
          onConflict: 'user_id,setting_key',
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));

      await logAuditEvent({
        action: AuditActions.UPDATE,
        entity: 'settings',
        metadata: { setting: key, value },
      });

      toast({
        title: 'Configuração salva',
        description: `${key} foi ${value ? 'ativado' : 'desativado'}`,
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar configuração',
      });
    }
  };

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast({
        title: 'Email enviado',
        description: 'Verifique seu email para redefinir a senha',
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao enviar email de redefinição',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e conta</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Database className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Informações do Perfil</h3>
              
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                  <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Código de Segurança</h3>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">Seu código de acesso:</p>
                  <p className="text-3xl font-mono font-bold text-primary tracking-wider">
                    {securityCode || '------'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Guarde este código em local seguro. Ele é necessário para acessar o sistema.
                  </p>
                </div>
              </div>

              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Alterar Senha</h3>
                <p className="text-muted-foreground">
                  Um email será enviado para você redefinir sua senha.
                </p>
                <Button onClick={handleChangePassword} variant="outline">
                  <Lock className="w-4 h-4 mr-2" />
                  Solicitar Redefinição
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Preferências de Notificação</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Notificações do Sistema</p>
                    <p className="text-sm text-muted-foreground">Receber notificações no sistema</p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(checked) => handleSaveSetting('notifications_enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Alertas por Email</p>
                    <p className="text-sm text-muted-foreground">Receber alertas importantes por email</p>
                  </div>
                  <Switch
                    checked={settings.email_alerts}
                    onCheckedChange={(checked) => handleSaveSetting('email_alerts', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Informações do Sistema</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Ambiente</span>
                  <span className="text-foreground font-medium">Produção</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Versão</span>
                  <span className="text-foreground font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Backend</span>
                  <span className="text-success font-medium">Conectado</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Auditoria</span>
                  <span className="text-success font-medium">Ativa</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Auditoria Detalhada</p>
                    <p className="text-sm text-muted-foreground">Registrar metadados completos</p>
                  </div>
                  <Switch
                    checked={settings.audit_detailed}
                    onCheckedChange={(checked) => handleSaveSetting('audit_detailed', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
