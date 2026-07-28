import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LocationBar } from '@/components/home/LocationBar';

type WorkersHeaderProps = {
  onLocationPress: () => void;
};

export function WorkersHeader({ onLocationPress }: WorkersHeaderProps) {
  return (
    <View style={styles.container}>
      <LocationBar onPress={onLocationPress} />
      <Text style={styles.title}>Find Workers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
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
