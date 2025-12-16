import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, consent_type, granted } = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (action) {
      case 'get_consents': {
        const { data: consents, error } = await supabaseClient
          .from('lgpd_consents')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ consents }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_consent': {
        if (!consent_type) {
          return new Response(JSON.stringify({ error: 'consent_type required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient
          .from('lgpd_consents')
          .upsert({
            user_id: user.id,
            consent_type,
            granted: granted === true,
            granted_at: granted === true ? new Date().toISOString() : null,
            revoked_at: granted === false ? new Date().toISOString() : null,
            ip_address: clientIP,
            user_agent: userAgent,
          }, {
            onConflict: 'user_id,consent_type',
          });

        if (error) throw error;

        // Audit log
        await serviceClient.from('audit_logs').insert({
          user_id: user.id,
          action: granted ? 'LGPD_CONSENT_GRANTED' : 'LGPD_CONSENT_REVOKED',
          entity: 'lgpd_consents',
          details: { consent_type, granted },
          ip_address: clientIP,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'export_data': {
        // Export all user data for LGPD compliance
        const [
          { data: profile },
          { data: transactions },
          { data: consents },
          { data: auditLogs },
          { data: aiInsights },
        ] = await Promise.all([
          supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
          supabaseClient.from('financial_transactions').select('*').eq('tenant_id', user.id),
          supabaseClient.from('lgpd_consents').select('*').eq('user_id', user.id),
          supabaseClient.from('audit_logs').select('*').eq('user_id', user.id),
          supabaseClient.from('ai_insights').select('*').eq('user_id', user.id),
        ]);

        // Audit log
        await serviceClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'LGPD_DATA_EXPORT',
          entity: 'user',
          entity_id: user.id,
          ip_address: clientIP,
        });

        return new Response(JSON.stringify({
          exported_at: new Date().toISOString(),
          user_id: user.id,
          email: user.email,
          profile,
          transactions,
          consents,
          audit_logs: auditLogs,
          ai_insights: aiInsights,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'anonymize_data': {
        // Anonymize user data (LGPD right to be forgotten)
        const { error: profileError } = await serviceClient
          .from('profiles')
          .update({
            name: 'Usuário Removido',
            email: `deleted_${user.id}@removed.local`,
            full_name: null,
            avatar_url: null,
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Audit log before anonymization
        await serviceClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'LGPD_DATA_ANONYMIZED',
          entity: 'user',
          entity_id: user.id,
          ip_address: clientIP,
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User data has been anonymized' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: unknown) {
    console.error('LGPD error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'LGPD operation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
