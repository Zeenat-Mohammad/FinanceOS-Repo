import type { Transaction } from '@/types/finance';

function isActive(transaction: Transaction) {
  return !transaction.deleted_at && !transaction.soft_delete && transaction.status !== 'void';
}

function signedAmount(transaction: Transaction): number {
  if (!isActive(transaction)) return 0;
  if (metadataValue(transaction, 'splitParent') === true) return 0;
  if (transaction.type === 'income' || transaction.type === 'refund' || transaction.type === 'opening_balance') return transaction.amount;
  if (transaction.type === 'expense') return -transaction.amount;
  if (transaction.type === 'adjustment') return metadataValue(transaction, 'direction') === -1 ? -transaction.amount : transaction.amount;
  if (transaction.type === 'transfer') return metadataValue(transaction, 'direction') === 'incoming' ? transaction.amount : -transaction.amount;
  return 0;
}

function metadataValue(transaction: Transaction, key: string) {
  const metadata = transaction.metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata[key];
  }

  return undefined;
}

export function selectCurrentBalance(transactions: Transaction[], accountId: string): number {
  return transactions.filter((transaction) => transaction.account_id === accountId).reduce((total, transaction) => total + signedAmount(transaction), 0);
}

export function selectAccountTotals(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.account_id] = (totals[transaction.account_id] ?? 0) + signedAmount(transaction);
    return totals;
  }, {});
}

export function selectIncome(transactions: Transaction[]): number {
  return transactions.filter((transaction) => isActive(transaction) && transaction.type === 'income').reduce((total, transaction) => total + transaction.amount, 0);
}

export function selectExpense(transactions: Transaction[]): number {
  return transactions.filter((transaction) => isActive(transaction) && transaction.type === 'expense').reduce((total, transaction) => total + transaction.amount, 0);
}

export function selectTransfers(transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => isActive(transaction) && transaction.type === 'transfer' && metadataValue(transaction, 'direction') === 'outgoing')
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function selectCashFlow(transactions: Transaction[]): number {
  return selectIncome(transactions) + selectRefunds(transactions) - selectExpense(transactions);
}

export function selectRefunds(transactions: Transaction[]): number {
  return transactions.filter((transaction) => isActive(transaction) && transaction.type === 'refund').reduce((total, transaction) => total + transaction.amount, 0);
}

export function selectCategoryTotals(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce<Record<string, number>>((totals, transaction) => {
    if (!isActive(transaction) || !transaction.category_id || transaction.type === 'transfer' || metadataValue(transaction, 'splitParent') === true) return totals;
    totals[transaction.category_id] = (totals[transaction.category_id] ?? 0) + Math.abs(signedAmount(transaction));
    return totals;
  }, {});
}

export function selectReconciliation(transactions: Transaction[], accountId: string, expectedBalance: number) {
  const currentBalance = selectCurrentBalance(transactions, accountId);
  return {
    currentBalance,
    expectedBalance,
    difference: currentBalance - expectedBalance,
    reconciled: currentBalance === expectedBalance
  };
}
