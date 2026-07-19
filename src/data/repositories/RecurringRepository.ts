import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/data/supabase/client';
import type { Bill, ExpectedTransaction, RecurringRule } from '@/types/database';
import type { Json } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';
import { TransactionsRepository } from './TransactionsRepository';
import {
  PaymentEngine,
  type PaymentInstance,
  type RecurringKind
} from '@/core/recurring';

export type RecurringRuleInput = {
  household_id: string;
  account_id?: string | null;
  category_id?: string | null;
  name: string;
  transaction_type: RecurringRule['transaction_type'];
  amount?: number | null;
  currency: string;
  cadence: RecurringRule['cadence'];
  interval_count?: number;
  starts_on: string;
  next_occurrence_on?: string | null;
  ends_on?: string | null;
  status?: RecurringRule['status'];
  day_of_month?: number | null;
  reminder_enabled?: boolean;
  reminder_date?: string | null;
  reminder_time?: string | null;
  reminder_email?: string | null;
  reminder_status?: RecurringRule['reminder_status'];
  reminder_next_send_at?: string | null;
  metadata?: Json;
};

const LOCAL_INSTANCES_KEY = 'finlo.recurring.instances.';

function readLocalInstances(householdId: string): PaymentInstance[] {
  try {
    const raw = localStorage.getItem(LOCAL_INSTANCES_KEY + householdId);
    return raw ? (JSON.parse(raw) as PaymentInstance[]) : [];
  } catch {
    return [];
  }
}

function writeLocalInstances(householdId: string, instances: PaymentInstance[]) {
  localStorage.setItem(LOCAL_INSTANCES_KEY + householdId, JSON.stringify(instances));
}

function mapRow(row: Record<string, unknown>): PaymentInstance {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    recurring_rule_id: String(row.recurring_rule_id),
    transaction_id: (row.transaction_id as string) ?? null,
    scheduled_date: String(row.scheduled_date),
    paid_date: (row.paid_date as string) ?? null,
    status: row.status as PaymentInstance['status'],
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'USD'),
    name: String(row.name),
    transaction_type: row.transaction_type as PaymentInstance['transaction_type'],
    metadata: (row.metadata as Json) ?? {}
  };
}

