import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { CustomInput } from '@/components/CustomInput';
import { CustomButton } from '@/components/CustomButton';
import { authService } from '@/services/auth.service';
import { getPostAuthRoute } from '@/utils/locationNavigation';

export default function SignupPage() {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('All fields are required');
      return;
    }
    if (phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
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
        setError('An account already exists with this number. Please sign in instead.');
      } else {
        setError(err.response?.data?.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('All fields are required');
      return;
    }
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
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
      router.replace(nextRoute as any);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'USER_EXISTS') {
        setError('An account already exists with this number. Please sign in instead.');
      } else {
        setError(err.response?.data?.message || 'Invalid OTP');
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                {step === 'details'
                  ? 'Sign up with your phone number'
                  : `OTP sent to +91 ${phone}. Enter OTP to finish registration.`}
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.form}>
              {step === 'details' ? (
                <>
                  <CustomInput
                    label="Full Name"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChangeText={setName}
                    icon="person-outline"
                  />
                  <CustomInput
                    label="Email"
                    placeholder="rahul.sharma@gmail.com"
                    value={email}
                    onChangeText={setEmail}
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <CustomInput
                    label="Phone Number"
                    placeholder="9876543210"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    icon="call-outline"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <CustomButton title="Send OTP" onPress={handleSendOtp} loading={loading} />
                </>
              ) : (
                <>
                  <CustomInput
                    label="Enter OTP"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                    icon="lock-closed-outline"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Text style={styles.hint}>Enter the OTP sent to your phone</Text>
                  <CustomButton title="Verify & Sign Up" onPress={handleVerifyOtp} loading={loading} />
                  <TouchableOpacity
                    onPress={() => {
                      setStep('details');
                      setOtp('');
                      setError(null);
                    }}
                    style={styles.secondaryAction}>
                    <Text style={styles.signUpText}>Edit details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSendOtp} style={styles.secondaryAction} disabled={loading}>
                    <Text style={styles.footerText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.signUpText}>Sign In</Text>
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
