import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LimitModal } from '@/components/LimitModal';

export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const verifyMessage = t('verify.message');
  const [showModal, setShowModal] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setShowModal(true);
    }, [])
  );

  const handleClose = () => {
    setShowModal(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verify.headerTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="shield-checkmark-outline" size={56} color="#FF9500" />
        <Text style={styles.title}>{t('verify.title')}</Text>
        <Text style={styles.message}>{verifyMessage}</Text>
      </View>

      <LimitModal
        visible={showModal}
        onClose={handleClose}
        title={t('verify.title')}
        message={verifyMessage}
        icon="shield-checkmark-outline"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 12,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
