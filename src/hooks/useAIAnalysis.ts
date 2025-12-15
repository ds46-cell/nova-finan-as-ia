import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AIResponse {
  answer: string;
  has_data: boolean;
  data_summary?: {
    total_income: number;
    total_expense: number;
    net_balance: number;
    transaction_count: number;
  };
}

export function useAIAnalysis() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFinancials = async (question: string): Promise<AIResponse | null> => {
    if (!session?.access_token) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('ai-financial-analysis', {
        body: { question },
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

      return data as AIResponse;
    } catch (err) {
      console.error('Error in AI analysis:', err);
      const message = err instanceof Error ? err.message : 'Erro na análise';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeFinancials, loading, error };
}
