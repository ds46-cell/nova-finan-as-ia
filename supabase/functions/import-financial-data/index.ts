import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  type: string;
  category: string;
  amount: string;
  description?: string;
  transaction_date: string;
}

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

    const { rows, integration_name } = await req.json() as { rows: CSVRow[]; integration_name: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create integration record
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .insert({
        user_id: user.id,
        name: integration_name || `CSV Import ${new Date().toISOString()}`,
        type: 'csv_import',
        status: 'active',
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Integration error:', integrationError);
      return new Response(JSON.stringify({ error: 'Failed to create integration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and process rows
    const validRows: Array<{
      tenant_id: string;
      type: string;
      category: string;
      amount: number;
      description: string;
      transaction_date: string;
      created_by: string;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Validate type
      if (!['income', 'expense'].includes(row.type?.toLowerCase())) {
        errors.push(`Row ${i + 1}: Invalid type "${row.type}"`);
        continue;
      }

      // Validate amount
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount "${row.amount}"`);
        continue;
      }

      // Validate category
      if (!row.category || row.category.trim() === '') {
        errors.push(`Row ${i + 1}: Missing category`);
        continue;
      }

      // Validate date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.transaction_date)) {
        errors.push(`Row ${i + 1}: Invalid date format "${row.transaction_date}" (use YYYY-MM-DD)`);
        continue;
      }

      validRows.push({
        tenant_id: user.id,
        type: row.type.toLowerCase(),
        category: row.category.trim(),
        amount,
        description: row.description?.trim() || '',
        transaction_date: row.transaction_date,
        created_by: user.id,
      });
    }

    // Insert valid transactions
    let recordsProcessed = 0;
    if (validRows.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('financial_transactions')
        .insert(validRows);

      if (insertError) {
        console.error('Insert error:', insertError);
        errors.push(`Failed to insert transactions: ${insertError.message}`);
      } else {
        recordsProcessed = validRows.length;
      }
    }

    // Create integration log
    const { error: logError } = await supabaseClient
      .from('integration_logs')
      .insert({
        integration_id: integration.id,
        user_id: user.id,
        status: errors.length > 0 && recordsProcessed === 0 ? 'error' : errors.length > 0 ? 'success' : 'success',
        message: errors.length > 0 ? errors.join('; ') : `Successfully imported ${recordsProcessed} transactions`,
        records_processed: recordsProcessed,
        records_failed: rows.length - recordsProcessed,
        metadata: { total_rows: rows.length, errors },
      });

    if (logError) {
      console.error('Log error:', logError);
    }

    // Log audit event
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'CSV_IMPORT',
      entity: 'financial_transactions',
      entity_id: integration.id,
      details: {
        total_rows: rows.length,
        records_processed: recordsProcessed,
        records_failed: rows.length - recordsProcessed,
        integration_name,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      integration_id: integration.id,
      records_processed: recordsProcessed,
      records_failed: rows.length - recordsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Import failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
