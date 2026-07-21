import { useMemo } from 'react';
import type { Account } from '@/types/finance';
import type { WealthDashboardSummary } from '@/types/wealth';

const BANK_GROUPS = new Set(['bank', 'cash', 'wallet']);
const BANK_TYPES = new Set(['checking', 'savings', 'wallet', 'cash']);

export function isBankAccount(account: Account) {
  if (account.deleted_at) return false;
  if (['investment', 'crypto', 'loan', 'credit_card'].includes(account.type)) return false;
  if (['investment', 'loan', 'credit_card'].includes(account.group_name)) return false;
  return BANK_GROUPS.has(account.group_name) || BANK_TYPES.has(account.type);
}

export function useAccountsSummary(accounts: Account[], wealth: WealthDashboardSummary | undefined, currency: string) {
  return useMemo(() => {
    const allBankAccounts = accounts.filter(isBankAccount);
    const bankAccounts = allBankAccounts.filter((account) => !account.is_archived);
    const archivedBankAccounts = allBankAccounts.filter((account) => account.is_archived);
    const totalCash = bankAccounts.reduce((sum, row) => sum + Number(row.balance ?? row.opening_balance ?? 0), 0);

    const investmentValue = wealth?.investments.reduce((sum, row) => sum + row.quantity * row.current_price, 0) ?? 0;
    const cryptoValue = wealth?.crypto.reduce((sum, row) => sum + row.quantity * row.current_price, 0) ?? 0;
    const assetValue = wealth?.assets.reduce((sum, row) => sum + row.estimated_value, 0) ?? 0;
    const loanBalance = wealth?.loans.reduce((sum, row) => sum + row.remaining_balance, 0) ?? 0;
    const creditOutstanding = wealth?.credit_cards.reduce((sum, row) => sum + row.outstanding_balance, 0) ?? 0;
    const investmentTotal = investmentValue + cryptoValue;
    const netWorth = totalCash + investmentValue + cryptoValue + assetValue - loanBalance - creditOutstanding;

    return {
      bankAccounts,
      archivedBankAccounts,
      allBankAccounts,
      totalCash,
      investmentValue,
      cryptoValue,
      assetValue,
      loanBalance,
      creditOutstanding,
      investmentTotal,
      netWorth,
      currency
    };
  }, [accounts, wealth, currency]);
}
