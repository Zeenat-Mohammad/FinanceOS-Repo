import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, Printer } from 'lucide-react';
import { Button, Card, LoadingState, Modal, Page } from '@/shared/components';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { queryKeys } from '@/data/query-keys';
import {
  ReportsRepository,
  type MonthlyReportSummary,
  type PaperSize
} from '@/data/repositories/ReportsRepository';
import {
  buildMonthlyReportPdf,
  downloadMonthlyReport,
  paperSizeLabel,
  pdfToBlob,
  printMonthlyReport
} from './pdf/monthlyReportPdf';

const PAPER_OPTIONS: PaperSize[] = ['a4', 'letter', 'a3'];

export default function ReportsPage() {
  const household = useAuthStore((s) => s.household);
  const profile = useAuthStore((s) => s.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const householdName = household?.name ?? 'My Household';

  const yearsQuery = useQuery({
    queryKey: ['reports', 'years'],
    queryFn: () => ReportsRepository.listYears()
  });

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (yearsQuery.data?.length && !yearsQuery.data.includes(year)) {
      setYear(yearsQuery.data[0]);
    }
  }, [yearsQuery.data, year]);

  const monthsQuery = useQuery({
    queryKey: queryKeys.reports.months(household?.id ?? 'none', year),
    enabled: Boolean(year),
    queryFn: () => ReportsRepository.listMonthsForYear(year, currency)
  });

  const selectedMonth = useMemo(
    () => monthsQuery.data?.find((m) => m.key === selectedKey) ?? monthsQuery.data?.[0] ?? null,
    [monthsQuery.data, selectedKey]
  );

  useEffect(() => {
    if (!selectedKey && monthsQuery.data?.[0]) {
      setSelectedKey(monthsQuery.data[0].key);
    }
  }, [monthsQuery.data, selectedKey]);

  const detailQuery = useQuery({
    queryKey: queryKeys.reports.detail(household?.id ?? 'none', `${selectedMonth?.key ?? 'none'}:${currency}`),
    enabled: Boolean(selectedMonth && household?.id),
    queryFn: () =>
      ReportsRepository.getMonthlyDetail({
        householdId: household!.id,
        year: selectedMonth!.year,
        month: selectedMonth!.month,
        currency,
        householdName
      })
  });

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    async function buildPreview() {
      if (!detailQuery.data) {
        setPreviewUrl(null);
        return;
      }
      setPreviewBusy(true);
      setActionError(null);
      try {
        const doc = buildMonthlyReportPdf(detailQuery.data, 'a4');
        const blob = pdfToBlob(doc);
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not build PDF preview.');
        setPreviewUrl(null);
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    }

    void buildPreview();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [detailQuery.data]);

  async function handlePrint() {
    if (!detailQuery.data) return;
    setActionError(null);
    try {
      await printMonthlyReport(detailQuery.data, paper);
      setPrintOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Print failed.');
    }
  }

  function handleDownload() {
    if (!detailQuery.data) return;
    setActionError(null);
    try {
      downloadMonthlyReport(detailQuery.data, paper);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Download failed.');
    }
  }

  if (yearsQuery.isLoading || monthsQuery.isLoading) {
    return <LoadingState label="Loading monthly reports" />;
  }

  return (
    <Page className="relative pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Automatic monthly PDF reports from your ledger — preview, print, and download.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Year
          <select
            className="select w-auto min-w-[110px]"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setSelectedKey(null);
            }}
          >
            {(yearsQuery.data ?? [year]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <Card className="p-3">
          <div className="mb-3 flex items-center gap-2 px-1">
            <FileText className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">{year} monthly reports</h2>
          </div>
          <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto">
            {(monthsQuery.data ?? []).map((month) => (
              <MonthRow
                key={month.key}
                month={month}
                currency={currency}
                active={selectedMonth?.key === month.key}
                onSelect={() => setSelectedKey(month.key)}
              />
            ))}
          </ul>
          {(monthsQuery.data ?? []).length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted">No months available for {year}.</p>
          ) : null}
        </Card>

        <div className="space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{selectedMonth?.label ?? 'Select a month'}</div>
              <div className="mt-0.5 text-xs text-muted">
                {detailQuery.data
                  ? `${detailQuery.data.transactionCount} transactions · PDF preview (A4)`
                  : 'Loading report…'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="border border-border bg-transparent text-foreground hover:bg-secondary"
                disabled={!detailQuery.data}
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                className="bg-success text-primary hover:bg-success/90"
                disabled={!detailQuery.data}
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </Card>

          {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border/70 bg-primary/40 px-4 py-2 text-xs font-medium text-muted">
              PDF preview
            </div>
            <div className="relative min-h-[36rem] bg-[#e8eaf0]">
              {previewBusy || detailQuery.isLoading ? (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    Building PDF…
                  </span>
                </div>
              ) : previewUrl ? (
                <iframe title="Monthly report PDF preview" src={previewUrl} className="h-[70vh] w-full border-0 bg-white" />
              ) : (
                <div className="grid min-h-[36rem] place-items-center text-sm text-muted">Select a month to preview.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={printOpen} title="Print monthly report" onClose={() => setPrintOpen(false)}>
        <p className="text-sm text-muted">Choose a paper size for printing.</p>
        <div className="mt-4 grid gap-2">
          {PAPER_OPTIONS.map((option) => (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-brand border px-3 py-2.5 text-sm transition',
                paper === option ? 'border-accent bg-accent/10' : 'border-border hover:bg-primary/40'
              )}
            >
              <input
                type="radio"
                name="paper"
                className="accent-[var(--color-accent-teal)]"
                checked={paper === option}
                onChange={() => setPaper(option)}
              />
              <span className="font-medium text-foreground">{paperSizeLabel(option)}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => setPrintOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handlePrint()}>
            <Printer className="h-4 w-4" /> Print {paperSizeLabel(paper)}
          </Button>
        </div>
      </Modal>
    </Page>
  );
}

function MonthRow({
  month,
  currency,
  active,
  onSelect
}: {
  month: MonthlyReportSummary;
  currency: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border px-3 py-2.5 text-left transition',
        active ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-primary/50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{month.label}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
            month.hasData ? 'bg-success/20 text-success' : 'bg-primary text-muted'
          )}
        >
          {month.hasData ? 'Ready' : 'Empty'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        <span>In {formatCurrency(month.income, currency)}</span>
        <span>Out {formatCurrency(month.expenses, currency)}</span>
        <span className={month.net >= 0 ? 'text-success' : 'text-destructive'}>
          Net {formatCurrency(month.net, currency)}
        </span>
      </div>
    </button>
  );
}
