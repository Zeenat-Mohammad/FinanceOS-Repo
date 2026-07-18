import { format } from 'date-fns';

export function formatDate(value: string | Date, pattern = 'MMM d, yyyy') {
  return format(new Date(value), pattern);
}

export function getCurrentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
