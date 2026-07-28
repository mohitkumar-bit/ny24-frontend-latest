import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacyScreen() {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Last Updated: June 2026</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.text}>
              We collect information you provide directly to us, such as your name, email address, phone number, and location data when you use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Information</Text>
            <Text style={styles.text}>
              We use the information to connect job seekers with service providers, improve our app experience, and communicate with you about your account and our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
            <Text style={styles.text}>
              We share your contact information and location with other users only when necessary to facilitate a service connection (e.g., sharing a worker's location with a client).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Location Services</Text>
            <Text style={styles.text}>
              Our app requires access to your location to find nearby services. You can manage location permissions in your device settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.text}>
              We implement industry-standard security measures to protect your personal information from unauthorized access or disclosure.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Privacy is our priority at gigSEVA.</Text>
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
