import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Filter, Download, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  transaction_date: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))', '#8884d8', '#82ca9d', '#ffc658'];

export default function Analises() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('3');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const startDate = startOfMonth(subMonths(new Date(), parseInt(period) - 1));
  const endDate = endOfMonth(new Date());

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions-analysis', user?.id, period, filterType],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('tenant_id', user?.id)
        .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(endDate, 'yyyy-MM-dd'))
        .order('transaction_date', { ascending: true });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  // Process data for charts
  const monthlyData = transactions?.reduce((acc, t) => {
    const month = format(new Date(t.transaction_date), 'MMM yyyy', { locale: ptBR });
    if (!acc[month]) {
      acc[month] = { month, income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      acc[month].income += t.amount;
    } else {
      acc[month].expense += t.amount;
    }
    return acc;
  }, {} as Record<string, { month: string; income: number; expense: number }>) || {};

  const monthlyChartData = Object.values(monthlyData);

  const categoryData = transactions?.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { name: t.category, value: 0, type: t.type };
    }
    acc[t.category].value += t.amount;
    return acc;
  }, {} as Record<string, { name: string; value: number; type: string }>) || {};

  const expenseCategoryData = Object.values(categoryData).filter(c => c.type === 'expense');
  const incomeCategoryData = Object.values(categoryData).filter(c => c.type === 'income');

  // Calculate totals and trends
  const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
  const balance = totalIncome - totalExpense;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleExport = () => {
    if (!transactions) return;
    
    const csv = [
      ['Data', 'Tipo', 'Categoria', 'Valor'],
      ...transactions.map(t => [
        t.transaction_date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.category,
        t.amount.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Análises</h1>
            <p className="text-muted-foreground">Visualize seus dados financeiros</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mês</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'income' | 'expense')}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={!transactions?.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !transactions?.length ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">Sem dados para análise</p>
              <p className="text-muted-foreground">Adicione transações para visualizar os relatórios</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card border-success/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Receitas</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card border-destructive/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Despesas</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`glass-card ${balance >= 0 ? 'border-success/20' : 'border-destructive/20'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo do Período</p>
                      <p className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      balance >= 0 ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      <BarChart3 className={`w-6 h-6 ${balance >= 0 ? 'text-success' : 'text-destructive'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Comparison Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Comparativo Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Categories */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseCategoryData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {expenseCategoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Sem dados de despesas
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Income Categories */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeCategoryData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {incomeCategoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Sem dados de receitas
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trend Line Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Evolução do Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData.map(m => ({ ...m, balance: m.income - m.expense }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        name="Saldo" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
