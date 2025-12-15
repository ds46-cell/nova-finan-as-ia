import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = user.id;
    console.log(`Calculating KPIs for tenant: ${tenantId}`);

    // Fetch all transactions for this tenant
    const { data: transactions, error: txError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar transações' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate KPIs from real data
    const totalIncome = transactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const totalExpense = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const netBalance = totalIncome - totalExpense;
    const transactionCount = transactions?.length || 0;

    // Get accounts balance
    const { data: accounts, error: accError } = await supabase
      .from('financial_accounts')
      .select('balance')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const totalAccountsBalance = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0;

    // Calculate category breakdown for expenses
    const categoryBreakdown: Record<string, number> = {};
    transactions
      ?.filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.category || 'Outros';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Number(t.amount);
      });

    // Calculate monthly data for current year
    const currentYear = new Date().getFullYear();
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
    }));

    transactions?.forEach(t => {
      const date = new Date(t.transaction_date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        if (t.type === 'income') {
          monthlyData[monthIndex].income += Number(t.amount);
        } else {
          monthlyData[monthIndex].expense += Number(t.amount);
        }
      }
    });

    const kpis = {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: netBalance,
      transaction_count: transactionCount,
      accounts_balance: totalAccountsBalance,
      category_breakdown: categoryBreakdown,
      monthly_data: monthlyData,
      calculated_at: new Date().toISOString(),
    };

    // Cache KPIs in database
    const kpiEntries = [
      { tenant_id: tenantId, kpi_name: 'total_income', value: totalIncome },
      { tenant_id: tenantId, kpi_name: 'total_expense', value: totalExpense },
      { tenant_id: tenantId, kpi_name: 'net_balance', value: netBalance },
      { tenant_id: tenantId, kpi_name: 'transaction_count', value: transactionCount },
    ];

    for (const entry of kpiEntries) {
      await supabase
        .from('kpi_cache')
        .upsert(entry, { onConflict: 'tenant_id,kpi_name' });
    }

    console.log('KPIs calculated successfully:', kpis);

    return new Response(JSON.stringify(kpis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error calculating KPIs:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
