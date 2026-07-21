import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates every read model derived from normalized wealth records.
 * Prefix invalidation keeps feature-specific parameters (month, scenario, etc.) intact.
 */
export async function invalidateWealthDependents(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['wealth'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['net-worth'] }),
    queryClient.invalidateQueries({ queryKey: ['forecast'] }),
    queryClient.invalidateQueries({ queryKey: ['reports'] }),
    queryClient.invalidateQueries({ queryKey: ['insights'] }),
    queryClient.invalidateQueries({ queryKey: ['search'] })
  ]);
}
