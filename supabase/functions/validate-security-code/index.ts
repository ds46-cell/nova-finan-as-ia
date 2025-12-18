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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Security code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate security code
    const { data: securityCode, error: codeError } = await supabase
      .from('security_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      console.error('Error validating security code:', codeError);
      return new Response(JSON.stringify({ error: 'Error validating code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!securityCode) {
      // Log failed attempt
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'SECURITY_CODE_FAILED',
        entity: 'security_codes',
        details: { attempted_code: code },
      });

      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Invalid security code' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if code is expired
    if (securityCode.expires_at && new Date(securityCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Security code has expired' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last used timestamp
    await supabase
      .from('security_codes')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', securityCode.id);

    // Log successful validation
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'SECURITY_CODE_VALIDATED',
      entity: 'security_codes',
      entity_id: securityCode.id,
    });

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in validate-security-code:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
