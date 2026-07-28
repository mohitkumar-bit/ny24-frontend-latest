import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '@/services/auth.service';
import {
  fetchLiveLocation,
  getLocationErrorMessage,
  ResolvedLocation,
} from '@/services/location.service';
import { locationStorage, StoredAppLocation } from '@/services/locationStorage';

type AppLocationContextValue = {
  location: StoredAppLocation | null;
  loading: boolean;
  detecting: boolean;
  setLocation: (loc: StoredAppLocation) => Promise<void>;
  detectLocation: () => Promise<StoredAppLocation | null>;
  refreshLocation: () => Promise<void>;
};

const AppLocationContext = createContext<AppLocationContextValue | null>(null);

function fromResolved(resolved: ResolvedLocation): StoredAppLocation {
  const display =
    [resolved.address, resolved.city, resolved.state].filter(Boolean).join(', ') ||
    resolved.city ||
    'Unknown location';

  return {
    display,
    city: resolved.city || resolved.district || resolved.address || '',
    state: resolved.state,
    coordinates: resolved.coordinates,
  };
}

function fromProfile(user: {
  location?: string;
  locationDetails?: {
    address?: string;
    city?: string;
    state?: string;
    coordinates?: [number, number];
  } | null;
}): StoredAppLocation | null {
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

async function persistToProfile(loc: StoredAppLocation) {
  try {
    const profile = await authService.getProfile();
    await authService.updateProfile({
      name: profile.name,
      phone: profile.phone || '',
      location: loc.display,
      locationData: {
        address: loc.display,
        city: loc.city,
        state: loc.state || '',
        coordinates: loc.coordinates,
      },
    });
  } catch {
    /* profile sync is best-effort */
  }
}

export function AppLocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<StoredAppLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const setLocation = useCallback(async (loc: StoredAppLocation) => {
    setLocationState(loc);
    await locationStorage.set(loc);
    await persistToProfile(loc);
  }, []);

  const detectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const resolved = await fetchLiveLocation();
      const loc = fromResolved(resolved);
      await setLocation(loc);
      return loc;
    } catch (error) {
      throw new Error(getLocationErrorMessage(error));
    } finally {
      setDetecting(false);
    }
  }, [setLocation]);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await locationStorage.get();
      if (stored?.city) {
        setLocationState(stored);
        return;
      }

      try {
        const profile = await authService.getProfile();
        const fromUser = fromProfile(profile);
        if (fromUser) {
          setLocationState(fromUser);
          await locationStorage.set(fromUser);
          return;
        }
      } catch {
        /* not logged in or profile failed */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const value = useMemo(
    () => ({
      location,
      loading,
      detecting,
      setLocation,
      detectLocation,
      refreshLocation,
    }),
    [location, loading, detecting, setLocation, detectLocation, refreshLocation]
  );

  return (
    <AppLocationContext.Provider value={value}>{children}</AppLocationContext.Provider>
  );
}

export function useAppLocation() {
  const ctx = useContext(AppLocationContext);
  if (!ctx) {
    throw new Error('useAppLocation must be used within AppLocationProvider');
  }
  return ctx;
}
