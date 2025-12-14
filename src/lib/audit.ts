import { supabase } from '@/integrations/supabase/client';

interface AuditEventPayload {
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event via Edge Function
 * Use this for all important system events
 */
export async function logAuditEvent(payload: AuditEventPayload): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('log-audit-event', {
      body: payload,
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    // Don't throw - audit logging should not break the app flow
    console.error('Audit logging error:', err);
  }
}

// Convenience functions for common actions
export const AuditActions = {
  // Auth events
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'signup',
  PASSWORD_CHANGE: 'password_change',
  
  // CRUD operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // System events
  EXPORT: 'export',
  IMPORT: 'import',
  ACCESS_DENIED: 'access_denied',
} as const;

export const AuditEntities = {
  AUTH: 'auth',
  USER: 'user',
  PROFILE: 'profile',
  ROLE: 'role',
  TRANSACTION: 'transaction',
  REPORT: 'report',
} as const;
