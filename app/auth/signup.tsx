import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { CustomInput } from '@/components/CustomInput';
import { CustomButton } from '@/components/CustomButton';
import { authService } from '@/services/auth.service';
import { getPostAuthRoute } from '@/utils/locationNavigation';
import { getPasswordChecks, PasswordRequirements } from '@/components/PasswordRequirements';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleSignup = async () => {
    if (!name || !email || !phone || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!getPasswordChecks(password).isValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authService.signUp({ name, email, phone, password });
      const nextRoute = await getPostAuthRoute(user);
      router.replace(nextRoute as any);
    } catch (err: any) {
      console.error("Signup Error:", err);
      setError(err.response?.data?.message || 'Failed to create account');
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
              <Text style={styles.subtitle}>Sign up to get started</Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.form}>
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
              <CustomInput
                label="Password"
                placeholder="••••••••••"
                value={password}
                onChangeText={setPassword}
                icon="lock-closed-outline"
                isPassword
              />
              <PasswordRequirements password={password} />

              <CustomButton
                title="Sign Up"
                onPress={handleSignup}
                loading={loading}
              />

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
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});
