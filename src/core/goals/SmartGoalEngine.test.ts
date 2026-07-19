import { describe, expect, it } from 'vitest';
import { buildGoalsBundle, calculateGoalMetrics, deriveGoalAlerts } from './SmartGoalEngine';
import type { SmartGoal } from '@/types/intelligence';

function goal(overrides: Partial<SmartGoal> = {}): SmartGoal {
  return {
    id: 'goal-1',
    household_id: 'household-1',
    user_id: 'user-1',
    name: 'Emergency reserve',
    description: 'Build six months of essential expenses',
    goal_type: 'emergency_fund',
    priority: 'high',
    target_amount: 12_000,
    current_amount: 6_000,
    currency: 'USD',
    target_date: '2027-01-31',
    expected_monthly_contribution: 1_000,
    linked_account_id: null,
    linked_investment_id: null,
    auto_contribution: false,
    inflation_adjustment_pct: 0,
    goal_image_path: null,
    notes: 'Protect household cash flow',
    status: 'active',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    version: 1,
    ...overrides
  };
}

describe('SmartGoalEngine', () => {
  it('calculates required saving, completion and SMART score', () => {
    const metrics = calculateGoalMetrics(goal(), new Date('2026-07-15T00:00:00Z'));
    expect(metrics.remainingAmount).toBe(6_000);
    expect(metrics.completionPct).toBe(50);
    expect(metrics.requiredMonthlySaving).toBeCloseTo(857.14, 2);
    expect(metrics.monthlySurplus).toBeCloseTo(142.86, 2);
    expect(metrics.smartScore).toBe(100);
    expect(metrics.riskLevel).toBe('low');
  });

  it('flags overdue goals and completion thresholds', () => {
    const overdue = goal({ target_date: '2026-06-30', expected_monthly_contribution: 0 });
    const bundle = buildGoalsBundle([overdue], [], new Date('2026-07-26T00:00:00Z'));
    expect(bundle.goals[0].riskLevel).toBe('critical');
    expect(deriveGoalAlerts(bundle, new Date('2026-07-26T00:00:00Z')).map((alert) => alert.alertType)).toContain('overdue');

    const almostDone = buildGoalsBundle([goal({ current_amount: 11_000 })], [], new Date('2026-07-15T00:00:00Z'));
    expect(deriveGoalAlerts(almostDone, new Date('2026-07-15T00:00:00Z')).map((alert) => alert.alertType)).toContain('threshold_90');
  });
});

