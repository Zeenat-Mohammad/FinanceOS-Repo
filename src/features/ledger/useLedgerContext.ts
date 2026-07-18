import { useAuthStore } from '@/features/auth/authStore';

export function useLedgerContext() {
  const { user, household, initializationStatus } = useAuthStore();

  return {
    user,
    household,
    loading: initializationStatus !== 'ready'
  };
}
