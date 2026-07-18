import { HouseholdsRepository } from './HouseholdsRepository';
import type { Json } from '@/types/finance';
import type { DebtAccount, DebtAccountInput, DebtCenterState, DebtSimulationSettings } from '@/types/debt';
import { toMinor } from '@/core/debt';

const STORAGE_PREFIX = 'finlo.debtCenter.';

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function defaultSettings(): DebtSimulationSettings {
  const now = new Date();
  return {
    strategy: 'avalanche',
    start_month: now.getMonth(),
    start_year: now.getFullYear(),
    extra_payment_minor: toMinor(300),
    custom_order: [],
    saved_at: null
  };
}

/** Demo debts matching the Debt Center mockup totals (~$28,450). */
export function createDemoDebts(householdId: string, userId: string): DebtAccount[] {
  const stamp = nowIso();
  return [
    {
      id: createId(),
      household_id: householdId,
      user_id: userId,
      name: 'Credit Card Visa',
      type: 'credit_card',
      balance_minor: toMinor(4500),
      original_balance_minor: toMinor(5200),
      apr_percent: 24.99,
      minimum_payment_minor: toMinor(150),
      monthly_payment_minor: toMinor(150),
      due_day: 15,
      extra_payment_allowed: true,
      lender: 'Chase',
      linked_account_id: null,
      notes: null,
      custom_order: 0,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    },
    {
      id: createId(),
      household_id: householdId,
      user_id: userId,
      name: 'Personal Loan',
      type: 'personal_loan',
      balance_minor: toMinor(8200),
      original_balance_minor: toMinor(10000),
      apr_percent: 11.5,
      minimum_payment_minor: toMinor(280),
      monthly_payment_minor: toMinor(280),
      due_day: 1,
      extra_payment_allowed: true,
      lender: 'SoFi',
      linked_account_id: null,
      notes: null,
      custom_order: 1,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    },
    {
      id: createId(),
      household_id: householdId,
      user_id: userId,
      name: 'Car Loan',
      type: 'car_loan',
      balance_minor: toMinor(9800),
      original_balance_minor: toMinor(18000),
      apr_percent: 6.9,
      minimum_payment_minor: toMinor(320),
      monthly_payment_minor: toMinor(320),
      due_day: 20,
      extra_payment_allowed: true,
      lender: 'Toyota Financial',
      linked_account_id: null,
      notes: null,
      custom_order: 2,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    },
    {
      id: createId(),
      household_id: householdId,
      user_id: userId,
      name: 'Student Loan',
      type: 'student_loan',
      balance_minor: toMinor(5950),
      original_balance_minor: toMinor(12000),
      apr_percent: 5.2,
      minimum_payment_minor: toMinor(200),
      monthly_payment_minor: toMinor(200),
      due_day: 5,
      extra_payment_allowed: true,
      lender: 'Dept of Education',
      linked_account_id: null,
      notes: null,
      custom_order: 3,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    }
  ];
}

function readLocal(householdId: string): DebtCenterState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + householdId);
    if (!raw) return null;
    return JSON.parse(raw) as DebtCenterState;
  } catch {
    return null;
  }
}

function writeLocal(householdId: string, state: DebtCenterState) {
  localStorage.setItem(STORAGE_PREFIX + householdId, JSON.stringify(state));
}

function normalizeState(raw: unknown, householdId: string, userId: string): DebtCenterState {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Partial<DebtCenterState>;
  const settings = { ...defaultSettings(), ...(record.settings ?? {}) };
  let debts = Array.isArray(record.debts) ? (record.debts as DebtAccount[]) : [];

  if (debts.length === 0) {
    debts = createDemoDebts(householdId, userId);
  }

  return { debts, settings };
}

async function loadRemote(householdId: string): Promise<unknown> {
  const { data, error } = await (await import('@/data/supabase/client')).supabase
    .from('households')
    .select('metadata')
    .eq('id', householdId)
    .maybeSingle();

  if (error || !data) return null;
  const metadata = asRecord(data.metadata as Json);
  return metadata.debtCenter ?? null;
}

async function saveRemote(householdId: string, state: DebtCenterState): Promise<void> {
  const household = await (await import('@/data/supabase/client')).supabase
    .from('households')
    .select('metadata')
    .eq('id', householdId)
    .maybeSingle();

  const metadata = asRecord((household.data?.metadata ?? {}) as Json);
  await HouseholdsRepository.updateMetadata(householdId, {
    ...metadata,
    debtCenter: state
  } as Json);
}

