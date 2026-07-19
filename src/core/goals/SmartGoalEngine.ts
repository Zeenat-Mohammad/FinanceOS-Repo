import {
  addMonths,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfMonth
} from 'date-fns';
import type {
  GoalContribution,
  GoalKpis,
  GoalsBundle,
  SmartGoal,
  SmartGoalMetrics,
  SmartGoalView
} from '@/types/intelligence';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function adjustedTarget(goal: SmartGoal, now: Date): number {
  if (!goal.target_date || goal.inflation_adjustment_pct <= 0) return goal.target_amount;
  const years = Math.max(0, differenceInCalendarMonths(parseISO(goal.target_date), now) / 12);
  return goal.target_amount * (1 + goal.inflation_adjustment_pct / 100) ** years;
}

export function calculateGoalMetrics(goal: SmartGoal, now = new Date()): SmartGoalMetrics {
  const effectiveTarget = adjustedTarget(goal, now);
  const remainingAmount = Math.max(0, effectiveTarget - goal.current_amount);
  const completionPct = effectiveTarget > 0 ? clamp((goal.current_amount / effectiveTarget) * 100, 0, 100) : 0;
  const monthsRemaining = goal.target_date
    ? Math.max(0, differenceInCalendarMonths(parseISO(goal.target_date), startOfMonth(now)) + 1)
    : 0;
  const requiredMonthlySaving = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;
  const contribution = Math.max(0, goal.expected_monthly_contribution);
  const gap = contribution - requiredMonthlySaving;
  const monthlyDeficit = gap < 0 ? Math.abs(gap) : 0;
  const monthlySurplus = gap > 0 ? gap : 0;
  const estimatedMonths = remainingAmount <= 0 ? 0 : contribution > 0 ? Math.ceil(remainingAmount / contribution) : null;
  const estimatedCompletionDate =
    estimatedMonths === null ? null : format(endOfMonth(addMonths(now, estimatedMonths)), 'yyyy-MM-dd');

  const isSpecific = goal.name.trim().length >= 3 && Boolean(goal.description?.trim()) && goal.goal_type !== 'custom';
  const isMeasurable = goal.target_amount > 0;
  const isAchievable = remainingAmount <= 0 || (monthsRemaining > 0 && contribution >= requiredMonthlySaving * 0.9);
  const isRelevant = goal.priority !== 'low' || Boolean(goal.notes?.trim()) || goal.goal_type !== 'custom';
  const isTimeBound = Boolean(goal.target_date);
  const smartScore = [isSpecific, isMeasurable, isAchievable, isRelevant, isTimeBound].filter(Boolean).length * 20;

  const overdue = Boolean(goal.target_date && isAfter(startOfMonth(now), parseISO(goal.target_date)) && completionPct < 100);
  let riskLevel: SmartGoalMetrics['riskLevel'] = 'low';
  if (overdue || (monthsRemaining <= 1 && completionPct < 90)) riskLevel = 'critical';
  else if (monthlyDeficit > requiredMonthlySaving * 0.25 || smartScore <= 40) riskLevel = 'high';
  else if (monthlyDeficit > 0 || smartScore < 80) riskLevel = 'medium';

  return {
    remainingAmount: round2(remainingAmount),
    completionPct: round2(completionPct),
    monthsRemaining,
    requiredMonthlySaving: round2(requiredMonthlySaving),
    monthlyDeficit: round2(monthlyDeficit),
    monthlySurplus: round2(monthlySurplus),
    estimatedCompletionDate,
    riskLevel,
    isSpecific,
    isMeasurable,
    isAchievable,
    isRelevant,
    isTimeBound,
    smartScore
  };
}

function buildKpis(goals: SmartGoalView[]): GoalKpis {
  const active = goals.filter((goal) => goal.status !== 'cancelled' && goal.status !== 'draft');
  return {
    totalGoals: active.length,
    completedGoals: active.filter((goal) => goal.status === 'completed' || goal.completionPct >= 100).length,
    onTrack: active.filter((goal) => goal.status === 'active' && goal.riskLevel === 'low').length,
    behindSchedule: active.filter((goal) => goal.status === 'active' && ['high', 'critical'].includes(goal.riskLevel)).length,
    needsAttention: active.filter((goal) => goal.status === 'overdue' || goal.riskLevel !== 'low').length,
    totalTargetAmount: round2(active.reduce((sum, goal) => sum + goal.target_amount, 0)),
    totalSaved: round2(active.reduce((sum, goal) => sum + goal.current_amount, 0)),
    averageCompletion: active.length
      ? round2(active.reduce((sum, goal) => sum + goal.completionPct, 0) / active.length)
      : 0
  };
}

