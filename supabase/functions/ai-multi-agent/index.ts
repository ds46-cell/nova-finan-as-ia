import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AgentType = 'financial' | 'security' | 'monitoring' | 'integration' | 'compliance' | 'guardian';

interface AgentRequest {
  agent: AgentType;
  question: string;
  context?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { agent, question, context }: AgentRequest = await req.json();

    if (!agent || !question) {
      return new Response(JSON.stringify({ error: 'Agent type and question are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's custom AI training rules
    const { data: trainingRules } = await supabase
      .from('ai_training_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('rule_type', agent)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Build agent-specific context
    let agentContext: Record<string, unknown> = {};
    let systemPrompt = '';

    switch (agent) {
      case 'financial':
        // Fetch financial data
        const { data: transactions } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('tenant_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(100);

        const { data: accounts } = await supabase
          .from('financial_accounts')
          .select('*')
          .eq('tenant_id', user.id);

        agentContext = { transactions, accounts };
        systemPrompt = `Você é um agente financeiro especializado. Analise APENAS os dados reais fornecidos. 
NUNCA invente dados. Se não houver dados suficientes, diga claramente.
Dados disponíveis: ${JSON.stringify(agentContext)}`;
        break;

      case 'security':
        // Fetch security data
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        const { data: securityCodes } = await supabase
          .from('security_codes')
          .select('user_id, is_active, last_used_at, expires_at')
          .limit(20);

        agentContext = { auditLogs, securityCodes };
        systemPrompt = `Você é um agente de segurança. Analise logs de auditoria e eventos de segurança.
Identifique padrões suspeitos e recomende ações preventivas baseado APENAS nos dados reais.
Dados: ${JSON.stringify(agentContext)}`;
        break;

      case 'monitoring':
        // Fetch health data
        const { data: healthChecks } = await supabase
          .from('system_health')
          .select('*')
          .order('checked_at', { ascending: false })
          .limit(50);

        agentContext = { healthChecks };
        systemPrompt = `Você é um agente de monitoramento de sistema. Analise a saúde do sistema.
Identifique problemas e sugira correções baseado APENAS nos dados reais.
Dados: ${JSON.stringify(agentContext)}`;
        break;

      case 'integration':
        // Fetch integration data
        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', user.id);

        const { data: integrationLogs } = await supabase
          .from('integration_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);

        agentContext = { integrations, integrationLogs };
        systemPrompt = `Você é um agente de integrações. Analise o status das integrações.
Identifique falhas e sugira soluções baseado APENAS nos dados reais.
Dados: ${JSON.stringify(agentContext)}`;
        break;

      case 'compliance':
        // Fetch compliance data
        const { data: consents } = await supabase
          .from('lgpd_consents')
          .select('*')
          .eq('user_id', user.id);

        const { data: complianceLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .in('action', ['EXPORT_DATA', 'ANONYMIZE_DATA', 'CONSENT_GRANTED', 'CONSENT_REVOKED'])
          .order('created_at', { ascending: false })
          .limit(30);

        agentContext = { consents, complianceLogs };
        systemPrompt = `Você é um agente de compliance e LGPD. Analise o status de conformidade.
Verifique consentimentos e ações de privacidade baseado APENAS nos dados reais.
Dados: ${JSON.stringify(agentContext)}`;
        break;

      case 'guardian':
        // Guardian agent oversees all other agents
        systemPrompt = `Você é o agente guardião, supervisor de todos os outros agentes.
Sua função é garantir que as respostas dos agentes sejam precisas e baseadas em dados reais.
Avalie a qualidade e segurança das análises.`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid agent type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Add custom training rules to prompt
    if (trainingRules && trainingRules.length > 0) {
      const rulesText = trainingRules.map(r => r.rule_content).join('\n');
      systemPrompt += `\n\nRegras personalizadas do usuário:\n${rulesText}`;
    }

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
      console.error('AI Gateway error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    // Log AI interaction
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_AGENT_QUERY',
      entity: 'ai_multi_agent',
      details: { agent, question: question.substring(0, 200) },
    });

    // Store insight
    await supabase.from('ai_insights').insert({
      user_id: user.id,
      insight_type: agent,
      question: question,
      content: answer,
      data_context: agentContext,
    });

    return new Response(JSON.stringify({
      agent,
      answer,
      has_custom_rules: (trainingRules?.length || 0) > 0,
      data_context_summary: {
        transactions_count: agentContext.transactions?.length,
        accounts_count: agentContext.accounts?.length,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in ai-multi-agent:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
