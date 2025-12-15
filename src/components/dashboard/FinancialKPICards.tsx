import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown, Wallet } from 'lucide-react';
import { useFinancialKPIs } from '@/hooks/useFinancialKPIs';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function FinancialKPICards() {
  const { kpis, loading, error } = useFinancialKPIs();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <div className="h-4 w-24 bg-secondary rounded mb-4" />
            <div className="h-8 w-32 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4 border-destructive/50 bg-destructive/5">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const hasData = kpis && kpis.transaction_count > 0;

  const cards = [
    {
      title: 'Receitas',
      value: kpis?.total_income || 0,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Despesas',
      value: kpis?.total_expense || 0,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Saldo Líquido',
      value: kpis?.net_balance || 0,
      icon: DollarSign,
      color: (kpis?.net_balance || 0) >= 0 ? 'text-success' : 'text-destructive',
      bgColor: (kpis?.net_balance || 0) >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      title: 'Transações',
      value: kpis?.transaction_count || 0,
      icon: ArrowUpDown,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="kpi-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold mt-2 font-mono ${card.color}`}>
                    {hasData ? (
                      card.isCurrency !== false ? formatCurrency(card.value) : card.value
                    ) : (
                      <span className="text-muted-foreground text-lg">—</span>
                    )}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <div className="glass-card p-4 text-center">
          <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Nenhuma transação registrada. Adicione transações para ver os KPIs.
          </p>
        </div>
      )}
    </div>
  );
}