function contributionHistory(contributions: GoalContribution[]) {
  const months = new Map<string, number>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    months.set(format(addMonths(new Date(), -offset), 'MMM yyyy'), 0);
  }
  for (const contribution of contributions) {
    if (contribution.deleted_at) continue;
    const key = format(parseISO(contribution.contribution_date), 'MMM yyyy');
    if (months.has(key)) months.set(key, (months.get(key) ?? 0) + contribution.amount);
  }
  return [...months].map(([month, amount]) => ({ month, amount: round2(amount) }));
}

export function buildGoalsBundle(goals: SmartGoal[], contributions: GoalContribution[], now = new Date()): GoalsBundle {
  const views = goals
    .filter((goal) => !goal.deleted_at)
    .map((goal) => ({ ...goal, ...calculateGoalMetrics(goal, now) }))
    .sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return priority[a.priority] - priority[b.priority] || (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999');
    });

  return {
    goals: views,
    contributions,
    kpis: buildKpis(views),
    monthlyContributions: contributionHistory(contributions),
    upcomingContributions: views
      .filter((goal) => goal.status === 'active' && goal.expected_monthly_contribution > 0)
      .slice(0, 5)
      .map((goal) => ({
        goalId: goal.id,
        goalName: goal.name,
        date: format(endOfMonth(now), 'yyyy-MM-dd'),
        amount: goal.expected_monthly_contribution
      }))
  };
}

export type GoalAlertCandidate = {
  goalId: string;
  alertType: 'behind_schedule' | 'missed_contribution' | 'completed' | 'threshold_75' | 'threshold_90' | 'overdue';
  severity: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
};

export function deriveGoalAlerts(bundle: GoalsBundle, now = new Date()): GoalAlertCandidate[] {
  const thisMonth = format(now, 'yyyy-MM');
  return bundle.goals.flatMap((goal) => {
    const alerts: GoalAlertCandidate[] = [];
    const base = { goalId: goal.id };
    if (goal.status === 'completed' || goal.completionPct >= 100) {
      alerts.push({ ...base, alertType: 'completed', severity: 'success', title: 'Goal completed', message: `${goal.name} is fully funded.` });
    } else if (goal.target_date && isAfter(now, parseISO(goal.target_date))) {
      alerts.push({ ...base, alertType: 'overdue', severity: 'critical', title: 'Goal overdue', message: `${goal.name} passed its target date.` });
    } else if (goal.riskLevel === 'high' || goal.riskLevel === 'critical') {
      alerts.push({ ...base, alertType: 'behind_schedule', severity: 'warning', title: 'Goal behind schedule', message: `${goal.name} needs ${goal.requiredMonthlySaving.toFixed(2)} per month to stay on track.` });
    }

    if (goal.completionPct >= 90 && goal.completionPct < 100) {
      alerts.push({ ...base, alertType: 'threshold_90', severity: 'info', title: 'Goal reached 90%', message: `${goal.name} is almost complete.` });
    } else if (goal.completionPct >= 75 && goal.completionPct < 90) {
      alerts.push({ ...base, alertType: 'threshold_75', severity: 'info', title: 'Goal reached 75%', message: `${goal.name} is three quarters funded.` });
    }

    const contributed = bundle.contributions.some(
      (item) => item.goal_id === goal.id && item.contribution_date.startsWith(thisMonth) && !item.deleted_at
    );
    if (goal.status === 'active' && goal.expected_monthly_contribution > 0 && now.getDate() >= 25 && !contributed) {
      alerts.push({ ...base, alertType: 'missed_contribution', severity: 'warning', title: 'Contribution due', message: `${goal.name} has no contribution recorded this month.` });
    }
    return alerts;
  });
}

