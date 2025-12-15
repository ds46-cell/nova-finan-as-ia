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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'API de IA não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { question } = await req.json();
    
    if (!question) {
      return new Response(JSON.stringify({ error: 'Pergunta é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = user.id;
    console.log(`AI Analysis for tenant ${tenantId}: ${question}`);

    // Fetch real financial data
    const { data: transactions, error: txError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false })
      .limit(100);

    const { data: accounts, error: accError } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('tenant_id', tenantId);

    // Check if there's enough data
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ 
        answer: 'Não há dados financeiros suficientes para análise. Adicione transações para obter insights.',
        has_data: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context from real data
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    // Category analysis
    const categoryTotals: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
    });

    // Monthly analysis
    const monthlyTotals: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const month = t.transaction_date.substring(0, 7);
      if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyTotals[month].income += Number(t.amount);
      else monthlyTotals[month].expense += Number(t.amount);
    });

    // Build data context for AI
    const dataContext = `
DADOS FINANCEIROS REAIS DO USUÁRIO:

RESUMO GERAL:
- Total de Receitas: R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total de Despesas: R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Saldo Líquido: R$ ${netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Número de Transações: ${transactions.length}

DESPESAS POR CATEGORIA:
${Object.entries(categoryTotals).map(([cat, val]) => `- ${cat}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n') || '- Nenhuma despesa registrada'}

DADOS MENSAIS:
${Object.entries(monthlyTotals).map(([month, data]) => `- ${month}: Receitas R$ ${data.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Despesas R$ ${data.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}

CONTAS FINANCEIRAS:
${accounts?.map(a => `- ${a.name} (${a.bank_name || 'N/A'}): R$ ${Number(a.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${a.status}`).join('\n') || '- Nenhuma conta cadastrada'}

ÚLTIMAS TRANSAÇÕES:
${transactions.slice(0, 10).map(t => `- ${t.transaction_date}: ${t.type === 'income' ? 'Receita' : 'Despesa'} - ${t.category} - R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${t.description || 'Sem descrição'}`).join('\n')}
`;

    const systemPrompt = `Você é um analista financeiro especializado. Responda APENAS com base nos dados reais fornecidos.

REGRAS OBRIGATÓRIAS:
1. NUNCA invente números ou dados
2. NUNCA faça suposições sobre dados não fornecidos
3. Se não houver dados suficientes, diga claramente
4. Responda em português brasileiro
5. Seja conciso e direto
6. Use os valores exatos dos dados fornecidos
7. Se perguntado sobre algo fora dos dados, diga que não há informação disponível

${dataContext}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao processar análise' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ai_analysis',
      entity: 'financial_transactions',
      details: { question, transactions_analyzed: transactions.length },
    });

    console.log('AI analysis completed successfully');

    return new Response(JSON.stringify({ 
      answer,
      has_data: true,
      data_summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: netBalance,
        transaction_count: transactions.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in AI analysis:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
