import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/data/supabase/client';
import { useAuthStore } from '@/features/auth/authStore';
import { getAdminClaimsFromUser } from '@/utils/admin';

export function useAdmin() {
  const storeUser = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.authStatus);
  const initialized = useAuthStore((state) => state.initialized);

  const sessionQuery = useQuery({
    queryKey: ['admin', 'session', storeUser?.id ?? 'anonymous'],
    enabled: authStatus !== 'loading',
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 30_000,
    retry: false
  });

  const session = sessionQuery.data;
  const user = session?.user ?? storeUser ?? null;
  const claims = getAdminClaimsFromUser(user);
  const isLoading = authStatus === 'loading' || !initialized || sessionQuery.isLoading;
  const isAuthenticated = Boolean(session ?? storeUser);

  return {
    user,
    session,
    claims,
    role: claims.role,
    roles: claims.roles,
    isAdmin: claims.isAdmin,
    isSuperAdmin: claims.isSuperAdmin,
    isAuthenticated,
    isLoading,
    error: sessionQuery.error,
    refetch: sessionQuery.refetch
  };
}
