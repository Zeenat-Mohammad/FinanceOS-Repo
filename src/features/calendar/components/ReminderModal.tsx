import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal } from '@/shared/components';
import type { CalendarReminder } from '@/types/database';
import type { CalendarReminderInput } from '@/data/repositories/ReminderRepository';

const reminderSchema = z.object({
  title: z.string().min(1, 'Task title is required.'),
  caption: z.string().optional(),
  reminder_date: z.string().min(1, 'Choose a reminder date.'),
  reminder_time: z.string().min(1, 'Choose a reminder time.'),
  reminder_email: z.string().email('Enter a valid reminder email.').optional().or(z.literal('')),
  reminder_enabled: z.boolean()
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

export type ReminderFormPayload = Omit<CalendarReminderInput, 'household_id' | 'user_id'>;

export function ReminderModal({
  open,
  reminder,
  defaultDate,
  defaultEmail,
  onClose,
  onSubmit
}: {
  open: boolean;
  reminder: CalendarReminder | null;
  defaultDate: string;
  defaultEmail: string;
  onClose: () => void;
  onSubmit: (values: ReminderFormPayload) => void;
}) {
  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      caption: '',
      reminder_date: defaultDate,
      reminder_time: '09:00',
      reminder_email: defaultEmail,
      reminder_enabled: true
    }
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: reminder?.title ?? '',
      caption: reminder?.caption ?? '',
      reminder_date: reminder?.reminder_date ?? defaultDate,
      reminder_time: (reminder?.reminder_time ?? '09:00').slice(0, 5),
      reminder_email: reminder?.reminder_email ?? defaultEmail,
      reminder_enabled: reminder?.reminder_enabled ?? true
    });
  }, [defaultDate, defaultEmail, form, open, reminder]);

  return (
    <Modal open={open} title={reminder ? 'Edit Reminder' : 'Add Reminder'} onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            title: values.title.trim(),
            caption: values.caption?.trim() || null,
            reminder_date: values.reminder_date,
            reminder_time: values.reminder_time,
            reminder_email: values.reminder_email?.trim() || null,
            reminder_enabled: values.reminder_enabled
          })
        )}
      >
        <label className="space-y-1">
          <span className="text-xs text-muted">Task title</span>
          <input className="input" {...form.register('title')} />
          {form.formState.errors.title ? <span className="text-xs text-destructive">{form.formState.errors.title.message}</span> : null}
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Caption / Description</span>
          <textarea className="input min-h-20" {...form.register('caption')} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted">Date</span>
            <input className="input" type="date" {...form.register('reminder_date')} />
            {form.formState.errors.reminder_date ? <span className="text-xs text-destructive">{form.formState.errors.reminder_date.message}</span> : null}
          </label>

          <label className="space-y-1">
            <span className="text-xs text-muted">Time</span>
            <input className="input" type="time" {...form.register('reminder_time')} />
            {form.formState.errors.reminder_time ? <span className="text-xs text-destructive">{form.formState.errors.reminder_time.message}</span> : null}
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs text-muted">Reminder email</span>
          <input className="input" type="email" autoComplete="email" {...form.register('reminder_email')} />
          {form.formState.errors.reminder_email ? <span className="text-xs text-destructive">{form.formState.errors.reminder_email.message}</span> : null}
        </label>

        <label className="flex items-center gap-2 rounded-brand border border-border bg-primary/20 p-3 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent" {...form.register('reminder_enabled')} />
          Send email reminder
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-success text-primary hover:bg-success/90">
            {reminder ? 'Save Reminder' : 'Add Reminder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
