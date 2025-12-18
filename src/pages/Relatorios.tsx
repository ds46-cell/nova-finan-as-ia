import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEvent, AuditActions, AuditEntities } from '@/lib/audit';

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  created_at: string;
}

export default function Relatorios() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    category: '',
  });

  const fetchTransactions = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('tenant_id', session.user.id)
        .order('transaction_date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.category) {
        query = query.ilike('category', `%${filters.category}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao buscar transações',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [session?.user?.id]);

  const handleFilter = () => {
    fetchTransactions();
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sem dados',
        description: 'Não há dados para exportar',
      });
      return;
    }

    setExporting(true);
    try {
      // Create CSV content
      const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
      const rows = transactions.map(t => [
        t.transaction_date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.category,
        t.description || '',
        t.amount.toFixed(2),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log export
      await logAuditEvent({
        action: AuditActions.EXPORT,
        entity: AuditEntities.REPORT,
        metadata: {
          records_count: transactions.length,
          filters: filters,
        },
      });

      toast({
        title: 'Exportado!',
        description: `${transactions.length} registros exportados com sucesso`,
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao exportar relatório',
      });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Exporte e analise seus dados financeiros</p>
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={exporting || transactions.length === 0}
            className="bg-gradient-primary shadow-glow"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                placeholder="Buscar categoria..."
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleFilter} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Aplicar Filtros
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total de Receitas</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totals.income)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total de Despesas</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.expense)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Saldo do Período</p>
            <p className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totals.income - totals.expense)}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transações ({transactions.length})
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="text-sm text-muted-foreground">Ajuste os filtros ou adicione transações</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Data</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Categoria</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Descrição</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4">{new Date(t.transaction_date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.type === 'income' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {t.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{t.category}</td>
                      <td className="py-3 px-4 text-muted-foreground">{t.description || '-'}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        t.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
