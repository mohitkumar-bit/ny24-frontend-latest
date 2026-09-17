/** Always 12-hour with AM/PM. Manual format so locale/font quirks cannot clip the suffix. */
export function formatMessageTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const minutes = String(d.getMinutes()).padStart(2, '0');
  let hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** Featured placement lasts 30 days from featuredAt / createdAt */
export const FEATURED_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function getFeaturedEndsAt(featuredAt?: string | null, createdAt?: string | null): number | null {
  const startSource = featuredAt || createdAt;
  if (!startSource) return null;
  const startedAt = new Date(startSource).getTime();
  if (Number.isNaN(startedAt)) return null;
  return startedAt + FEATURED_DURATION_MS;
}

export function formatFeaturedTimeLeft(endsAt: number, now = Date.now()): string {
  const diff = endsAt - now;
  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

