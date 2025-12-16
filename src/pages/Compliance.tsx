import { useState } from 'react';
import { Shield, FileDown, UserX, Check, AlertTriangle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Consent {
  id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

const consentTypes = [
  { id: 'terms_of_service', label: 'Termos de Serviço', description: 'Aceito os termos de uso do sistema' },
  { id: 'privacy_policy', label: 'Política de Privacidade', description: 'Aceito a política de privacidade' },
  { id: 'data_processing', label: 'Processamento de Dados', description: 'Autorizo o processamento dos meus dados financeiros' },
  { id: 'marketing', label: 'Comunicações de Marketing', description: 'Aceito receber comunicações promocionais' },
  { id: 'cookies', label: 'Cookies', description: 'Aceito o uso de cookies para melhorar a experiência' },
];

export default function Compliance() {
  const { session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [showAnonymizeDialog, setShowAnonymizeDialog] = useState(false);

  const { data: consents, isLoading } = useQuery({
    queryKey: ['lgpd-consents'],
    queryFn: async () => {
      if (!session?.access_token) return [];
      
      const { data, error } = await supabase.functions.invoke('manage-lgpd', {
        body: { action: 'get_consents' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
      return data.consents as Consent[];
    },
    enabled: !!session,
  });

  const updateConsentMutation = useMutation({
    mutationFn: async ({ consent_type, granted }: { consent_type: string; granted: boolean }) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { error } = await supabase.functions.invoke('manage-lgpd', {
        body: { action: 'update_consent', consent_type, granted },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-consents'] });
      toast.success('Consentimento atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar consentimento');
    },
  });

  const handleExportData = async () => {
    if (!session?.access_token) return;
    
    try {
      setExporting(true);
      
      const { data, error } = await supabase.functions.invoke('manage-lgpd', {
        body: { action: 'export_data' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus_dados_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Dados exportados com sucesso');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const handleAnonymizeData = async () => {
    if (!session?.access_token) return;
    
    try {
      setAnonymizing(true);
      
      const { error } = await supabase.functions.invoke('manage-lgpd', {
        body: { action: 'anonymize_data' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
      
      toast.success('Dados anonimizados. Você será deslogado.');
      setShowAnonymizeDialog(false);
      
      // Sign out after anonymization
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (err) {
      console.error('Anonymize error:', err);
      toast.error('Erro ao anonimizar dados');
    } finally {
      setAnonymizing(false);
    }
  };

  const getConsentValue = (consentType: string): boolean => {
    const consent = consents?.find(c => c.consent_type === consentType);
    return consent?.granted ?? false;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance & LGPD</h1>
          <p className="text-muted-foreground">Gerencie seus dados e consentimentos</p>
        </div>

        {/* Info Banner */}
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-4 p-4">
            <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Proteção de Dados (LGPD)</p>
              <p className="text-sm text-muted-foreground">
                Conforme a Lei Geral de Proteção de Dados, você tem direito de acessar, 
                exportar e solicitar a exclusão dos seus dados pessoais a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Consent Management */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Consentimentos</CardTitle>
            <CardDescription>
              Gerencie suas preferências de consentimento para processamento de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              consentTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                >
                  <div className="flex-1">
                    <Label htmlFor={type.id} className="text-foreground font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <Switch
                    id={type.id}
                    checked={getConsentValue(type.id)}
                    onCheckedChange={(checked) => 
                      updateConsentMutation.mutate({ consent_type: type.id, granted: checked })
                    }
                    disabled={updateConsentMutation.isPending}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Gerenciamento de Dados</CardTitle>
            <CardDescription>
              Acesse, exporte ou solicite a exclusão dos seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Data */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileDown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Exportar Meus Dados</p>
                  <p className="text-sm text-muted-foreground">
                    Baixe uma cópia de todos os seus dados em formato JSON
                  </p>
                </div>
              </div>
              <Button onClick={handleExportData} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
            </div>

            {/* Anonymize Data */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Anonimizar Meus Dados</p>
                  <p className="text-sm text-muted-foreground">
                    Remova permanentemente suas informações pessoais (irreversível)
                  </p>
                </div>
              </div>
              <Dialog open={showAnonymizeDialog} onOpenChange={setShowAnonymizeDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <UserX className="w-4 h-4 mr-2" />
                    Anonimizar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Confirmar Anonimização
                    </DialogTitle>
                    <DialogDescription className="space-y-2">
                      <p>
                        Esta ação é <strong>irreversível</strong>. Seus dados pessoais serão 
                        permanentemente removidos, incluindo:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Nome e informações de perfil</li>
                        <li>Endereço de email</li>
                        <li>Foto de perfil</li>
                      </ul>
                      <p>
                        Suas transações financeiras serão mantidas de forma anônima para 
                        fins de auditoria.
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAnonymizeDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleAnonymizeData}
                      disabled={anonymizing}
                    >
                      {anonymizing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirmar Anonimização
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Segurança & Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="font-medium text-foreground">RLS Ativo</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Isolamento de dados por usuário ativo
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="font-medium text-foreground">RBAC Implementado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Controle de acesso baseado em papéis
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="font-medium text-foreground">Auditoria Completa</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Todas as ações são registradas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
