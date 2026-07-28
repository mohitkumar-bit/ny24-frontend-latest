import React from 'react';
import { Image } from 'expo-image';
import { ImageStyle, StyleSheet, StyleProp } from 'react-native';

interface LogoProps {
  size?: number;
  /** Square icon — splash, profile, etc. */
  variant?: 'square' | 'header';
  style?: StyleProp<ImageStyle>;
}

export const Logo = ({ size = 100, variant = 'square', style }: LogoProps) => {
  if (variant === 'header') {
    return (
      <Image
        source={require('@/assets/logo.png')}
        style={[styles.headerLogo, { height: size, width: size * 2.55 }, style]}
        contentFit="contain"
        accessibilityLabel="gigSEVA logo"
      />
    );
  }

  return (
    <Image
      source={require('@/assets/logo.png')}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.12,
        },
        style,
      ]}
      contentFit="contain"
      accessibilityLabel="gigSEVA logo"
    />
  );
};

const styles = StyleSheet.create({
  headerLogo: {
    flexShrink: 0,
  },
});
