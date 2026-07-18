import { addDays, differenceInCalendarDays, endOfMonth, format, getDate, startOfMonth, subDays } from 'date-fns';
import { supabase } from '@/data/supabase/client';
import { AccountsRepository } from '@/data/repositories/AccountsRepository';
import { TransactionsRepository } from '@/data/repositories/TransactionsRepository';
import { CategoriesRepository } from '@/data/repositories/CategoriesRepository';
import { selectExpense, selectIncome } from '@/core/ledger/selectors';
import type { ChallengeDay, SavingsBundle, SavingsChallenge } from '@/types/wealth';
import type { Transaction } from '@/types/finance';

const LOCAL_CHALLENGES = 'finlo.savings.challenges.';
const LOCAL_DAYS = 'finlo.savings.days.';
const LOCAL_RANDOM_DAYS = 'finlo.savings.random-days.';
const LOCAL_CHALLENGE_DAYS = 'finlo.savings.challenge-days.';
const LOCAL_GOAL = 'finlo.savings.goal.';

const PRESETS: Array<Omit<SavingsChallenge, 'id' | 'household_id' | 'user_id' | 'created_at' | 'status'>> = [
  { name: 'No Coffee', average_cost: 150, frequency: 'daily', target_days: 30, expected_savings: 4500, start_date: format(subDays(new Date(), 18), 'yyyy-MM-dd'), end_date: null, difficulty: 'easy' },
  { name: 'No Swiggy', average_cost: 350, frequency: 'daily', target_days: 21, expected_savings: 7350, start_date: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end_date: null, difficulty: 'medium' },
  { name: 'No Amazon', average_cost: 800, frequency: 'weekly', target_days: 60, expected_savings: 6400, start_date: format(subDays(new Date(), 12), 'yyyy-MM-dd'), end_date: null, difficulty: 'hard' },
  { name: 'No Uber', average_cost: 220, frequency: 'daily', target_days: 20, expected_savings: 4400, start_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), end_date: null, difficulty: 'medium' },
  { name: 'No Shopping', average_cost: 500, frequency: 'weekly', target_days: 45, expected_savings: 3000, start_date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), end_date: null, difficulty: 'hard' },
  { name: 'No Junk Food', average_cost: 180, frequency: 'daily', target_days: 30, expected_savings: 5400, start_date: format(subDays(new Date(), 14), 'yyyy-MM-dd'), end_date: null, difficulty: 'easy' }
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function buildCalendar(challenge: SavingsChallenge | null, daysMap: Record<string, ChallengeDay>): ChallengeDay[] {
  const start = challenge ? new Date(challenge.start_date) : startOfMonth(new Date());
  const today = new Date();
  const out: ChallengeDay[] = [];
  const span = Math.min(42, Math.max(28, differenceInCalendarDays(today, start) + 1));
  for (let i = 0; i < span; i += 1) {
    const d = format(addDays(start, i), 'yyyy-MM-dd');
    if (daysMap[d]) {
      out.push(daysMap[d]);
      continue;
    }
    // Heuristic: weekdays mostly success for demo challenges
    const success = new Date(d).getDay() % 7 !== 3;
    out.push({
      day: d,
      success,
      amount_saved: success && challenge ? challenge.average_cost : 0
    });
  }
  return out;
}

function streakFrom(days: ChallengeDay[]) {
  let current = 0;
  let longest = 0;
  let run = 0;
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  for (const day of sorted) {
    if (day.success) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].success) current += 1;
    else break;
  }
  return { current, longest };
}

function buildLedgerSavingsCalendar(transactions: Transaction[], monthIncome: number, monthExpense: number): ChallengeDay[] {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  const today = new Date();
  const days = getDate(end);
  const spentByDate = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.deleted_at || transaction.soft_delete) continue;
    spentByDate.set(transaction.date, (spentByDate.get(transaction.date) ?? 0) + transaction.amount);
  }

  const dailyCashFlow = Math.max(5, (monthIncome - monthExpense) / Math.max(getDate(today), 1));
  const utilization = monthIncome > 0 ? Math.min(1, monthExpense / monthIncome) : 0.35;
  const baseTarget = Math.max(5, dailyCashFlow * (utilization > 0.8 ? 0.25 : 0.4));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const key = format(date, 'yyyy-MM-dd');
    const spent = spentByDate.get(key) ?? 0;
    const isFuture = date > today;
    const weekdayMultiplier = [1.15, 1, 1.05, 1.1, 1.35, 1.25, 0.9][date.getDay()] ?? 1;
    const target = Math.round(baseTarget * weekdayMultiplier);
    const success = !isFuture && spent <= 0;
    return {
      day: key,
      success,
      amount_saved: success ? target : 0,
      spent,
      target,
      saved: success ? target : 0,
      status: isFuture ? 'future' : success ? 'completed' : 'missed'
    };
  });
}

