import { Platform } from 'react-native';
import * as Location from 'expo-location';

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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

async function getNativePosition(): Promise<{ latitude: number; longitude: number }> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('LOCATION_SERVICES_DISABLED');
  }

  const lastKnown = await Location.getLastKnownPositionAsync();
  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
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

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
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
    return 'Location permission was denied. Enable it in your device settings.';
  }
  if (msg === 'LOCATION_SERVICES_DISABLED') {
    return 'Location services are turned off. Please enable GPS on your device.';
  }
  return 'Could not fetch your location. Try again outdoors or set a mock location in the simulator.';
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
