import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface UserProfile {
  id: string;
  full_name: string | null;
  name: string;
  email: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  role: 'admin' | 'analyst' | 'viewer';
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchUserData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(profileError.message);
        }

        // Fetch role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) {
          throw new Error(roleError.message);
        }

        setProfile(profileData as UserProfile | null);
        setRole(roleData?.role || 'viewer');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error: error?.message || null };
  };

  return {
    profile,
    role,
    loading,
    error,
    updateProfile,
    displayName: profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Usuário',
    isAdmin: role === 'admin',
    isAnalyst: role === 'analyst',
    isViewer: role === 'viewer',
  };
}