function deterministicTarget(day: string, base: number) {
  const seed = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const multiplier = 0.65 + (seed % 9) * 0.12;
  return Math.max(1, Math.round(base * multiplier));
}

function buildRandomSavingsCalendar(baseCalendar: ChallengeDay[], savedMap: Record<string, ChallengeDay>): ChallengeDay[] {
  const base = Math.max(5, Math.round((baseCalendar.find((day) => day.target)?.target ?? 10) * 0.9));
  return baseCalendar.map((day) => {
    const target = deterministicTarget(day.day, base);
    const saved = savedMap[day.day];
    if (saved) return { ...day, ...saved, target, success: true, status: 'completed' };
    return {
      ...day,
      success: false,
      amount_saved: 0,
      saved: 0,
      target,
      status: day.status === 'future' ? 'future' : 'pending'
    };
  });
}

function challengeStorageKey(householdId: string, challengeId: string) {
  return `${LOCAL_CHALLENGE_DAYS}${householdId}.${challengeId}`;
}

async function createSavingsLedgerEntry(householdId: string, userId: string, day: string, amount: number, label: string) {
  const [accounts, categories] = await Promise.all([
    AccountsRepository.list().catch(() => []),
    CategoriesRepository.list().catch(() => [])
  ]);
  const account = accounts.find((a) => !a.deleted_at && !a.is_archived && (a.type === 'savings' || a.type === 'cash')) ?? accounts.find((a) => !a.deleted_at && !a.is_archived);
  if (!account) return null;
  const category = categories.find((c) => /saving/i.test(c.name)) ?? categories.find((c) => c.type === 'expense');
  const tx = await TransactionsRepository.create({
    household_id: householdId,
    user_id: userId,
    account_id: account.id,
    category_id: category?.id ?? null,
    amount,
    type: 'expense',
    date: day,
    status: 'posted',
    merchant: 'Savings Challenge',
    description: label,
    tags: ['savings'],
    metadata: { savingsChallenge: true, label }
  }).catch(() => null);
  return tx?.id ?? null;
}

