import type { StoredAppLocation } from '@/services/locationStorage';

/** Params so the API returns posts/workers near the user's selected location. */
export function buildNearbyParams(
  location: StoredAppLocation | null | undefined,
  options?: { hasSearch?: boolean; filterCity?: string }
): Record<string, string | number> {
  if (options?.hasSearch || options?.filterCity?.trim()) return {};
  if (!location) return {};

  const params: Record<string, string | number> = { nearby: 'true' };

  if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const [lng, lat] = location.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      params.lat = lat;
      params.lng = lng;
    }
  }

  if (location.city?.trim()) params.userCity = location.city.trim();
  if (location.state?.trim()) params.userState = location.state.trim();

  const tokens = location.display
    ?.split(',')
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 4);

  if (tokens?.length) params.locality = tokens.join('|');

  return params;
}