export const RecurringRepository = {
  async listRules(): Promise<RecurringRule[]> {
    const { data, error } = await supabase.from('recurring_rules').select('*').is('deleted_at', null).order('next_occurrence_on');

    if (error) throwDatabaseError('Failed to load recurring rules', error);

    return (data ?? []) as RecurringRule[];
  },

  async createRule(input: RecurringRuleInput): Promise<RecurringRule> {
    const { data, error } = await supabase
      .from('recurring_rules')
      .insert({
        ...input,
        status: input.status ?? 'active',
        interval_count: input.interval_count ?? 1,
        next_occurrence_on: input.next_occurrence_on ?? input.starts_on,
        metadata: input.metadata ?? {}
      })
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to create recurring rule', error);

    return data as RecurringRule;
  },

  async updateRule(ruleId: string, input: Partial<RecurringRuleInput>): Promise<RecurringRule> {
    const { data, error } = await supabase.from('recurring_rules').update(input).eq('id', ruleId).select('*').single();
    if (error) throwDatabaseError('Failed to update recurring rule', error);
    return data as RecurringRule;
  },

  async pauseRule(ruleId: string): Promise<RecurringRule> {
    return this.updateRule(ruleId, { status: 'paused' });
  },

  async resumeRule(ruleId: string): Promise<RecurringRule> {
    return this.updateRule(ruleId, { status: 'active' });
  },

  async completeRule(ruleId: string): Promise<RecurringRule> {
    return this.updateRule(ruleId, { status: 'ended' });
  },

  async removeRule(ruleId: string): Promise<void> {
    const { error } = await supabase.from('recurring_rules').update({ deleted_at: new Date().toISOString(), status: 'ended' }).eq('id', ruleId);
    if (error) throwDatabaseError('Failed to delete recurring rule', error);
  },

  async listBills(): Promise<Bill[]> {
    const { data, error } = await supabase.from('bills').select('*').is('deleted_at', null).order('due_day');
    if (error) throwDatabaseError('Failed to load recurring bills', error);
    return (data ?? []) as Bill[];
  },

  async listExpected(): Promise<ExpectedTransaction[]> {
    const { data, error } = await supabase.from('expected_transactions').select('*').is('deleted_at', null).order('expected_date');
    if (error) throwDatabaseError('Failed to load expected transactions', error);
    return (data ?? []) as ExpectedTransaction[];
  },

  async listInstances(householdId: string, start: string, end: string): Promise<PaymentInstance[]> {
    try {
      const { data, error } = await supabase
        .from('recurring_payment_instances')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date');

      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
    } catch {
      return readLocalInstances(householdId).filter((i) => i.scheduled_date >= start && i.scheduled_date <= end);
    }
  },

  async ensureHorizon(householdId: string, rules: RecurringRule[], monthsAhead = 3): Promise<PaymentInstance[]> {
    const start = startOfMonth(new Date());
    const end = endOfMonth(addMonths(new Date(), monthsAhead));
    const existing = await this.listInstances(householdId, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    const virtual = PaymentEngine.buildVirtualInstances(rules, start, end, existing);

    const missing = virtual.filter((v) => v.id.startsWith('virtual-'));
    if (missing.length === 0) return virtual.map((v) => (v.id.startsWith('virtual-') ? v : v));

    const toPersist = missing.map((m) => ({
      household_id: householdId,
      recurring_rule_id: m.recurring_rule_id,
      scheduled_date: m.scheduled_date,
      status: m.status === 'overdue' ? 'pending' : m.status,
      amount: m.amount,
      currency: m.currency,
      name: m.name,
      transaction_type: m.transaction_type,
      metadata: {}
    }));

    try {
      const { data, error } = await supabase.from('recurring_payment_instances').upsert(toPersist, {
        onConflict: 'recurring_rule_id,scheduled_date',
        ignoreDuplicates: true
      }).select('*');

      if (error) throw error;
      const persisted = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
      const merged = PaymentEngine.buildVirtualInstances(rules, start, end, [...existing, ...persisted]);
      return merged;
    } catch {
      const local = readLocalInstances(householdId);
      const byKey = new Map(local.map((i) => [`${i.recurring_rule_id}:${i.scheduled_date}`, i]));
      for (const m of missing) {
        const key = `${m.recurring_rule_id}:${m.scheduled_date}`;
        if (!byKey.has(key)) {
          const saved: PaymentInstance = {
            ...m,
            id: crypto.randomUUID()
          };
          byKey.set(key, saved);
        }
      }
      const next = [...byKey.values()];
      writeLocalInstances(householdId, next);
      return PaymentEngine.buildVirtualInstances(rules, start, end, next);
    }
  },

  async markPaid(params: {
    householdId: string;
    userId: string;
    instance: PaymentInstance;
    rule: RecurringRule;
  }): Promise<{ instance: PaymentInstance; transactionId: string }> {
    const { householdId, userId, instance, rule } = params;
    if (!rule.account_id) {
      throw new Error('Recurring item needs an account before it can be marked paid.');
    }

    const meta = PaymentEngine.getRecurringMeta(rule);
    const paidDate = format(new Date(), 'yyyy-MM-dd');

    const transaction = await TransactionsRepository.create({
      household_id: householdId,
      user_id: userId,
      account_id: rule.account_id,
      category_id: rule.category_id ?? null,
      amount: instance.amount,
      type: rule.transaction_type === 'transfer' ? 'transfer' : rule.transaction_type,
      date: instance.scheduled_date,
      status: 'posted',
      merchant: rule.name,
      description: meta.description || `Recurring: ${rule.name}`,
      metadata: {
        recurring_rule_id: rule.id,
        recurring_instance_id: instance.id,
        source: 'recurring'
      }
    });

    const nextDue = PaymentEngine.nextOccurrenceAfter(instance.scheduled_date, rule.cadence, rule.interval_count || 1);
    await this.updateRule(rule.id, { next_occurrence_on: format(nextDue, 'yyyy-MM-dd') });

    const updated: PaymentInstance = {
      ...instance,
      status: 'paid',
      paid_date: paidDate,
      transaction_id: transaction.id
    };

    try {
      if (instance.id.startsWith('virtual-')) {
        const { data, error } = await supabase
          .from('recurring_payment_instances')
          .upsert(
            {
              household_id: householdId,
              recurring_rule_id: rule.id,
              scheduled_date: instance.scheduled_date,
              paid_date: paidDate,
              status: 'paid',
              amount: instance.amount,
              currency: instance.currency,
              name: instance.name,
              transaction_type: instance.transaction_type,
              transaction_id: transaction.id
            },
            { onConflict: 'recurring_rule_id,scheduled_date' }
          )
          .select('*')
          .single();
        if (error) throw error;
        return { instance: mapRow(data as Record<string, unknown>), transactionId: transaction.id };
      }

      const { data, error } = await supabase
        .from('recurring_payment_instances')
        .update({
          status: 'paid',
          paid_date: paidDate,
          transaction_id: transaction.id
        })
        .eq('id', instance.id)
        .select('*')
        .single();
      if (error) throw error;
      return { instance: mapRow(data as Record<string, unknown>), transactionId: transaction.id };
    } catch {
      const local = readLocalInstances(householdId);
      const idx = local.findIndex((i) => i.recurring_rule_id === rule.id && i.scheduled_date === instance.scheduled_date);
      const saved = { ...updated, id: idx >= 0 ? local[idx].id : crypto.randomUUID() };
      if (idx >= 0) local[idx] = saved;
      else local.push(saved);
      writeLocalInstances(householdId, local);
      return { instance: saved, transactionId: transaction.id };
    }
  },

  async skipInstance(householdId: string, instance: PaymentInstance): Promise<PaymentInstance> {
    const updated: PaymentInstance = { ...instance, status: 'skipped' };
    try {
      if (!instance.id.startsWith('virtual-')) {
        const { data, error } = await supabase
          .from('recurring_payment_instances')
          .update({ status: 'skipped' })
          .eq('id', instance.id)
          .select('*')
          .single();
        if (error) throw error;
        return mapRow(data as Record<string, unknown>);
      }
      const { data, error } = await supabase
        .from('recurring_payment_instances')
        .upsert(
          {
            household_id: householdId,
            recurring_rule_id: instance.recurring_rule_id,
            scheduled_date: instance.scheduled_date,
            status: 'skipped',
            amount: instance.amount,
            currency: instance.currency,
            name: instance.name,
            transaction_type: instance.transaction_type
          },
          { onConflict: 'recurring_rule_id,scheduled_date' }
        )
        .select('*')
        .single();
      if (error) throw error;
      return mapRow(data as Record<string, unknown>);
    } catch {
      const local = readLocalInstances(householdId);
      const idx = local.findIndex((i) => i.recurring_rule_id === instance.recurring_rule_id && i.scheduled_date === instance.scheduled_date);
      const saved = { ...updated, id: idx >= 0 ? local[idx].id : crypto.randomUUID() };
      if (idx >= 0) local[idx] = saved;
      else local.push(saved);
      writeLocalInstances(householdId, local);
      return saved;
    }
  }
};

export type CreateRecurringPayload = {
  name: string;
  transaction_type: 'income' | 'expense';
  category_id: string | null;
  account_id: string | null;
  amount: number;
  currency: string;
  cadence: RecurringRule['cadence'];
  starts_on: string;
  next_occurrence_on: string;
  reminder_days: number;
  reminder_enabled: boolean;
  reminder_date?: string | null;
  reminder_time: string;
  reminder_email?: string | null;
  auto_create_transaction: boolean;
  kind: RecurringKind;
  description?: string;
};

export function buildRuleMetadata(
  meta: {
    kind?: RecurringKind;
    reminder_days?: number;
    reminder_enabled?: boolean;
    reminder_date?: string | null;
    reminder_time?: string;
    reminder_email?: string | null;
    auto_create_transaction?: boolean;
    description?: string;
  }
): Json {
  return {
    kind: meta.kind ?? 'bill',
    reminder_days: meta.reminder_days ?? 3,
    reminder_enabled: meta.reminder_enabled ?? false,
    reminder_date: meta.reminder_date ?? null,
    reminder_time: meta.reminder_time ?? '09:00',
    reminder_email: meta.reminder_email ?? null,
    auto_create_transaction: meta.auto_create_transaction !== false,
    description: meta.description ?? ''
  };
}

export type { PaymentInstance, RecurringKind };
