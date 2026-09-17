import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface FeedBannerProps {
  uri: string;
  height?: number;
}

export const BANNER_HEIGHT = 420;

export function FeedBanner({ uri, height = BANNER_HEIGHT }: FeedBannerProps) {
  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      <Image source={{ uri }} style={styles.banner} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
});
