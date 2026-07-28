import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const TAB_BAR_CONTENT_HEIGHT = 60;

export const FloatingButton = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomOffset = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 10) + 16;

  return (
    <TouchableOpacity
      style={[styles.button, { bottom: bottomOffset }]}
      activeOpacity={0.8}
      onPress={() => router.push('/create-post' as any)}
    >
      <Ionicons name="add" size={26} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 25,
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 10000,
  },
});
