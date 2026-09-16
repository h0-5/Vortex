import { format, formatDistanceToNow } from 'date-fns';

export function formatDateTime(value: string | Date | number): string {
  return format(new Date(value), 'PPp');
}

export function formatRelativeTime(value: string | Date | number): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function formatShortDate(value: string | Date | number): string {
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatLogTime(value: string | Date | number): string {
  return format(new Date(value), 'yyyy-MM-dd HH:mm:ss');
}

export function formatDiscordTimestampPreview(value: string | Date | number): string {
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}
