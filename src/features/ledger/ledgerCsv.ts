import type { TransactionInput } from '@/data/repositories';

export type LedgerCsvRow = {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  duplicate: boolean;
  errors: string[];
  import_hash: string;
};

export function parseLedgerCsv(text: string): LedgerCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = splitLine(lines[0] ?? '').map((header) => header.trim().toLowerCase());
  const seen = new Set<string>();

  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    const row = headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index]?.trim() ?? '';
      return record;
    }, {});
    const amount = Number(row.amount ?? row.value ?? 'NaN');
    const date = row.date ?? '';
    const description = row.description ?? row.memo ?? row.merchant ?? '';
    const import_hash = `${date}|${description}|${amount}`.toLowerCase();
    const duplicate = seen.has(import_hash);
    const errors: string[] = [];

    seen.add(import_hash);
    if (!date) errors.push('Missing date');
    if (!description) errors.push('Missing description');
    if (Number.isNaN(amount)) errors.push('Invalid amount');

    return {
      date,
      description,
      amount: Math.abs(amount),
      type: amount >= 0 ? 'income' : 'expense',
      duplicate,
      errors,
      import_hash
    };
  });
}

export function toTransactionInput(row: LedgerCsvRow, base: Pick<TransactionInput, 'household_id' | 'user_id' | 'account_id' | 'import_batch_id'>): TransactionInput {
  return {
    ...base,
    amount: row.amount,
    type: row.type,
    date: row.date,
    description: row.description,
    import_hash: row.import_hash,
    import_source: 'csv'
  };
}

function splitLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}
