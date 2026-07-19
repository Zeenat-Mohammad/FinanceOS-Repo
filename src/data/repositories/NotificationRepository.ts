import { deriveGoalAlerts } from '@/core/goals/SmartGoalEngine';
import { supabase } from '@/data/supabase/client';
import type { FinancialNotification, GoalsBundle } from '@/types/intelligence';
import { throwDatabaseError } from './repositoryError';

type BudgetNotificationRow = {
  id: string;
  household_id: string;
  user_id: string;
  category_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  period_end: string;
};

export const NotificationRepository = {
  async list(householdId: string, userId: string): Promise<FinancialNotification[]> {
    const [financialResult, budgetResult] = await Promise.all([
      supabase
        .from('financial_notifications')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('budget_notifications')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);
    if (financialResult.error) throwDatabaseError('Failed to load notifications', financialResult.error);
    if (budgetResult.error) throwDatabaseError('Failed to load budget notifications', budgetResult.error);

    const budgetNotifications = ((budgetResult.data ?? []) as BudgetNotificationRow[]).map(
      (row): FinancialNotification => ({
        id: `budget:${row.id}`,
        household_id: row.household_id,
        user_id: row.user_id,
        source_type: 'budget',
        source_id: row.category_id,
        alert_type: row.notification_type,
        severity: ['exceeded', 'threshold_100'].includes(row.notification_type) ? 'critical' : 'warning',
        title: row.title,
        message: row.message,
        action_url: '/budget',
        is_read: row.is_read,
        read_at: row.read_at,
        created_at: row.created_at,
        expires_at: `${row.period_end}T23:59:59.999Z`,
        metadata: {}
      })
    );

    return [...((financialResult.data ?? []) as FinancialNotification[]), ...budgetNotifications].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  },

  async syncGoalAlerts(householdId: string, userId: string, bundle: GoalsBundle): Promise<void> {
    const alerts = deriveGoalAlerts(bundle);
    if (!alerts.length) return;
    const goalIds = [...new Set(alerts.map((alert) => alert.goalId))];
    const { data: existing, error: loadError } = await supabase
      .from('financial_notifications')
      .select('source_id, alert_type')
      .eq('user_id', userId)
      .eq('source_type', 'goal')
      .in('source_id', goalIds);
    if (loadError) throwDatabaseError('Failed to inspect goal notifications', loadError);
    const keys = new Set((existing ?? []).map((row) => `${row.source_id}:${row.alert_type}`));
    const rows = alerts
      .filter((alert) => !keys.has(`${alert.goalId}:${alert.alertType}`))
      .map((alert) => ({
        household_id: householdId,
        user_id: userId,
        source_type: 'goal',
        source_id: alert.goalId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        action_url: '/goals'
      }));
    if (!rows.length) return;
    const { error } = await supabase.from('financial_notifications').insert(rows);
    if (error) throwDatabaseError('Failed to synchronize goal notifications', error);
  },

  async markRead(notification: FinancialNotification): Promise<void> {
    const table = notification.id.startsWith('budget:') ? 'budget_notifications' : 'financial_notifications';
    const id = notification.id.replace(/^budget:/, '');
    const { error } = await supabase
      .from(table)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throwDatabaseError('Failed to mark notification as read', error);
  },

  async markAllRead(householdId: string, userId: string): Promise<void> {
    const readAt = new Date().toISOString();
    const [financial, budget] = await Promise.all([
      supabase
        .from('financial_notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .eq('is_read', false),
      supabase
        .from('budget_notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .eq('is_read', false)
    ]);
    if (financial.error) throwDatabaseError('Failed to mark notifications as read', financial.error);
    if (budget.error) throwDatabaseError('Failed to mark budget notifications as read', budget.error);
  }
};

