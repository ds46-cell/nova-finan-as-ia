import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface FinancialKPIs {
  total_income: number;
  total_expense: number;
  net_balance: number;
  transaction_count: number;
  accounts_balance: number;
  category_breakdown: Record<string, number>;
  monthly_data: { month: number; income: number; expense: number }[];
  calculated_at: string;
}

export function useFinancialKPIs() {
  const { session } = useAuth();
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('calculate-financial-kpis', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setKpis(data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar KPIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [session?.access_token]);

  return { kpis, loading, error, refetch: fetchKPIs };
}
