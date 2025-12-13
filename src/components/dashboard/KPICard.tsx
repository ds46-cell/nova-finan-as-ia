import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  delay?: number;
}

export default function KPICard({
  title,
  value,
  change,
  changeLabel = 'vs mês anterior',
  icon: Icon,
  variant = 'default',
  delay = 0,
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const iconBgColors = {
    default: 'bg-primary/10',
    primary: 'bg-primary/20',
    success: 'bg-success/20',
    warning: 'bg-warning/20',
  };

  const iconColors = {
    default: 'text-primary',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <div
      className="kpi-card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", iconBgColors[variant])}>
          <Icon className={cn("w-5 h-5", iconColors[variant])} />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground font-mono tracking-tight">
          {value}
        </p>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground">{changeLabel}</p>
        )}
      </div>
    </div>
  );
}
