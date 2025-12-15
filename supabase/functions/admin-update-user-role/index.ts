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

    // Check if caller is admin
    const { data: callerRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || callerRole?.role !== 'admin') {
      console.log(`Access denied for user ${user.id}, role: ${callerRole?.role}`);
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { target_user_id, new_role, action, new_status } = await req.json();

    if (action === 'update_role') {
      if (!target_user_id || !new_role) {
        return new Response(JSON.stringify({ error: 'ID do usuário e novo papel são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['admin', 'analyst', 'viewer'].includes(new_role)) {
        return new Response(JSON.stringify({ error: 'Papel inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update user role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: new_role })
        .eq('user_id', target_user_id);

      if (updateError) {
        console.error('Error updating role:', updateError);
        return new Response(JSON.stringify({ error: 'Erro ao atualizar papel' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'update_role',
        entity: 'user_roles',
        entity_id: target_user_id,
        details: { target_user_id, new_role, performed_by: user.id },
      });

      console.log(`Role updated: ${target_user_id} -> ${new_role} by ${user.id}`);
      return new Response(JSON.stringify({ success: true, message: 'Papel atualizado com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_status') {
      if (!target_user_id || !new_status) {
        return new Response(JSON.stringify({ error: 'ID do usuário e novo status são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['active', 'suspended'].includes(new_status)) {
        return new Response(JSON.stringify({ error: 'Status inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update user status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: new_status })
        .eq('id', target_user_id);

      if (updateError) {
        console.error('Error updating status:', updateError);
        return new Response(JSON.stringify({ error: 'Erro ao atualizar status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: new_status === 'suspended' ? 'suspend_user' : 'activate_user',
        entity: 'profiles',
        entity_id: target_user_id,
        details: { target_user_id, new_status, performed_by: user.id },
      });

      console.log(`Status updated: ${target_user_id} -> ${new_status} by ${user.id}`);
      return new Response(JSON.stringify({ success: true, message: 'Status atualizado com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in admin function:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
