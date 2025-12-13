import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const stats = [
  {
    label: 'Transações Hoje',
    value: '1,284',
    change: 12.5,
  },
  {
    label: 'Volume Total',
    value: 'R$ 482.5K',
    change: 8.2,
  },
  {
    label: 'Taxa de Sucesso',
    value: '99.2%',
    change: 0.3,
  },
  {
    label: 'Tempo Médio',
    value: '1.2s',
    change: -5.1,
  },
];

export default function QuickStats() {
  return (
    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <h3 className="text-lg font-semibold text-foreground mb-6">Métricas Rápidas</h3>

      <div className="space-y-4">
        {stats.map((stat, index) => {
          const isPositive = stat.change > 0;
          const isNegative = stat.change < 0;

          return (
            <div
              key={stat.label}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isPositive && "text-success",
                  isNegative && "text-destructive",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : isNegative ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
