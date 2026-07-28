import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VerifiedBadgeProps {
  size?: number;
  style?: ViewStyle;
}

export const VerifiedBadge = ({ size = 18, style }: VerifiedBadgeProps) => (
  <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }, style]}>
    <Ionicons name="checkmark" size={size * 0.6} color="#fff" />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#1D9BF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
