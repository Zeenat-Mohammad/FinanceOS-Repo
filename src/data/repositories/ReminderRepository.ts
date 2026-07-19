import { supabase } from '@/data/supabase/client';
import type { CalendarReminder, ReminderEmailDelivery } from '@/types/database';
import type { Json } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export type CalendarReminderInput = {
  household_id: string;
  user_id: string;
  title: string;
  caption?: string | null;
  reminder_date: string;
  reminder_time: string;
  reminder_email?: string | null;
  reminder_enabled?: boolean;
  metadata?: Json;
};

export type CalendarReminderUpdate = Partial<
  Pick<CalendarReminderInput, 'title' | 'caption' | 'reminder_date' | 'reminder_time' | 'reminder_email' | 'reminder_enabled' | 'metadata'>
> & {
  status?: CalendarReminder['status'];
};

export const ReminderRepository = {
  async listCalendarReminders(householdId: string, start: string, end: string): Promise<CalendarReminder[]> {
    const { data, error } = await supabase
      .from('calendar_reminders')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .gte('reminder_date', start)
      .lte('reminder_date', end)
      .order('reminder_date')
      .order('reminder_time');

    if (error) throwDatabaseError('Failed to load calendar reminders', error);
    return (data ?? []) as CalendarReminder[];
  },

  async createCalendarReminder(input: CalendarReminderInput): Promise<CalendarReminder> {
    const { data, error } = await supabase
      .from('calendar_reminders')
      .insert({
        ...input,
        reminder_enabled: input.reminder_enabled ?? true,
        reminder_email: input.reminder_email || null,
        caption: input.caption || null,
        metadata: input.metadata ?? {}
      })
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to create calendar reminder', error);
    return data as CalendarReminder;
  },

  async updateCalendarReminder(reminderId: string, input: CalendarReminderUpdate): Promise<CalendarReminder> {
    const { data, error } = await supabase
      .from('calendar_reminders')
      .update({
        ...input,
        reminder_email: input.reminder_email === '' ? null : input.reminder_email,
        caption: input.caption === '' ? null : input.caption
      })
      .eq('id', reminderId)
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to update calendar reminder', error);
    return data as CalendarReminder;
  },

  async deleteCalendarReminder(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_reminders')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'cancelled',
        reminder_enabled: false
      })
      .eq('id', reminderId);

    if (error) throwDatabaseError('Failed to delete calendar reminder', error);
  },

  async listEmailDeliveries(householdId: string, start: string, end: string): Promise<ReminderEmailDelivery[]> {
    const { data, error } = await supabase
      .from('reminder_email_deliveries')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .gte('scheduled_for', start)
      .lte('scheduled_for', end)
      .order('scheduled_for', { ascending: false });

    if (error) throwDatabaseError('Failed to load reminder email deliveries', error);
    return (data ?? []) as ReminderEmailDelivery[];
  }
};
