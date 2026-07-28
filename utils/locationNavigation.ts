import { authService } from '@/services/auth.service';
import { locationStorage, type StoredAppLocation } from '@/services/locationStorage';
import { tokenStorage } from '@/services/tokenStorage';
import type { User } from '@/types';

function locationFromProfile(user: User): StoredAppLocation | null {
  const details = user.locationDetails;
  const city = details?.city || '';
  const display =
    user.location ||
    [details?.address, details?.city, details?.state].filter(Boolean).join(', ') ||
    city;

  if (!display && !city) return null;

  return {
    display: display || city,
    city: city || display.split(',')[0]?.trim() || display,
    state: details?.state,
    coordinates: details?.coordinates,
  };
}

async function syncProfileLocation(profile: User) {
  const fromProfile = locationFromProfile(profile);
  if (fromProfile?.city) {
    await locationStorage.set(fromProfile);
    await locationStorage.markSetupComplete();
  }
}

/** After login/signup/splash — land on location setup when city is missing. */
export async function getPostAuthRoute(
  profile?: User
): Promise<'/(tabs)' | '/location-setup'> {
  if (profile) {
    await syncProfileLocation(profile);
  }

  const needs = await needsLocationSetup();
  return needs ? '/location-setup' : '/(tabs)';
}

/** Whether the user still needs to pick a location (shows required location modal). */
export async function needsLocationSetup(): Promise<boolean> {
  const token = await tokenStorage.getAccessToken();
  if (!token) {
    return false;
  }

  const stored = await locationStorage.get();
  if (stored?.city?.trim()) {
    await locationStorage.markSetupComplete();
    return false;
  }

  try {
    const profile = await authService.getProfile();
    const fromProfile = locationFromProfile(profile);
    if (fromProfile?.city?.trim()) {
      await locationStorage.set(fromProfile);
      await locationStorage.markSetupComplete();
      return false;
    }
  } catch {
    // Profile may fail offline — still require a local location.
  }

  return true;
}
