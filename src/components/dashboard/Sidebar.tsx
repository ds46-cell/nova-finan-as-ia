import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Activity,
  Bell,
  Upload,
  Bot,
  FileBarChart,
  Lock,
} from 'lucide-react';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Wallet, label: 'Financeiro', path: '/financeiro' },
  { icon: TrendingUp, label: 'Análises', path: '/analises' },
  { icon: FileBarChart, label: 'Relatórios', path: '/relatorios' },
  { icon: Upload, label: 'Integrações', path: '/integracoes' },
  { icon: Shield, label: 'Compliance', path: '/compliance' },
  { icon: Bot, label: 'IA Agentes', path: '/ia-agentes' },
];

const adminNavItems = [
  { icon: Users, label: 'Usuários', path: '/admin/users' },
  { icon: Bell, label: 'Notificações', path: '/admin/notificacoes' },
  { icon: Activity, label: 'Monitoramento', path: '/monitoramento' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isSecurityVerified, setIsSecurityVerified] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  useEffect(() => {
    const verified = sessionStorage.getItem('security_code_verified') === 'true';
    setIsSecurityVerified(verified);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    sessionStorage.removeItem('security_code_verified');
    await signOut();
    navigate('/login');
  };

  if (!isSecurityVerified) {
    return (
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 w-64"
      )}>
        <div className="flex h-full flex-col items-center justify-center p-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Sistema bloqueado. Valide seu código de segurança.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/security-check')}>
            Validar Código
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold gradient-text">FinanceOS</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("shrink-0", collapsed && "hidden")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Principal
              </p>
            )}
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary sidebar-item-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          <div className="mt-8 space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Administração
              </p>
            )}
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary sidebar-item-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="w-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
