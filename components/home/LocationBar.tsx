import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { StoredAppLocation } from '@/services/locationStorage';

type LocationBarProps = {
  onPress: () => void;
};

export function formatLocationDisplay(location: StoredAppLocation | null): string {
  if (!location) return 'Set your location';

  const city = location.city?.trim();
  const parts = location.display
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return location.display;

  const area = parts[0];
  if (city && area.toLowerCase() !== city.toLowerCase()) {
    return `${area}, ${city}`;
  }

  return parts.slice(0, 2).join(', ');
}

export function LocationBar({ onPress }: LocationBarProps) {
  const { location, loading } = useAppLocation();

  const label = loading ? 'Detecting location...' : formatLocationDisplay(location);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons name="location" size={18} color="#00A300" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>Your location</Text>
        <View style={styles.valueRow}>
          {loading ? (
            <ActivityIndicator size="small" color="#00A300" style={styles.loader} />
          ) : null}
          <Text style={styles.value} numberOfLines={1}>
            {label}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#334155" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loader: {
    marginRight: 4,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
});
