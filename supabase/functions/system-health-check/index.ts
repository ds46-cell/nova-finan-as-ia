import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  check_type: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  message: string;
  metadata: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const healthChecks: HealthCheck[] = [];
    const startTime = Date.now();

    // Check Database
    try {
      const dbStart = Date.now();
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const dbLatency = Date.now() - dbStart;
      
      if (error) {
        healthChecks.push({
          check_type: 'database',
          status: 'critical',
          message: `Database error: ${error.message}`,
          metadata: { latency_ms: dbLatency },
        });
      } else {
        healthChecks.push({
          check_type: 'database',
          status: dbLatency > 1000 ? 'degraded' : 'healthy',
          message: dbLatency > 1000 ? 'High latency detected' : 'Database operational',
          metadata: { latency_ms: dbLatency, profiles_count: count },
        });
      }
    } catch (e: unknown) {
      healthChecks.push({
        check_type: 'database',
        status: 'critical',
        message: `Database check failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        metadata: {},
      });
    }

    // Check Auth Service
    try {
      const authStart = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const authLatency = Date.now() - authStart;
      
      healthChecks.push({
        check_type: 'auth',
        status: error ? 'critical' : (authLatency > 500 ? 'degraded' : 'healthy'),
        message: error ? `Auth error: ${error.message}` : 'Auth service operational',
        metadata: { latency_ms: authLatency },
      });
    } catch (e: unknown) {
      healthChecks.push({
        check_type: 'auth',
        status: 'critical',
        message: `Auth check failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        metadata: {},
      });
    }

    // Check Storage
    try {
      const storageStart = Date.now();
      const { data, error } = await supabase.storage.listBuckets();
      const storageLatency = Date.now() - storageStart;
      
      healthChecks.push({
        check_type: 'storage',
        status: error ? 'critical' : (storageLatency > 500 ? 'degraded' : 'healthy'),
        message: error ? `Storage error: ${error.message}` : 'Storage service operational',
        metadata: { latency_ms: storageLatency, buckets_count: data?.length || 0 },
      });
    } catch (e: unknown) {
      healthChecks.push({
        check_type: 'storage',
        status: 'unknown',
        message: 'Storage check skipped',
        metadata: {},
      });
    }

    // Check Functions (self-check)
    healthChecks.push({
      check_type: 'functions',
      status: 'healthy',
      message: 'Edge functions operational',
      metadata: { self_check: true },
    });

    // Check recent integrations
    try {
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('id, status')
        .eq('status', 'error')
        .limit(5);
      
      const failedCount = integrations?.length || 0;
      
      healthChecks.push({
        check_type: 'integration',
        status: failedCount > 0 ? 'degraded' : 'healthy',
        message: failedCount > 0 ? `${failedCount} integration(s) with errors` : 'All integrations healthy',
        metadata: { failed_integrations: failedCount },
      });
    } catch (e: unknown) {
      healthChecks.push({
        check_type: 'integration',
        status: 'unknown',
        message: 'Integration check failed',
        metadata: {},
      });
    }

    // Store health checks in database
    for (const check of healthChecks) {
      await supabase.from('system_health').insert({
        check_type: check.check_type,
        status: check.status,
        message: check.message,
        metadata: check.metadata,
      });
    }

    const totalLatency = Date.now() - startTime;
    const overallStatus = healthChecks.some(c => c.status === 'critical') 
      ? 'critical' 
      : healthChecks.some(c => c.status === 'degraded') 
        ? 'degraded' 
        : 'healthy';

    return new Response(JSON.stringify({
      status: overallStatus,
      checks: healthChecks,
      total_latency_ms: totalLatency,
      checked_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in system-health-check:', error);
    return new Response(JSON.stringify({ 
      status: 'critical',
      error: 'Health check failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
