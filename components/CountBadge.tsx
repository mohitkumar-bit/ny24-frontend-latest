import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type CountBadgeProps = {
  count: number;
  style?: StyleProp<ViewStyle>;
  max?: number;
};

/** Round unread/count badge for icons (tab bar, header bell, etc.). */
export function CountBadge({ count, style, max = 99 }: CountBadgeProps) {
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);
  const isWide = label.length > 1;

  return (
    <View style={[styles.badge, isWide && styles.badgeWide, style]}>
      <Text
        style={styles.text}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

const SIZE = 18;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  badgeWide: {
    width: undefined,
    minWidth: SIZE,
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 12 : 11,
    includeFontPadding: false,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : null),
  },
});
