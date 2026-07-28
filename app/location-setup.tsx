import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Logo } from '@/components/Logo';
import { LocationPickerModal } from '@/components/home/LocationPickerModal';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { locationStorage } from '@/services/locationStorage';
import { needsLocationSetup } from '@/utils/locationNavigation';

type SetupPhase = 'checking' | 'detecting' | 'manual';

export default function LocationSetupScreen() {
  const router = useRouter();
  const { detectLocation, location } = useAppLocation();
  const [phase, setPhase] = useState<SetupPhase>('checking');
  const hasNavigated = useRef(false);

  const goToTabs = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace('/(tabs)' as any);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stillNeeds = await needsLocationSetup();
      if (!stillNeeds) {
        goToTabs();
        return;
      }

      if (cancelled) return;
      setPhase('detecting');

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const detected = await detectLocation();
          if (detected?.city?.trim()) {
            await locationStorage.markSetupComplete();
            goToTabs();
            return;
          }
        }
      } catch {
        // User can pick location manually below.
      }

      if (!cancelled) {
        setPhase('manual');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detectLocation]);

  useEffect(() => {
    if (!location?.city?.trim()) return;
    void locationStorage.markSetupComplete().then(goToTabs);
  }, [location?.city]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF', '#00A300']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {phase !== 'manual' ? (
          <View style={styles.center}>
            <Logo size={72} />
            <Text style={styles.title}>Enable your location</Text>
            <Text style={styles.subtitle}>
              Allow location access so we can show jobs and workers near you.
            </Text>
            <ActivityIndicator size="large" color="#FF9500" style={styles.loader} />
            <Text style={styles.status}>
              {phase === 'checking' ? 'Getting started…' : 'Detecting your location…'}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      <LocationPickerModal
        visible={phase === 'manual'}
        required
        isFirstTime
        onLocationSet={goToTabs}
        onClose={() => {
          if (location?.city?.trim()) {
            goToTabs();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
  loader: {
    marginTop: 32,
  },
  status: {
    marginTop: 14,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
