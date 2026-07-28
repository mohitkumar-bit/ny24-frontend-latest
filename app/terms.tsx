import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#ffffffff', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.15 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Last Updated: June 2026</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.text}>
              By accessing and using the gigSEVA application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. User Accounts</Text>
            <Text style={styles.text}>
              You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility. You must be at least 18 years old to use this service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Service Rules</Text>
            <Text style={styles.text}>
              Workers must provide accurate information regarding their skills and experience. Job seekers must provide valid service requests. We reserve the right to suspend accounts that violate our community guidelines.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Payments</Text>
            <Text style={styles.text}>
              gigSEVA provides a platform for connection. Payment terms are negotiated directly between the worker and the client unless specified otherwise. We are not responsible for payment disputes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Limitation of Liability</Text>
            <Text style={styles.text}>
              gigSEVA shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Contact legal@gigseva.com for inquiries.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#999',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#CCC',
  },
});
