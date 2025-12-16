import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  last_sync_at: string | null;
}

interface IntegrationLog {
  id: string;
  status: string;
  message: string;
  records_processed: number;
  records_failed: number;
  created_at: string;
}

export default function Integracoes() {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importName, setImportName] = useState('');

  const { data: integrations, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!session,
  });

  const { data: logs } = useQuery({
    queryKey: ['integration-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as IntegrationLog[];
    },
    enabled: !!session,
  });

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;

    try {
      setImporting(true);

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('Arquivo CSV vazio ou inválido');
        return;
      }

      // Validate required columns
      const requiredColumns = ['type', 'category', 'amount', 'transaction_date'];
      const firstRow = rows[0];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        toast.error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-financial-data', {
        body: { 
          rows, 
          integration_name: importName || file.name 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Importados ${data.records_processed} registros. ${data.records_failed} com erro.`);
      } else {
        toast.success(`${data.records_processed} transações importadas com sucesso!`);
      }

      refetch();
      setImportName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro ao importar arquivo');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'type,category,amount,description,transaction_date\nincome,Salário,5000,Salário mensal,2024-01-15\nexpense,Alimentação,500,Supermercado,2024-01-16';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_financeos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground">Importe dados financeiros via CSV</p>
        </div>

        {/* Import Card */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Importar CSV
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV com suas transações financeiras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Importação (opcional)</Label>
              <Input
                placeholder="Ex: Extrato Janeiro 2024"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>

            <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="csv-upload"
                disabled={importing}
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {importing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-foreground font-medium">Importando...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                    <p className="text-foreground font-medium">Clique para selecionar um arquivo CSV</p>
                    <p className="text-sm text-muted-foreground">
                      Colunas: type, category, amount, description, transaction_date
                    </p>
                  </div>
                )}
              </label>
            </div>

            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Baixar Template CSV
            </Button>
          </CardContent>
        </Card>

        {/* Recent Integrations */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Importações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {integrations && integrations.length > 0 ? (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        integration.status === 'active' ? 'bg-success/10' : 'bg-destructive/10'
                      }`}>
                        {integration.status === 'active' ? (
                          <Check className="w-5 h-5 text-success" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(integration.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      integration.status === 'active' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {integration.status === 'active' ? 'Concluído' : 'Erro'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma importação realizada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Logs */}
        {logs && logs.length > 0 && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Histórico de Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-success' : 'bg-destructive'
                      }`} />
                      <div>
                        <p className="text-sm text-foreground">{log.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.records_processed} processados, {log.records_failed} falhas
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
