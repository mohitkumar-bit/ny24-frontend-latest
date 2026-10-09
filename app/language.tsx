import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type AppLanguage } from '@/i18n';
import { setAppLanguage } from '@/services/languageSync';
import { CustomButton } from '@/components/CustomButton';

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { onboarding, next } = useLocalSearchParams<{ onboarding?: string; next?: string }>();
  // Shown once right after registration, before location setup / home
  const isOnboarding = onboarding === '1';
  const [saving, setSaving] = React.useState(false);

  const handleSelect = (code: AppLanguage) => {
    if (code === i18n.language) return;
    void setAppLanguage(code);
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await setAppLanguage(i18n.language as AppLanguage);
    } finally {
      setSaving(false);
      router.replace((next || '/(tabs)') as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          {isOnboarding ? (
            <View style={{ width: 40 }} />
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{t('language.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {isOnboarding ? t('language.onboardingSubtitle') : t('language.subtitle')}
          </Text>

          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = i18n.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {lang.nativeName}
                </Text>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? '#FF9500' : '#CBD5E1'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {isOnboarding ? (
          <View style={styles.footer}>
            <CustomButton title={t('language.continue')} onPress={handleContinue} loading={saving} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF5E6',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#FF9500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
