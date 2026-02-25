import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '—';
  return `$${Number(cost).toFixed(4)}`;
}

export function formatSentiment(sentiment: string | null | undefined): string {
  if (!sentiment) return '—';
  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase();
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'ended':
      return 'bg-green-100 text-green-800';
    case 'ongoing':
      return 'bg-blue-100 text-blue-800';
    case 'registered':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
    case 'not_connected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getSentimentColor(sentiment: string | null | undefined): string {
  if (!sentiment) return 'bg-gray-100 text-gray-600';
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'bg-green-100 text-green-700';
    case 'negative':
      return 'bg-red-100 text-red-700';
    case 'neutral':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}
