import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Logo } from '@/components/Logo';
import { CustomInput } from '@/components/CustomInput';
import { CustomButton } from '@/components/CustomButton';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/services/tokenStorage';
import { getPostAuthRoute } from '@/utils/locationNavigation';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { useTranslation } from 'react-i18next';
import type { User } from '@/types';

export default function LoginPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { detectLocation } = useAppLocation();

  const finishLogin = async (user: User) => {
    const nextRoute = await getPostAuthRoute(user);
    // Location setup detects on its own; otherwise refresh the saved location in the background.
    if (nextRoute === '/(tabs)') {
      void detectLocation().catch(() => undefined);
    }
    router.replace(nextRoute as any);
  };

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const reason = await tokenStorage.getLogoutReason();
        if (reason === 'session_replaced') {
          setError(t('auth.sessionReplaced'));
          await tokenStorage.clearLogoutReason();
        } else {
          await tokenStorage.clearLogoutReason();
          setError(null);
        }
      })();
    }, [])
  );

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authService.sendOtp({ phone, purpose: 'login' });
      if (result.bypassOtp && result.user) {
        await finishLogin(result.user);
        return;
      }
      setOtp('');
      setStep('otp');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'NOT_VERIFIED') {
        setError(t('auth.notVerified'));
      } else if (code === 'USER_NOT_FOUND') {
        setError(t('auth.userNotFound'));
      } else {
        setError(err.response?.data?.message || t('auth.sendOtpFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t('auth.enterSixDigitOtp'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authService.verifyOtp({ phone, otp });
      await finishLogin(user);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'NOT_VERIFIED') {
        setError(t('auth.notVerified'));
      } else {
        setError(err.response?.data?.message || t('auth.invalidOtp'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF', '#00A300']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Logo size={70} />
              <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
              <Text style={styles.subtitle}>
                {step === 'phone' ? t('auth.signInWithPhone') : t('auth.otpSentTo', { phone })}
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.form}>
              {step === 'phone' ? (
                <>
                  <CustomInput
                    label={t('auth.phoneNumber')}
                    placeholder="9876543210"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    icon="call-outline"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <CustomButton title={t('auth.sendOtp')} onPress={handleSendOtp} loading={loading} />
                </>
              ) : (
                <>
                  <CustomInput
                    label={t('auth.enterOtp')}
                    placeholder={t('auth.otpPlaceholder')}
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                    icon="lock-closed-outline"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Text style={styles.hint}>{t('auth.otpHint')}</Text>
                  <CustomButton title={t('auth.verifyAndSignIn')} onPress={handleVerifyOtp} loading={loading} />
                  <TouchableOpacity onPress={handleSendOtp} style={styles.secondaryAction} disabled={loading}>
                    <Text style={styles.footerText}>{t('auth.resendOtp')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
                <TouchableOpacity onPress={() => router.push('/auth/signup' as any)}>
                  <Text style={styles.signUpText}>{t('auth.signUp')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '400',
  },
  form: {
    width: '100%',
    paddingHorizontal: 5,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  secondaryAction: {
    alignItems: 'center',
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 16,
    color: '#1E293B',
  },
  signUpText: {
    fontSize: 16,
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
