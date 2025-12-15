import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Ban, Check, Search, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  analyst: 'Analista',
  viewer: 'Visualizador',
};

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  analyst: 'bg-warning/10 text-warning border-warning/20',
  viewer: 'bg-primary/10 text-primary border-primary/20',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { role: currentUserRole, loading: roleLoading } = useUserProfile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!roleLoading && currentUserRole !== 'admin') {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/dashboard');
    }
  }, [currentUserRole, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, status, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'viewer',
        };
      });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'admin') {
      fetchUsers();
    }
  }, [currentUserRole]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!session?.access_token) return;

    try {
      setUpdating(userId);

      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { 
          target_user_id: userId, 
          new_role: newRole, 
          action: 'update_role' 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Papel atualizado com sucesso');
      fetchUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar papel');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!session?.access_token) return;

    try {
      setUpdating(userId);

      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { 
          target_user_id: userId, 
          new_status: newStatus, 
          action: 'update_status' 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Status atualizado com sucesso');
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (currentUserRole !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administração de Usuários</h1>
            <p className="text-muted-foreground">Gerencie papéis e status dos usuários</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="icon">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Papel</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-4"><div className="h-10 bg-secondary animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-8 w-24 bg-secondary animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-8 w-20 bg-secondary animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-secondary animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-8 w-24 bg-secondary animate-pulse rounded" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{user.name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleUpdateRole(user.id, value)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className={`w-36 border ${roleColors[user.role]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                            <SelectItem value="analyst">{roleLabels.analyst}</SelectItem>
                            <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {user.status === 'active' ? (
                            <>
                              <Check className="w-3 h-3" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              Suspenso
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(user.id, user.status === 'active' ? 'suspended' : 'active')}
                          disabled={updating === user.id}
                        >
                          {user.status === 'active' ? (
                            <>
                              <Ban className="w-3 h-3 mr-1" />
                              Bloquear
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total de usuários</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Usuários ativos</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
