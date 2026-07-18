import { DatabaseError, NetworkError, PermissionError } from '@/shared/errors';

export function throwDatabaseError(message: string, cause: unknown): never {
  console.error('[RepositoryError]', message, cause);

  if (isPostgrestError(cause)) {
    if (cause.code === '42501' || cause.message.toLowerCase().includes('permission') || cause.message.toLowerCase().includes('rls')) {
      throw new PermissionError(message, cause);
    }

    throw new DatabaseError(message, cause, friendlyDatabaseMessage(message));
  }

  if (cause instanceof TypeError && cause.message.toLowerCase().includes('fetch')) {
    throw new NetworkError(message, cause);
  }

  throw new DatabaseError(message, cause, friendlyDatabaseMessage(message));
}

function isPostgrestError(error: unknown): error is { code?: string; message: string; details?: string; hint?: string } {
  return Boolean(error && typeof error === 'object' && 'message' in error);
}

function friendlyDatabaseMessage(message: string) {
  if (message.toLowerCase().includes('profile')) return 'Your profile could not be loaded or saved.';
  if (message.toLowerCase().includes('household')) return 'Your household workspace could not be loaded or repaired.';
  if (message.toLowerCase().includes('categories')) return 'Your default categories could not be loaded or repaired.';
  if (message.toLowerCase().includes('accounts')) return 'Your accounts could not be loaded.';
  if (message.toLowerCase().includes('transactions') || message.toLowerCase().includes('ledger')) return 'Your ledger could not be loaded.';
  return 'A database request failed. Please try again.';
}
