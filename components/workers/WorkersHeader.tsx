import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationBar } from '@/components/home/LocationBar';

type WorkersHeaderProps = {
  onLocationPress: () => void;
};

export function WorkersHeader({ onLocationPress }: WorkersHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'ios' && { paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <LocationBar onPress={onLocationPress} />
      <Text style={styles.title}>Find Workers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
    letterSpacing: -0.5,
  },
});
