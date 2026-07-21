import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/core/utils/currency';
import type { MonthlyReportDetail, PaperSize } from '@/data/repositories/ReportsRepository';

const PAPER: Record<PaperSize, { format: 'a4' | 'letter' | 'a3'; label: string }> = {
  a4: { format: 'a4', label: 'A4' },
  letter: { format: 'letter', label: 'US Letter' },
  a3: { format: 'a3', label: 'A3' }
};

export function paperSizeLabel(size: PaperSize) {
  return PAPER[size].label;
}

export function buildMonthlyReportPdf(report: MonthlyReportDetail, paper: PaperSize = 'a4'): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: PAPER[paper].format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = paper === 'a3' ? 18 : 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const money = (n: number) => formatCurrency(n, report.currency);
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header bar
  doc.setFillColor(31, 37, 68);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Finlo Monthly Report', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(report.label, margin, 20);
  doc.text(report.householdName, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Generated ${format(parseISO(report.generatedAt), 'MMM d, yyyy HH:mm')}`, pageWidth - margin, 20, {
    align: 'right'
  });

  y = 36;
  doc.setTextColor(31, 37, 68);

  // Summary cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Month summary', margin, y);
  y += 6;

  const cardW = (contentWidth - 6) / 3;
  const cards = [
    { label: 'Income', value: money(report.income), color: [111, 159, 99] as const },
    { label: 'Expenses', value: money(report.expenses), color: [58, 157, 157] as const },
    { label: 'Net cash', value: money(report.net), color: report.net >= 0 ? ([111, 159, 99] as const) : ([220, 38, 38] as const) }
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);
    doc.setDrawColor(200, 205, 220);
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(91, 100, 122);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + 3, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + 3, y + 13);
  });

  y += 24;
  doc.setTextColor(31, 37, 68);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${report.transactionCount} transactions recorded this month`, margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Tracked investments: ${money(report.investmentValue)}   •   Current net worth: ${money(report.trackedNetWorth)}`, margin, y);
  y += 8;

  // Category breakdown
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Top expense categories', margin, y);
  y += 5;

  if (report.categories.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(91, 100, 122);
    doc.text('No categorized expenses this month.', margin, y);
    y += 8;
    doc.setTextColor(31, 37, 68);
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(91, 100, 122);
    doc.text('Category', margin, y);
    doc.text('Amount', margin + contentWidth * 0.62, y);
    doc.text('Share', pageWidth - margin, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(220, 224, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    report.categories.forEach((row) => {
      ensureSpace(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 37, 68);
      doc.text(truncate(row.name, 40), margin, y);
      doc.text(money(row.amount), margin + contentWidth * 0.62, y);
      doc.text(`${(row.share * 100).toFixed(0)}%`, pageWidth - margin, y, { align: 'right' });
      y += 6;
    });
  }

  y += 4;

  // Top expenses
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 37, 68);
  doc.text('Largest expenses', margin, y);
  y += 6;
  y = drawTxnTable(doc, report.topExpenses, money, margin, pageWidth, y, ensureSpace);

  y += 4;
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Largest income', margin, y);
  y += 6;
  y = drawTxnTable(doc, report.topIncome, money, margin, pageWidth, y, ensureSpace);

  // Accounts
  if (report.accounts.length > 0) {
    y += 4;
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 37, 68);
    doc.text('Account activity', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(91, 100, 122);
    doc.text('Account', margin, y);
    doc.text('In', margin + contentWidth * 0.45, y);
    doc.text('Out', margin + contentWidth * 0.68, y);
    doc.text('Net', pageWidth - margin, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(220, 224, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    report.accounts.forEach((row) => {
      ensureSpace(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 37, 68);
      doc.text(truncate(row.name, 28), margin, y);
      doc.text(money(row.inflow), margin + contentWidth * 0.45, y);
      doc.text(money(row.outflow), margin + contentWidth * 0.68, y);
      doc.text(money(row.net), pageWidth - margin, y, { align: 'right' });
      y += 6;
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 148, 168);
    doc.text(`Finlo · ${report.label} · ${PAPER[paper].label}`, margin, pageHeight - 8);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

function drawTxnTable(
  doc: jsPDF,
  rows: Array<{ date: string; name: string; amount: number; category: string }>,
  money: (n: number) => string,
  margin: number,
  pageWidth: number,
  y: number,
  ensureSpace: (n: number) => void
) {
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(91, 100, 122);
    doc.text('None this month.', margin, y);
    return y + 8;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(91, 100, 122);
  doc.text('Date', margin, y);
  doc.text('Description', margin + 24, y);
  doc.text('Category', margin + 95, y);
  doc.text('Amount', pageWidth - margin, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(220, 224, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  rows.forEach((row) => {
    ensureSpace(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 37, 68);
    doc.text(row.date, margin, y);
    doc.text(truncate(row.name, 36), margin + 24, y);
    doc.text(truncate(row.category, 18), margin + 95, y);
    doc.text(money(row.amount), pageWidth - margin, y, { align: 'right' });
    y += 6;
  });

  return y;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function pdfToBlob(doc: jsPDF): Blob {
  return doc.output('blob');
}

export function downloadMonthlyReport(report: MonthlyReportDetail, paper: PaperSize = 'a4') {
  const doc = buildMonthlyReportPdf(report, paper);
  doc.save(`finlo-report-${report.key}.pdf`);
}

export async function printMonthlyReport(report: MonthlyReportDetail, paper: PaperSize) {
  const doc = buildMonthlyReportPdf(report, paper);
  const blob = pdfToBlob(doc);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  document.body.appendChild(frame);

  await new Promise<void>((resolve, reject) => {
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        setTimeout(() => {
          document.body.removeChild(frame);
          URL.revokeObjectURL(url);
        }, 1500);
      }
    };
    frame.onerror = () => reject(new Error('Could not load PDF for printing.'));
  });
}
