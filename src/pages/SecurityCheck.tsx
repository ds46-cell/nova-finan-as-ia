import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Lock, Loader2 } from 'lucide-react';

export default function SecurityCheck() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !session) {
      navigate('/login');
    }
  }, [user, session, navigate]);

  useEffect(() => {
    // Check if already verified this session
    const verified = sessionStorage.getItem('security_code_verified');
    if (verified === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleVerify = async () => {
    if (!code.trim() || !session) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-security-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code: code.trim() }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        sessionStorage.setItem('security_code_verified', 'true');
        toast({
          title: 'Acesso liberado',
          description: 'Código de segurança validado com sucesso.',
        });
        navigate('/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setBlocked(true);
          // Play alert sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRNW1t9edGc=');
          audio.play().catch(() => {});
          
          toast({
            title: 'Sistema bloqueado',
            description: 'Muitas tentativas incorretas. Contacte o administrador.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Código inválido',
            description: `Tentativa ${newAttempts}/3. Verifique seu código.`,
            variant: 'destructive',
          });
        }
        setCode('');
      }
    } catch (error) {
      console.error('Error validating code:', error);
      toast({
        title: 'Erro de validação',
        description: 'Não foi possível validar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive animate-pulse">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Sistema Bloqueado</CardTitle>
            <CardDescription>
              Acesso bloqueado por tentativas excessivas de código incorreto.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Para desbloquear o sistema, entre em contato com o administrador.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Verificação de Segurança</CardTitle>
          <CardDescription>
            Digite o código de segurança fornecido no seu cadastro para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Código de segurança"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="pl-10 text-center text-lg tracking-widest font-mono uppercase"
                maxLength={6}
                autoFocus
              />
            </div>
            
            {attempts > 0 && (
              <p className="text-sm text-destructive text-center">
                Tentativas restantes: {3 - attempts}
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            O código de segurança foi enviado para você durante o cadastro.
            Se não tiver o código, solicite ao administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
