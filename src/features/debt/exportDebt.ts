import { fromMinor, STRATEGY_LABELS, type StrategyResult } from '@/core/debt';
import type { DebtAccount, DebtSimulationSettings } from '@/types/debt';

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function money(minor: number) {
  return fromMinor(minor).toFixed(2);
}

export function exportAmortizationCsv(result: StrategyResult, debts: DebtAccount[]) {
  const debtMap = new Map(debts.map((d) => [d.id, d.name]));
  const headers = [
    'Month',
    'Starting Balance',
    'Total Payment',
    'Principal',
    'Interest',
    'Extra Payment',
    'Ending Balance',
    ...result.schedule[0]?.debts.flatMap((d) => {
      const name = debtMap.get(d.debtId) ?? d.debtId;
      return [`${name} Payment`, `${name} Interest`, `${name} Principal`, `${name} Balance`];
    }) ?? []
  ];

  const rows = result.schedule.map((row) => {
    const base = [
      row.label,
      money(row.startingBalanceMinor),
      money(row.totalPaymentMinor),
      money(row.totalPrincipalMinor),
      money(row.totalInterestMinor),
      money(row.extraPaymentMinor),
      money(row.endingBalanceMinor)
    ];
    const perDebt = row.debts.flatMap((d) => [
      money(d.paymentMinor),
      money(d.interestMinor),
      money(d.principalMinor),
      money(d.endingBalanceMinor)
    ]);
    return [...base, ...perDebt].join(',');
  });

  downloadBlob(`finlo-amortization-${result.strategy}.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
}

export function exportSimulationSummary(
  settings: DebtSimulationSettings,
  result: StrategyResult,
  debts: DebtAccount[]
) {
  const active = debts.filter((d) => d.status === 'active' && !d.deleted_at);
  const lines = [
    'Finlo Debt Center — Simulation Summary',
    `Strategy,${STRATEGY_LABELS[result.strategy]}`,
    `Start,${result.timeline[0]?.label ?? ''}`,
    `Extra Payment,${money(settings.extra_payment_minor)}`,
    `Debt Free Date,${result.debtFreeDate?.label ?? 'N/A'}`,
    `Months to Payoff,${result.monthsToPayoff}`,
    `Total Interest,${money(result.totalInterestMinor)}`,
    `Interest Saved,${money(result.interestSavedMinor)}`,
    `Total Paid,${money(result.totalPaidMinor)}`,
    '',
    'Debts',
    'Name,Type,Balance,APR,Minimum,Monthly',
    ...active.map(
      (d) =>
        `${d.name},${d.type},${money(d.balance_minor)},${d.apr_percent},${money(d.minimum_payment_minor)},${money(d.monthly_payment_minor)}`
    )
  ];
  downloadBlob('finlo-debt-simulation-summary.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

/** Excel-friendly TSV export of the amortization schedule. */
export function exportAmortizationExcel(result: StrategyResult) {
  const headers = ['Month', 'Starting Balance', 'Payment', 'Principal', 'Interest', 'Extra', 'Ending Balance'];
  const rows = result.schedule.map((row) =>
    [
      row.label,
      money(row.startingBalanceMinor),
      money(row.totalPaymentMinor),
      money(row.totalPrincipalMinor),
      money(row.totalInterestMinor),
      money(row.extraPaymentMinor),
      money(row.endingBalanceMinor)
    ].join('\t')
  );
  downloadBlob(`finlo-amortization-${result.strategy}.xls`, [headers.join('\t'), ...rows].join('\n'), 'application/vnd.ms-excel');
}

/** Opens a print-ready summary the browser can save as PDF. */
export function exportSimulationPdf(settings: DebtSimulationSettings, result: StrategyResult, debts: DebtAccount[]) {
  const active = debts.filter((d) => d.status === 'active' && !d.deleted_at);
  const html = `<!doctype html><html><head><title>Finlo Debt Simulation</title>
    <style>
      body{font-family:Georgia,serif;padding:32px;color:#1f2544;background:#fff}
      h1{margin:0 0 8px} .muted{color:#474f7a}
      table{width:100%;border-collapse:collapse;margin-top:24px;font-size:12px}
      th,td{border:1px solid #c7cce3;padding:8px;text-align:left}
      th{background:#f4f5fb}
    </style></head><body>
    <h1>Finlo Debt Center</h1>
    <p class="muted">Simulation summary — ${STRATEGY_LABELS[result.strategy]}</p>
    <p>Debt free: <strong>${result.debtFreeDate?.label ?? 'N/A'}</strong> ·
       Months: <strong>${result.monthsToPayoff}</strong> ·
       Interest: <strong>$${money(result.totalInterestMinor)}</strong> ·
       Saved: <strong>$${money(result.interestSavedMinor)}</strong> ·
       Extra/mo: <strong>$${money(settings.extra_payment_minor)}</strong></p>
    <table><thead><tr><th>Debt</th><th>Balance</th><th>APR</th><th>Min Payment</th></tr></thead>
    <tbody>${active.map((d) => `<tr><td>${d.name}</td><td>$${money(d.balance_minor)}</td><td>${d.apr_percent}%</td><td>$${money(d.minimum_payment_minor)}</td></tr>`).join('')}</tbody></table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
