import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationBar } from '@/components/home/LocationBar';
import { Logo } from '@/components/Logo';
import { CountBadge } from '@/components/CountBadge';

type HomeHeaderProps = {
  unreadCount?: number;
  onNotificationPress?: () => void;
  onLocationPress?: () => void;
};

export const HomeHeader = ({
  unreadCount = 0,
  onNotificationPress,
  onLocationPress,
}: HomeHeaderProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Logo size={40} />
        <TouchableOpacity style={styles.notificationBtn} onPress={onNotificationPress}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={24} color="#000" />
            <CountBadge count={unreadCount} style={styles.badge} />
          </View>
        </TouchableOpacity>
      </View>

      {onLocationPress && <LocationBar onPress={onLocationPress} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationBtn: {
    flexShrink: 0,
    padding: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    top: -4,
    right: -6,
  },
});