export const DebtsRepository = {
  async getState(householdId: string, userId: string): Promise<DebtCenterState> {
    const local = readLocal(householdId);
    try {
      const remote = await loadRemote(householdId);
      if (remote) {
        const state = normalizeState(remote, householdId, userId);
        writeLocal(householdId, state);
        return state;
      }
    } catch {
      // Fall through to local / demo seed
    }

    if (local) {
      return normalizeState(local, householdId, userId);
    }

    const seeded = normalizeState(null, householdId, userId);
    writeLocal(householdId, seeded);
    try {
      await saveRemote(householdId, seeded);
    } catch {
      // Local-only until network is available
    }
    return seeded;
  },

  async list(householdId: string, userId: string): Promise<DebtAccount[]> {
    const state = await this.getState(householdId, userId);
    return state.debts.filter((d) => !d.deleted_at);
  },

  async getSettings(householdId: string, userId: string): Promise<DebtSimulationSettings> {
    const state = await this.getState(householdId, userId);
    return state.settings;
  },

  async saveSettings(householdId: string, userId: string, settings: Partial<DebtSimulationSettings>): Promise<DebtSimulationSettings> {
    const state = await this.getState(householdId, userId);
    state.settings = {
      ...state.settings,
      ...settings,
      saved_at: settings.saved_at === undefined ? state.settings.saved_at : settings.saved_at
    };
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local cache remains */
    }
    return state.settings;
  },

  async create(input: DebtAccountInput): Promise<DebtAccount> {
    const state = await this.getState(input.household_id, input.user_id);
    const stamp = nowIso();
    const debt: DebtAccount = {
      id: createId(),
      household_id: input.household_id,
      user_id: input.user_id,
      name: input.name,
      type: input.type,
      balance_minor: input.balance_minor,
      original_balance_minor: input.original_balance_minor ?? input.balance_minor,
      apr_percent: input.apr_percent,
      minimum_payment_minor: input.minimum_payment_minor,
      monthly_payment_minor: input.monthly_payment_minor,
      due_day: input.due_day ?? null,
      extra_payment_allowed: input.extra_payment_allowed ?? true,
      lender: input.lender ?? null,
      linked_account_id: input.linked_account_id ?? null,
      notes: input.notes ?? null,
      custom_order: input.custom_order ?? state.debts.length,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    };
    state.debts = [...state.debts, debt];
    writeLocal(input.household_id, state);
    try {
      await saveRemote(input.household_id, state);
    } catch {
      /* local */
    }
    return debt;
  },

  async update(householdId: string, userId: string, debtId: string, patch: Partial<DebtAccountInput>): Promise<DebtAccount> {
    const state = await this.getState(householdId, userId);
    const index = state.debts.findIndex((d) => d.id === debtId);
    if (index < 0) throw new Error('Debt not found');

    const current = state.debts[index];
    const updated: DebtAccount = {
      ...current,
      name: patch.name ?? current.name,
      type: patch.type ?? current.type,
      balance_minor: patch.balance_minor ?? current.balance_minor,
      original_balance_minor: patch.original_balance_minor ?? current.original_balance_minor,
      apr_percent: patch.apr_percent ?? current.apr_percent,
      minimum_payment_minor: patch.minimum_payment_minor ?? current.minimum_payment_minor,
      monthly_payment_minor: patch.monthly_payment_minor ?? current.monthly_payment_minor,
      due_day: patch.due_day === undefined ? current.due_day : patch.due_day,
      extra_payment_allowed: patch.extra_payment_allowed ?? current.extra_payment_allowed,
      lender: patch.lender === undefined ? current.lender : patch.lender,
      linked_account_id: patch.linked_account_id === undefined ? current.linked_account_id : patch.linked_account_id,
      notes: patch.notes === undefined ? current.notes : patch.notes,
      custom_order: patch.custom_order ?? current.custom_order,
      updated_at: nowIso()
    };
    state.debts[index] = updated;
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local */
    }
    return updated;
  },

  async reorder(householdId: string, userId: string, orderedIds: string[]): Promise<DebtAccount[]> {
    const state = await this.getState(householdId, userId);
    state.debts = state.debts.map((debt) => {
      const order = orderedIds.indexOf(debt.id);
      return order >= 0 ? { ...debt, custom_order: order, updated_at: nowIso() } : debt;
    });
    state.settings.custom_order = orderedIds;
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local */
    }
    return state.debts.filter((d) => !d.deleted_at);
  },

  async markPaidOff(
    householdId: string,
    userId: string,
    debtId: string,
    meta: { paid_off_at: string; total_interest_paid_minor: number; months_taken: number }
  ): Promise<DebtAccount> {
    const state = await this.getState(householdId, userId);
    const index = state.debts.findIndex((d) => d.id === debtId);
    if (index < 0) throw new Error('Debt not found');

    state.debts[index] = {
      ...state.debts[index],
      status: 'paid_off',
      balance_minor: 0,
      paid_off_at: meta.paid_off_at,
      total_interest_paid_minor: meta.total_interest_paid_minor,
      months_taken: meta.months_taken,
      updated_at: nowIso()
    };
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local */
    }
    return state.debts[index];
  },

  async archive(householdId: string, userId: string, debtId: string): Promise<DebtAccount> {
    const state = await this.getState(householdId, userId);
    const index = state.debts.findIndex((d) => d.id === debtId);
    if (index < 0) throw new Error('Debt not found');
    state.debts[index] = { ...state.debts[index], status: 'archived', updated_at: nowIso() };
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local */
    }
    return state.debts[index];
  },

  async remove(householdId: string, userId: string, debtId: string): Promise<void> {
    const state = await this.getState(householdId, userId);
    const index = state.debts.findIndex((d) => d.id === debtId);
    if (index < 0) return;
    state.debts[index] = { ...state.debts[index], deleted_at: nowIso(), updated_at: nowIso() };
    writeLocal(householdId, state);
    try {
      await saveRemote(householdId, state);
    } catch {
      /* local */
    }
  },

  async saveSimulation(householdId: string, userId: string, settings: DebtSimulationSettings): Promise<DebtSimulationSettings> {
    return this.saveSettings(householdId, userId, { ...settings, saved_at: nowIso() });
  }
};
