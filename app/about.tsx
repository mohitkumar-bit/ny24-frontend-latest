import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '@/components/Logo';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#ffffffff', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Us</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <Logo size={88} />
            <Text style={styles.appName}>gigSEVA</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.text}>
              gigSEVA is dedicated to connecting skilled workers with those who need their expertise.
              Our mission is to create a seamless, reliable, and efficient marketplace for services,
              empowering individuals to grow their businesses and find quality assistance whenever needed.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Post a Job</Text>
                <Text style={styles.stepText}>Describe the service you need and your location.</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Connect with Pros</Text>
                <Text style={styles.stepText}>Experienced workers will reach out to help you.</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Get it Done</Text>
                <Text style={styles.stepText}>Quality service delivered right to your doorstep.</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 gigSEVA Inc. All rights reserved.</Text>
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
  logoSection: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF9500',
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  text: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#CCC',
  },
});
