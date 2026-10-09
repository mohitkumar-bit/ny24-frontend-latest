import { Platform } from 'react-native';
import * as Location from 'expo-location';
import i18n from '@/i18n';

export type ResolvedLocation = {
  address: string;
  city: string;
  state: string;
  district: string;
  country: string;
  pincode: string;
  coordinates: [number, number];
};

function uniqueJoin(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = p?.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.join(', ');
}

function parseExpoGeocode(
  geo: Location.LocationGeocodedAddress | undefined
): Omit<ResolvedLocation, 'coordinates'> {
  const city =
    geo?.city ||
    geo?.subregion ||
    geo?.district ||
    '';
  const state = geo?.region || '';
  const country = geo?.country || '';
  const district = geo?.district || geo?.subregion || '';
  const pincode = geo?.postalCode || '';

  const area = uniqueJoin([
    geo?.name,
    geo?.street,
    geo?.district,
    geo?.subregion,
  ]);

  const address = area || city || district || state;

  return { address, city, state, district, country, pincode };
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number
): Promise<Omit<ResolvedLocation, 'coordinates'> | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'gigSEVA-Mobile-App' },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      '';
    const state = addr.state || '';
    const country = addr.country || '';
    const district = addr.state_district || addr.county || '';
    const pincode = addr.postcode || '';

    const area = uniqueJoin([
      addr.neighbourhood,
      addr.suburb,
      addr.locality,
      addr.quarter,
      addr.hamlet,
      addr.residential,
      addr.road,
      addr.pedestrian,
    ]);

    const address = area || city || district;

    if (!address && !city && !state) return null;
    return { address, city, state, district, country, pincode };
  } catch {
    return null;
  }
}

async function getWebPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

const TARGET_ACCURACY_METERS = 10;
/** After this long, settle for a fix within ACCEPTABLE_ACCURACY_METERS (typical indoors). */
const SETTLE_AFTER_MS = 8000;
const ACCEPTABLE_ACCURACY_METERS = 30;
const ACCURATE_FIX_TIMEOUT_MS = 15000;

const accuracyOf = (fix: Location.LocationObject) => fix.coords.accuracy ?? Infinity;

async function ensureLocationServices() {
  if (await Location.hasServicesEnabledAsync()) return;

  if (Platform.OS === 'android') {
    try {
      // Shows the system dialog to turn on location / Google location accuracy.
      await Location.enableNetworkProviderAsync();
      if (await Location.hasServicesEnabledAsync()) return;
    } catch {
      // User declined the dialog.
    }
  }

  throw new Error('LOCATION_SERVICES_DISABLED');
}

/** Resolves with the most accurate GPS fix seen before the target accuracy or timeout is reached. */
function watchForAccurateFix(): Promise<Location.LocationObject | null> {
  return new Promise((resolve) => {
    let best: Location.LocationObject | null = null;
    let subscription: Location.LocationSubscription | null = null;
    let finished = false;

    const startedAt = Date.now();
    const isGoodEnough = (fix: Location.LocationObject) =>
      accuracyOf(fix) <= TARGET_ACCURACY_METERS ||
      (Date.now() - startedAt >= SETTLE_AFTER_MS &&
        accuracyOf(fix) <= ACCEPTABLE_ACCURACY_METERS);

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(settleTimer);
      subscription?.remove();
      resolve(best);
    };

    const timer = setTimeout(finish, ACCURATE_FIX_TIMEOUT_MS);
    const settleTimer = setTimeout(() => {
      if (best && isGoodEnough(best)) finish();
    }, SETTLE_AFTER_MS);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
        mayShowUserSettingsDialog: true,
      },
      (fix) => {
        if (!best || accuracyOf(fix) < accuracyOf(best)) best = fix;
        if (isGoodEnough(best)) finish();
      }
    )
      .then((sub) => {
        if (finished) sub.remove();
        else subscription = sub;
      })
      .catch(finish);
  });
}

async function getNativePosition(): Promise<{ latitude: number; longitude: number }> {
  await ensureLocationServices();

  const fix =
    (await watchForAccurateFix()) ??
    // No GPS fix in time (e.g. indoors) — fall back to the device's cached position.
    (await Location.getLastKnownPositionAsync());

  if (!fix) {
    throw new Error('LOCATION_UNAVAILABLE');
  }

  return {
    latitude: fix.coords.latitude,
    longitude: fix.coords.longitude,
  };
}

/** Fetch GPS + reverse geocode with OpenStreetMap fallback */
export async function fetchLiveLocation(): Promise<ResolvedLocation> {
  if (Platform.OS === 'web') {
    const { latitude, longitude } = await getWebPosition();
    const nominatim = await reverseGeocodeNominatim(latitude, longitude);
    if (nominatim) {
      return { ...nominatim, coordinates: [longitude, latitude] };
    }
    return {
      address: '',
      city: '',
      state: '',
      district: '',
      country: '',
      pincode: '',
      coordinates: [longitude, latitude],
    };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  if (permission.android?.accuracy === 'coarse') {
    // Android 12+ shows the "Change to precise location" dialog on a repeat request.
    await Location.requestForegroundPermissionsAsync().catch(() => undefined);
  }

  const { latitude, longitude } = await getNativePosition();

  const expoResults = await Location.reverseGeocodeAsync({ latitude, longitude });
  let parsed = parseExpoGeocode(expoResults[0]);

  const nominatim = await reverseGeocodeNominatim(latitude, longitude);
  if (nominatim) {
    parsed = {
      address: nominatim.address || parsed.address,
      city: nominatim.city || parsed.city,
      state: nominatim.state || parsed.state,
      district: nominatim.district || parsed.district,
      country: nominatim.country || parsed.country,
      pincode: nominatim.pincode || parsed.pincode,
    };
  }

  if (!parsed.address && parsed.city) {
    parsed.address = parsed.city;
  }

  return {
    ...parsed,
    coordinates: [longitude, latitude],
  };
}

export function getLocationErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg === 'PERMISSION_DENIED') {
    return i18n.t('location.permissionDenied');
  }
  if (msg === 'LOCATION_SERVICES_DISABLED') {
    return i18n.t('location.servicesDisabled');
  }
  return i18n.t('location.fetchFailed');
}

export type LocationSuggestion = {
  id: string;
  label: string;
  city: string;
  state?: string;
  display: string;
  coordinates?: [number, number];
};

function parseNominatimSearchResult(item: Record<string, unknown>): LocationSuggestion {
  const addr = (item.address as Record<string, string>) || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.locality ||
    addr.state_district ||
    '';
  const state = addr.state || '';
  const displayName = typeof item.display_name === 'string' ? item.display_name : '';
  const display = displayName || uniqueJoin([city, state]) || city;
  const lon = typeof item.lon === 'string' ? parseFloat(item.lon) : NaN;
  const lat = typeof item.lat === 'string' ? parseFloat(item.lat) : NaN;

  return {
    id: String(item.place_id || item.osm_id || display),
    label: displayName.split(',').slice(0, 2).join(',').trim() || display,
    city: city || displayName.split(',')[0]?.trim() || display,
    state: state || undefined,
    display,
    coordinates: Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : undefined,
  };
}

/** Search city/area suggestions for manual location entry (India-focused). */
export async function searchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&countrycodes=in&limit=6`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'GIGseva-Mobile-App' },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as Record<string, unknown>[];
    return data.map(parseNominatimSearchResult).filter((item) => item.display);
  } catch {
    return [];
  }
}
