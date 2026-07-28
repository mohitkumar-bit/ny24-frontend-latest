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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const reason = await tokenStorage.getLogoutReason();
        if (reason === 'session_replaced') {
          setError('Your account was logged in on another device. Please sign in again.');
          await tokenStorage.clearLogoutReason();
        } else {
          // Clear any stale reason so first open / normal expiry stay clean
          await tokenStorage.clearLogoutReason();
          setError(null);
        }
      })();
    }, [])
  );

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authService.login({ email, password });
      const nextRoute = await getPostAuthRoute(user);
      router.replace(nextRoute as any);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient - Absolutely positioned to prevent shifting */}
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
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.form}>
              <CustomInput
                label="Email"
                placeholder="rahul.sharma@gmail.com"
                value={email}
                onChangeText={setEmail}
                icon="mail-outline"
                keyboardType="email-address"
              />
              <CustomInput
                label="Password"
                placeholder="••••••••••"
                value={password}
                onChangeText={setPassword}
                icon="lock-closed-outline"
                isPassword
              />

              <CustomButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/signup" as any)}>
                  <Text style={styles.signUpText}>Sign Up</Text>
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
    marginBottom: 30,
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
