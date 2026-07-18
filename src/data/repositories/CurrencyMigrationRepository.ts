import { supabase } from '@/data/supabase/client';
import { FxRepository } from '@/data/repositories/FxRepository';
import { throwDatabaseError } from './repositoryError';

const LOCAL_INSTANCES_KEY = 'finlo.recurring.instances.';

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundMinor(value: number) {
  return Math.round(value);
}

async function scaleRows(
  table: string,
  householdId: string,
  columns: string[],
  rate: number,
  options?: { minor?: boolean; alsoSetCurrency?: string }
) {
  const selectCols = ['id', ...columns].join(', ');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from as any)(table).select(selectCols).eq('household_id', householdId);
  // Soft-delete aware when column exists on table
  if (['transactions', 'accounts', 'recurring_rules', 'debts'].includes(table)) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    // Table may not exist in older projects — skip quietly when missing
    if (
      error.code === '42P01' ||
      error.code === '42703' ||
      error.message?.toLowerCase().includes('does not exist')
    ) {
      return;
    }
    throwDatabaseError(`Failed to load ${table} for currency conversion`, error);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  for (const row of rows) {
    const patch: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      patch[col] = options?.minor ? roundMinor(raw * rate) : roundMoney(raw * rate);
    }
    if (options?.alsoSetCurrency) {
      patch.currency = options.alsoSetCurrency;
    }
    if (Object.keys(patch).length === 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from as any)(table).update(patch).eq('id', row.id as string);
    if (updateError) {
      throwDatabaseError(`Failed to convert ${table} amounts`, updateError);
    }
  }
}

function convertLocalRecurringInstances(householdId: string, rate: number, toCurrency: string) {
  try {
    const key = LOCAL_INSTANCES_KEY + householdId;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const instances = JSON.parse(raw) as Array<Record<string, unknown>>;
    const next = instances.map((row) => ({
      ...row,
      amount: typeof row.amount === 'number' ? roundMoney(row.amount * rate) : row.amount,
      currency: toCurrency
    }));
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function scaleMinorFields<T extends Record<string, unknown>>(row: T, fields: string[], rate: number): T {
  const next = { ...row };
  for (const field of fields) {
    const raw = next[field];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      (next as Record<string, unknown>)[field] = roundMinor(raw * rate);
    }
  }
  return next;
}

const DEBT_MINOR_FIELDS = [
  'balance_minor',
  'original_balance_minor',
  'minimum_payment_minor',
  'monthly_payment_minor',
  'total_interest_paid_minor'
];

async function convertDebtCenterMetadata(householdId: string, rate: number) {
  const localKey = `finlo.debtCenter.${householdId}`;

  const scaleState = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return raw;
    const state = raw as { debts?: Array<Record<string, unknown>>; settings?: Record<string, unknown> };
    return {
      ...state,
      debts: Array.isArray(state.debts)
        ? state.debts.map((debt) => scaleMinorFields(debt, DEBT_MINOR_FIELDS, rate))
        : state.debts,
      settings: state.settings
        ? scaleMinorFields(state.settings, ['extra_payment_minor'], rate)
        : state.settings
    };
  };

  try {
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      localStorage.setItem(localKey, JSON.stringify(scaleState(JSON.parse(localRaw))));
    }
  } catch {
    // ignore
  }

  const { data, error } = await supabase.from('households').select('metadata').eq('id', householdId).maybeSingle();
  if (error || !data) return;

  const metadata = (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    ? data.metadata
    : {}) as Record<string, unknown>;

  if (!metadata.debtCenter) return;

  const { error: updateError } = await supabase
    .from('households')
    .update({
      metadata: {
        ...metadata,
        debtCenter: scaleState(metadata.debtCenter)
      }
    })
    .eq('id', householdId);

  if (updateError) {
    throwDatabaseError('Failed to convert debt center amounts', updateError);
  }
}

/**
 * Converts all household monetary amounts from `fromCurrency` → `toCurrency`
 * using live FX rates, then updates profile + household currency labels.
 */
export const CurrencyMigrationRepository = {
  async convertHousehold(params: {
    householdId: string;
    userId: string;
    fromCurrency: string;
    toCurrency: string;
    onProgress?: (message: string) => void;
  }) {
    const from = params.fromCurrency.trim().toUpperCase();
    const to = params.toCurrency.trim().toUpperCase();
    if (!from || !to || from === to) {
      return { rate: 1, from, to };
    }

    params.onProgress?.('Fetching live exchange rates…');
    const fx = await FxRepository.getRates(from);
    const converted = FxRepository.convert(1, from, to, fx);
    if (converted == null || !Number.isFinite(converted) || converted <= 0) {
      throw new Error(`Could not convert ${from} to ${to}. Try another currency.`);
    }
    const rate = converted;

    params.onProgress?.('Converting transactions…');
    await scaleRows('transactions', params.householdId, ['amount'], rate);

    params.onProgress?.('Converting accounts…');
    await scaleRows('accounts', params.householdId, ['opening_balance'], rate, {
      alsoSetCurrency: to
    });

    params.onProgress?.('Converting recurring payments…');
    await scaleRows('recurring_rules', params.householdId, ['amount'], rate, { alsoSetCurrency: to });
    await scaleRows('recurring_payment_instances', params.householdId, ['amount'], rate, { alsoSetCurrency: to });
    convertLocalRecurringInstances(params.householdId, rate, to);

    params.onProgress?.('Converting debts…');
    await scaleRows(
      'debts',
      params.householdId,
      ['balance_minor', 'original_balance_minor', 'minimum_payment_minor', 'monthly_payment_minor', 'total_interest_paid_minor'],
      rate,
      { minor: true }
    );
    await convertDebtCenterMetadata(params.householdId, rate);

    // Best-effort optional tables from older schema
    params.onProgress?.('Converting related balances…');
    await scaleRows('expected_transactions', params.householdId, ['expected_amount'], rate);
    await scaleRows('subscriptions', params.householdId, ['amount'], rate);
    await scaleRows('bills', params.householdId, ['amount'], rate);
    await scaleRows('income_sources', params.householdId, ['amount'], rate);

    params.onProgress?.('Updating household currency…');
    const { error: householdError } = await supabase
      .from('households')
      .update({ default_currency: to })
      .eq('id', params.householdId);

    if (householdError) {
      throwDatabaseError('Failed to update household currency', householdError);
    }

    const { error: profileError } = await supabase.from('profiles').update({ currency: to }).eq('id', params.userId);
    if (profileError) {
      throwDatabaseError('Failed to update profile currency', profileError);
    }

    return { rate, from, to };
  }
};
