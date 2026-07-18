import { Fragment, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { StrategyResult } from '@/core/debt';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import { Button, Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { DebtAccount } from '@/types/debt';
import { exportAmortizationCsv } from '../exportDebt';

const PAGE_SIZE = 12;

export function AmortizationTable({
  result,
  debts,
  currency
}: {
  result: StrategyResult;
  debts: DebtAccount[];
  currency: string;
}) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const debtMap = useMemo(() => new Map(debts.map((d) => [d.id, d.name])), [debts]);

  const totalPages = Math.max(1, Math.ceil(result.schedule.length / PAGE_SIZE));
  const pageRows = result.schedule.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Payoff Schedule</h2>
          <p className="mt-1 text-xs text-muted">Month-by-month amortization · {result.schedule.length} months</p>
        </div>
        <Button
          className="border border-border bg-transparent text-foreground hover:bg-secondary"
          onClick={() => exportAmortizationCsv(result, debts)}
        >
          <Download className="h-4 w-4" /> Download CSV
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-2 py-2 font-medium">Month</th>
              <th className="px-2 py-2 font-medium">Starting</th>
              <th className="px-2 py-2 font-medium">Payment</th>
              <th className="px-2 py-2 font-medium">Principal</th>
              <th className="px-2 py-2 font-medium">Interest</th>
              <th className="px-2 py-2 font-medium">Extra</th>
              <th className="px-2 py-2 font-medium">Ending</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const open = expanded === row.monthIndex;
              return (
                <Fragment key={row.monthIndex}>
                  <tr
                    className={cn('cursor-pointer border-b border-border/60 hover:bg-primary/30', open && 'bg-primary/40')}
                    onClick={() => setExpanded(open ? null : row.monthIndex)}
                  >
                    <td className="px-2 py-2.5 font-medium">{row.label}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatCurrencyMinorUnits(row.startingBalanceMinor, currency)}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatCurrencyMinorUnits(row.totalPaymentMinor, currency)}</td>
                    <td className="px-2 py-2.5 tabular-nums text-success">{formatCurrencyMinorUnits(row.totalPrincipalMinor, currency)}</td>
                    <td className="px-2 py-2.5 tabular-nums text-purple">{formatCurrencyMinorUnits(row.totalInterestMinor, currency)}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatCurrencyMinorUnits(row.extraPaymentMinor, currency)}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatCurrencyMinorUnits(row.endingBalanceMinor, currency)}</td>
                  </tr>
                  {open ? (
                    <tr className="bg-primary/20">
                      <td colSpan={7} className="px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {row.debts
                            .filter((d) => d.paymentMinor > 0 || d.endingBalanceMinor > 0)
                            .map((d) => (
                              <div key={d.debtId} className="rounded-md border border-border bg-surface/60 p-2 text-xs">
                                <div className="font-medium text-foreground">{debtMap.get(d.debtId) ?? d.debtId}</div>
                                <div className="mt-1 text-muted">
                                  Pay {formatCurrencyMinorUnits(d.paymentMinor, currency)} · Int{' '}
                                  {formatCurrencyMinorUnits(d.interestMinor, currency)} · Prin{' '}
                                  {formatCurrencyMinorUnits(d.principalMinor, currency)}
                                </div>
                                <div className="mt-0.5 text-muted">Balance {formatCurrencyMinorUnits(d.endingBalanceMinor, currency)}</div>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => {
            const pageIndex = totalPages <= 12 ? i : Math.min(totalPages - 1, Math.max(0, page - 5 + i));
            return (
              <button
                key={pageIndex}
                type="button"
                className={cn(
                  'h-8 min-w-8 rounded-md px-2 text-xs',
                  page === pageIndex ? 'bg-accent text-white' : 'bg-primary text-muted hover:text-foreground'
                )}
                onClick={() => setPage(pageIndex)}
              >
                {pageIndex + 1}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