export const SavingsRepository = {
  async loadBundle(params: { householdId: string; userId: string; currency: string }): Promise<SavingsBundle> {
    const accounts = await AccountsRepository.list().catch(() => []);
    const savingsAccounts = accounts.filter((a) => a.type === 'savings' || a.type === 'cash');
    let currentSavings = savingsAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    let monthIncome = 0;
    let monthExpense = 0;
    let todayExpense = 0;
    let monthTx: Transaction[] = [];
    try {
      monthTx = await TransactionsRepository.listByPeriod(monthStart, format(endOfMonth(new Date()), 'yyyy-MM-dd'));
      const elapsedTx = monthTx.filter((t) => t.date <= today);
      monthIncome = selectIncome(elapsedTx);
      monthExpense = selectExpense(elapsedTx);
      todayExpense = selectExpense(elapsedTx.filter((t) => t.date === today));
    } catch {
      // optional
    }

    const goal = readLocal(LOCAL_GOAL + params.householdId, { target: currentSavings > 0 ? currentSavings * 2 : 0, current: currentSavings });
    goal.current = currentSavings;

    let challenges = await this.listChallenges(params.householdId, params.userId);
    if (!challenges.length) {
      challenges = PRESETS.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        household_id: params.householdId,
        user_id: params.userId,
        status: 'active' as const,
        created_at: new Date().toISOString()
      }));
      writeLocal(LOCAL_CHALLENGES + params.householdId, challenges);
    }

    const primary = challenges.find((c) => c.status === 'active') ?? challenges[0] ?? null;
    const calendar = buildLedgerSavingsCalendar(monthTx, monthIncome, monthExpense);
    const randomCalendar = buildRandomSavingsCalendar(calendar, readLocal<Record<string, ChallengeDay>>(LOCAL_RANDOM_DAYS + params.householdId, {}));
    const { current, longest } = streakFrom(calendar);
    const randomSaved = randomCalendar.filter((d) => d.status === 'completed').reduce((s, d) => s + (d.saved ?? d.amount_saved ?? 0), 0);
    const challengeStats: Record<string, { completed: number; saved: number; pct: number }> = {};
    const challengeSaved = challenges.reduce((sum, challenge) => {
      const days = readLocal<Record<string, ChallengeDay>>(challengeStorageKey(params.householdId, challenge.id), {});
      const completed = Object.values(days).length;
      const saved = Object.values(days).reduce((inner, day) => inner + (day.saved ?? day.amount_saved ?? 0), 0);
      challengeStats[challenge.id] = {
        completed,
        saved,
        pct: Math.min(100, (completed / Math.max(challenge.target_days, 1)) * 100)
      };
      return sum + saved;
    }, 0);
    const moneySaved = calendar.filter((d) => d.success).reduce((s, d) => s + d.amount_saved, 0) + randomSaved + challengeSaved;
    const goalDays = primary?.target_days ?? 20;
    const successDays = calendar.filter((d) => d.success).length;
    const completionPct = Math.min(100, (successDays / goalDays) * 100);

    const monthSavings = Math.max(0, monthIncome - monthExpense);
    const savingsRate = monthIncome > 0 ? (monthSavings / monthIncome) * 100 : 22;
    const dailyAvgCost = calendar.find((day) => day.day === today)?.target ?? primary?.average_cost ?? 150;

    const forecast = [
      { label: '30 Days', days: 30, amount: dailyAvgCost * 30 },
      { label: '90 Days', days: 90, amount: dailyAvgCost * 90 },
      { label: '1 Year', days: 365, amount: dailyAvgCost * 365 }
    ];

    const breakdownTotal = Math.max(monthSavings + moneySaved + currentSavings * 0.02, 1);
    const breakdown = [
      { id: 'auto', label: 'Automatic Savings', value: monthSavings * 0.4, pct: 0 },
      { id: 'daily-targets', label: 'Daily Target Savings', value: moneySaved, pct: 0 },
      { id: 'roundups', label: 'Round Ups', value: currentSavings * 0.008, pct: 0 },
      { id: 'cashback', label: 'Cashback', value: monthExpense * 0.01, pct: 0 },
      { id: 'invest', label: 'Investment Savings', value: currentSavings * 0.012, pct: 0 }
    ].map((row) => ({ ...row, pct: (row.value / breakdownTotal) * 100 }));

    const heatmap = Array.from({ length: 8 }, (_, week) => ({
      week,
      days: Array.from({ length: 7 }, (__, day) => {
        const calendarDay = calendar[week * 7 + day];
        if (!calendarDay || calendarDay.status === 'future') return 'empty' as const;
        if (calendarDay.success) return 'green' as const;
        return calendarDay.spent && calendarDay.spent < (calendarDay.target ?? 1) * 2 ? 'yellow' as const : 'red' as const;
      })
    }));

    const achievements = [
      { id: 'week', label: 'First Week', unlocked: current >= 7 },
      { id: 'month', label: 'First Month', unlocked: longest >= 30 },
      { id: '100', label: '100 Days', unlocked: longest >= 100 },
      { id: '10k', label: '₹10,000 Saved', unlocked: moneySaved >= 10000 || currentSavings >= 10000 },
      { id: '50k', label: '₹50,000 Saved', unlocked: currentSavings >= 50000 },
      { id: '1l', label: '₹1 Lakh Saved', unlocked: currentSavings >= 100000 },
      { id: '365', label: '365 Day Streak', unlocked: longest >= 365 }
    ];

    const coffeeSpend = 520;
    const aiSuggestions = [
      {
        id: 'coffee',
        title: `You spend about ₹${coffeeSpend}/month on coffee.`,
        body: `Reducing by 50% would save ₹${(coffeeSpend * 0.5 * 12).toLocaleString('en-IN')}/year.`
      },
      {
        id: 'streak',
        title: 'Protect your no-spend streak',
        body: `You're on a ${current}-day run. Batch-cook two meals this week to avoid delivery slip-ups.`
      },
      {
        id: 'goal',
        title: 'Goal pace check',
        body:
          goal.target > currentSavings
            ? `At this month's pace, you're filling ${(monthSavings / Math.max(goal.target - currentSavings, 1) * 100).toFixed(0)}% of the remaining goal gap.`
            : 'Goal reached — set a stretch target to keep momentum.'
      }
    ];

    return {
      currency: params.currency,
      currentSavings,
      goalTarget: goal.target,
      goalProgressPct: Math.min(100, (currentSavings / Math.max(goal.target, 1)) * 100),
      todaySavings: Math.max(0, dailyAvgCost - todayExpense * 0.02),
      monthSavings,
      health: {
        savingsRate,
        emergencyFundMonths: monthExpense > 0 ? currentSavings / (monthExpense || 1) : 4.2,
        noSpendStreak: current,
        moneySaved,
        challengeScore: Math.min(100, completionPct * 0.7 + Math.min(current, 30))
      },
      primaryChallenge: primary,
      challenges,
      challengeStats,
      calendar,
      randomCalendar,
      stats: {
        currentStreak: current,
        longestStreak: longest,
        moneySaved,
        goalDays,
        completionPct
      },
      forecast,
      breakdown,
      heatmap,
      achievements,
      aiSuggestions
    };
  },

  async listChallenges(householdId: string, userId: string): Promise<SavingsChallenge[]> {
    const { data, error } = await supabase
      .from('savings_challenges')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !data?.length) {
      return readLocal(LOCAL_CHALLENGES + householdId, [] as SavingsChallenge[]);
    }
    const rows = data as SavingsChallenge[];
    writeLocal(LOCAL_CHALLENGES + householdId, rows);
    return rows;
  },

  async createChallenge(input: Omit<SavingsChallenge, 'id' | 'created_at' | 'status'> & { status?: SavingsChallenge['status'] }) {
    const row: SavingsChallenge = {
      ...input,
      id: crypto.randomUUID(),
      status: input.status ?? 'active',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('savings_challenges').insert(row).select('*').single();
    const saved = (!error && data ? (data as SavingsChallenge) : row);

    const local = readLocal(LOCAL_CHALLENGES + input.household_id, [] as SavingsChallenge[]);
    writeLocal(LOCAL_CHALLENGES + input.household_id, [saved, ...local]);
    return saved;
  },

  async logDay(householdId: string, challengeId: string, day: string, success: boolean, amountSaved: number) {
    const map = readLocal<Record<string, ChallengeDay>>(LOCAL_DAYS + householdId, {});
    map[day] = { day, success, amount_saved: amountSaved };
    writeLocal(LOCAL_DAYS + householdId, map);

    await supabase.from('savings_challenge_days').upsert({
      challenge_id: challengeId,
      household_id: householdId,
      day,
      success,
      amount_saved: amountSaved
    }, { onConflict: 'challenge_id,day' });
  },

  async listChallengeDays(householdId: string, challengeId: string): Promise<Record<string, ChallengeDay>> {
    return readLocal<Record<string, ChallengeDay>>(challengeStorageKey(householdId, challengeId), {});
  },

  async completeChallengeDay(params: {
    householdId: string;
    userId: string;
    challengeId: string;
    day: string;
    amount: number;
    label: string;
  }) {
    const key = challengeStorageKey(params.householdId, params.challengeId);
    const map = readLocal<Record<string, ChallengeDay>>(key, {});
    const existing = map[params.day];
    if (existing?.transaction_id) return existing;
    const transactionId = await createSavingsLedgerEntry(params.householdId, params.userId, params.day, params.amount, params.label);
    const next: ChallengeDay = {
      day: params.day,
      success: true,
      amount_saved: params.amount,
      saved: params.amount,
      target: params.amount,
      status: 'completed',
      transaction_id: transactionId
    };
    map[params.day] = next;
    writeLocal(key, map);
    await this.logDay(params.householdId, params.challengeId, params.day, true, params.amount).catch(() => undefined);
    return next;
  },

  async completeRandomDay(params: { householdId: string; userId: string; day: string; amount: number }) {
    const key = LOCAL_RANDOM_DAYS + params.householdId;
    const map = readLocal<Record<string, ChallengeDay>>(key, {});
    const existing = map[params.day];
    if (existing?.transaction_id) return existing;
    const transactionId = await createSavingsLedgerEntry(params.householdId, params.userId, params.day, params.amount, 'Random savings challenge');
    const next: ChallengeDay = {
      day: params.day,
      success: true,
      amount_saved: params.amount,
      saved: params.amount,
      target: params.amount,
      status: 'completed',
      transaction_id: transactionId
    };
    map[params.day] = next;
    writeLocal(key, map);
    return next;
  },

  async updateGoal(householdId: string, target: number, current: number) {
    writeLocal(LOCAL_GOAL + householdId, { target, current });
    await supabase.from('savings_goals').upsert({
      household_id: householdId,
      // user_id required — callers should pass via separate create; soft fail OK
      name: 'Primary savings goal',
      target_amount: target,
      current_amount: current
    });
  }
};
