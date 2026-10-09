import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { CustomInput } from '@/components/CustomInput';
import { CustomButton } from '@/components/CustomButton';
import { authService } from '@/services/auth.service';
import { getPostAuthRoute } from '@/utils/locationNavigation';
import { useTranslation } from 'react-i18next';

const NAME_MAX = 25;

export default function SignupPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(t('auth.allFieldsRequired'));
      return;
    }
    if (phone.length !== 10) {
      setError(t('auth.phoneMustBe10Digits'));
      return;
    }
    if (!acceptedTerms) {
      setError(t('auth.acceptTermsError'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.sendOtp({
        phone,
        purpose: 'register',
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      setOtp('');
      setStep('otp');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'USER_EXISTS') {
        setError(t('auth.userExists'));
      } else {
        setError(err.response?.data?.message || t('auth.sendOtpFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(t('auth.allFieldsRequired'));
      return;
    }
    if (otp.length !== 6) {
      setError(t('auth.enterSixDigitOtp'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authService.verifyOtp({
        phone,
        otp,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      const nextRoute = await getPostAuthRoute(user);
      router.replace({ pathname: '/language', params: { onboarding: '1', next: nextRoute } } as any);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'USER_EXISTS') {
        setError(t('auth.userExists'));
      } else {
        setError(err.response?.data?.message || t('auth.invalidOtp'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FF9500', '#FFFFFF', '#FFFFFF', '#00A300']}
      locations={[0, 0.35, 0.65, 1]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Logo size={70} />
              <Text style={styles.title}>{t('auth.createAccount')}</Text>
              <Text style={styles.subtitle}>
                {step === 'details'
                  ? t('auth.signUpWithPhone')
                  : t('auth.otpSentToFinishRegistration', { phone })}
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.form}>
              {step === 'details' ? (
                <>
                  <CustomInput
                    label={t('auth.fullName')}
                    placeholder="Rahul Sharma"
                    value={name}
                    onChangeText={setName}
                    maxLength={NAME_MAX}
                    icon="person-outline"
                  />
                  <CustomInput
                    label={t('auth.email')}
                    placeholder="rahul.sharma@gmail.com"
                    value={email}
                    onChangeText={setEmail}
                    icon="mail-outline"
                    keyboardType="email-address"
                  />
                  <CustomInput
                    label={t('auth.phoneNumber')}
                    placeholder="9876543210"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    icon="call-outline"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <View style={styles.termsRow}>
                    <TouchableOpacity
                      onPress={() => setAcceptedTerms((v) => !v)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: acceptedTerms }}
                    >
                      <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                        {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.termsText}>
                      <Text onPress={() => setAcceptedTerms((v) => !v)}>{t('auth.termsAgreePrefix')}</Text>
                      <Text style={styles.termsLink} onPress={() => router.push('/terms' as any)}>
                        {t('auth.termsAndConditions')}
                      </Text>
                      <Text onPress={() => setAcceptedTerms((v) => !v)}>{t('auth.termsAnd')}</Text>
                      <Text style={styles.termsLink} onPress={() => router.push('/privacy' as any)}>
                        {t('auth.privacyPolicy')}
                      </Text>
                    </Text>
                  </View>
                  <CustomButton
                    title={t('auth.sendOtp')}
                    onPress={handleSendOtp}
                    loading={loading}
                    disabled={!acceptedTerms}
                  />
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
                  <CustomButton title={t('auth.verifyAndSignUp')} onPress={handleVerifyOtp} loading={loading} />
                  <TouchableOpacity
                    onPress={() => {
                      setStep('details');
                      setOtp('');
                      setError(null);
                    }}
                    style={styles.secondaryAction}>
                    <Text style={styles.signUpText}>{t('auth.editDetails')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSendOtp} style={styles.secondaryAction} disabled={loading}>
                    <Text style={styles.footerText}>{t('auth.resendOtp')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.haveAccount')} </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.signUpText}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  termsLink: {
    color: '#FF8C00',
    fontWeight: '700',
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
