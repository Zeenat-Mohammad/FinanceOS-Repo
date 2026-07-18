export type CsvMapping = {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
};

export type CsvPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: {
    date?: string;
    description?: string;
    amount?: number;
    category?: string;
  };
  duplicate: boolean;
  errors: string[];
};

export type CsvSummary = {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
};

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index]?.trim() ?? '';
      return row;
    }, {});
  });

  return { headers, rows };
}

export function buildCsvPreview(rows: Record<string, string>[], mapping: CsvMapping): { preview: CsvPreviewRow[]; summary: CsvSummary } {
  const seen = new Set<string>();
  const preview = rows.map((row, index) => {
    const normalized = {
      date: mapping.date ? row[mapping.date] : undefined,
      description: mapping.description ? row[mapping.description] : undefined,
      amount: mapping.amount ? Number(row[mapping.amount]) : undefined,
      category: mapping.category ? row[mapping.category] : undefined
    };
    const errors: string[] = [];

    if (!normalized.date) errors.push('Missing date');
    if (!normalized.description) errors.push('Missing description');
    if (normalized.amount === undefined || Number.isNaN(normalized.amount)) errors.push('Invalid amount');

    const key = `${normalized.date ?? ''}|${normalized.description ?? ''}|${normalized.amount ?? ''}`.toLowerCase();
    const duplicate = seen.has(key);
    seen.add(key);

    return {
      rowNumber: index + 2,
      raw: row,
      normalized,
      duplicate,
      errors
    };
  });

  return {
    preview,
    summary: {
      totalRows: preview.length,
      validRows: preview.filter((row) => row.errors.length === 0 && !row.duplicate).length,
      duplicateRows: preview.filter((row) => row.duplicate).length,
      invalidRows: preview.filter((row) => row.errors.length > 0).length
    }
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}
