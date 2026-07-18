import type { ForecastBundle, ScenarioAssumptions } from '@/core/forecast';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function money(n: number) {
  return n.toFixed(2);
}

export function exportForecastCsv(bundle: ForecastBundle) {
  const headers = ['Month', 'Kind', 'Income', 'Expenses', 'Savings', 'Debt', 'Investment', 'Net Worth', 'Cash Flow', 'Cash Balance', 'Score'];
  const rows = bundle.monthlyTable.map((r) =>
    [r.label, r.kind, money(r.income), money(r.expenses), money(r.savings), money(r.debt), money(r.investment), money(r.netWorth), money(r.cashFlow), money(r.cashBalance), r.financialScore.toFixed(1)].join(',')
  );
  download(`finlo-forecast-${bundle.horizon}m.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
}

export function exportForecastExcel(bundle: ForecastBundle) {
  const headers = ['Month', 'Income', 'Expenses', 'Savings', 'Debt', 'Investment', 'Net Worth', 'Cash Flow', 'Score'];
  const rows = bundle.monthlyTable
    .filter((r) => r.kind === 'forecast')
    .map((r) =>
      [r.label, money(r.income), money(r.expenses), money(r.savings), money(r.debt), money(r.investment), money(r.netWorth), money(r.cashFlow), r.financialScore.toFixed(1)].join('\t')
    );
  download(`finlo-forecast-${bundle.horizon}m.xls`, [headers.join('\t'), ...rows].join('\n'), 'application/vnd.ms-excel');
}

export function exportForecastPdf(bundle: ForecastBundle, assumptions: ScenarioAssumptions) {
  const insights = bundle.insights.map((i) => `<li><strong>${i.title}</strong> — ${i.body}</li>`).join('');
  const html = `<!doctype html><html><head><title>Finlo Forecast Report</title>
    <style>
      body{font-family:Georgia,serif;padding:32px;color:#1f2544}
      h1{margin:0 0 8px} .muted{color:#474f7a}
      table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px}
      th,td{border:1px solid #c7cce3;padding:6px;text-align:left}
      th{background:#f4f5fb}
    </style></head><body>
    <h1>Finlo Forecast Center</h1>
    <p class="muted">${bundle.horizon}-month ${bundle.scenario} scenario · Generated ${new Date(bundle.generatedAt).toLocaleString()}</p>
    <p>Projected net worth: <strong>$${money(bundle.overview.projectedNetWorth)}</strong> ·
       Cash: <strong>$${money(bundle.overview.projectedCashBalance)}</strong> ·
       Debt free: <strong>${bundle.debtFreeDate ?? 'N/A'}</strong></p>
    <h3>Assumptions</h3>
    <p class="muted">Salary ×${assumptions.salaryMultiplier} · Inflation ${(assumptions.inflationRate * 100).toFixed(1)}% ·
       Returns ${(assumptions.investmentReturnAnnual * 100).toFixed(1)}% · Tax ${(assumptions.taxRate * 100).toFixed(0)}%</p>
    <h3>Insights</h3><ul>${insights}</ul>
    <table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Worth</th><th>Cash Flow</th></tr></thead>
    <tbody>${bundle.monthlyTable
      .filter((r) => r.kind === 'forecast')
      .map((r) => `<tr><td>${r.label}</td><td>$${money(r.income)}</td><td>$${money(r.expenses)}</td><td>$${money(r.netWorth)}</td><td>$${money(r.cashFlow)}</td></tr>`)
      .join('')}</tbody></table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
