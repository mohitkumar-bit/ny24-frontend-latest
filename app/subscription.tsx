import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PROFESSIONAL_TOOLS_INACTIVE_MESSAGE,
  PROFESSIONAL_TOOLS_INACTIVE_TITLE,
} from '@/utils/professionalTools';

/** Subscription / payment screens are disabled in the app. */
export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Keep deep links from crashing; surface the inactive notice.
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#0F172A" />
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={36} color="#FF9500" />
        </View>
        <Text style={styles.title}>{PROFESSIONAL_TOOLS_INACTIVE_TITLE}</Text>
        <Text style={styles.message}>{PROFESSIONAL_TOOLS_INACTIVE_MESSAGE}</Text>
        <TouchableOpacity style={styles.okBtn} onPress={() => router.back()}>
          <Text style={styles.okText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  okBtn: {
    backgroundColor: '#FF9500',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  okText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
