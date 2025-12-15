import { useState } from 'react';
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Tag } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FinancialKPICards from '@/components/dashboard/FinancialKPICards';
import AIAnalysisChat from '@/components/dashboard/AIAnalysisChat';
import { useFinancialKPIs } from '@/hooks/useFinancialKPIs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categories = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Tecnologia',
  'Salário',
  'Investimentos',
  'Freelance',
  'Outros',
];

export default function Financeiro() {
  const { user } = useAuth();
  const { kpis, refetch } = useFinancialKPIs();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase.from('financial_transactions').insert({
        tenant_id: user.id,
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        transaction_date: form.transaction_date,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Transação registrada com sucesso');
      setOpen(false);
      setForm({
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
      });
      refetch();
    } catch (err) {
      console.error('Error creating transaction:', err);
      toast.error('Erro ao registrar transação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie suas finanças</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'income' }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      form.type === 'income'
                        ? 'bg-success/10 border-success text-success'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      form.type === 'expense'
                        ? 'bg-destructive/10 border-destructive text-destructive'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Despesa
                  </button>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm(f => ({ ...f, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.transaction_date}
                    onChange={(e) => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Descreva a transação..."
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Registrar Transação'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <FinancialKPICards />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Analysis */}
          <AIAnalysisChat />

          {/* Category Breakdown */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Despesas por Categoria
            </h3>
            
            {kpis?.category_breakdown && Object.keys(kpis.category_breakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(kpis.category_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, value]) => {
                    const total = Object.values(kpis.category_breakdown).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{category}</span>
                          <span className="text-muted-foreground font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma despesa registrada ainda
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
