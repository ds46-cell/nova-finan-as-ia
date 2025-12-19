import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth', '/security-check'];

export function useSecurityCheck() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (loading) return;

    const verified = sessionStorage.getItem('security_code_verified') === 'true';
    setIsVerified(verified);

    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

    if (user && !verified && !isPublicRoute) {
      navigate('/security-check');
    }
  }, [user, loading, location.pathname, navigate]);

  return { isVerified, loading };
}
