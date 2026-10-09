import i18n from '@/i18n';

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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep in sync with the backend: posts live 30 days, boosts 21 days capped by the post. */
export const POST_LIFETIME_MS = 30 * DAY_MS;
export const BOOST_DURATION_MS = 21 * DAY_MS;

function toTime(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function getPostExpiresAt(job: {
  expiresAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}): number | null {
  const explicit = toTime(job.expiresAt);
  if (explicit != null) return explicit;
  const publishedAt = toTime(job.publishedAt) ?? toTime(job.createdAt);
  return publishedAt == null ? null : publishedAt + POST_LIFETIME_MS;
}

export function getFeaturedEndsAt(job: {
  featuredEndsAt?: string | null;
  featuredAt?: string | null;
  expiresAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}): number | null {
  const explicit = toTime(job.featuredEndsAt);
  if (explicit != null) return explicit;
  const startedAt = toTime(job.featuredAt) ?? toTime(job.publishedAt) ?? toTime(job.createdAt);
  const postExpiresAt = getPostExpiresAt(job);
  if (startedAt == null || postExpiresAt == null) return null;
  return Math.min(startedAt + BOOST_DURATION_MS, postExpiresAt);
}

/** Whole days a boost started now would run: 21, or fewer if the post ends sooner. */
export function getBoostDaysIfStartedNow(postExpiresAt: number | null, now = Date.now()): number {
  const boostMs = postExpiresAt == null
    ? BOOST_DURATION_MS
    : Math.min(BOOST_DURATION_MS, postExpiresAt - now);
  return Math.max(0, Math.ceil(boostMs / DAY_MS));
}

export function formatFeaturedTimeLeft(endsAt: number, now = Date.now()): string {
  const diff = endsAt - now;
  if (diff <= 0) return i18n.t('time.ended');

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  if (days > 0) return i18n.t('time.daysHoursLeft', { days, hours });
  if (hours > 0) return i18n.t('time.hoursMinutesLeft', { hours, minutes });
  if (minutes > 0) return i18n.t('time.minutesSecondsLeft', { minutes, seconds });
  return i18n.t('time.secondsLeft', { seconds });
}

