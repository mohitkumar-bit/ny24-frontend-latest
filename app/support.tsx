import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function SupportScreen() {
  const router = useRouter();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@ny.com');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+911234567890');
  };

  const FAQItem = ({ question, answer }: { question: string, answer: string }) => (
    <View style={styles.faqItem}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );

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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
              <View style={[styles.iconCircle, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="mail" size={24} color="#0288D1" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactValue}>support@gigseva.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={handleCallSupport}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="call" size={24} color="#388E3C" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Call Us</Text>
                <Text style={styles.contactValue}>+91 12345 67890</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <FAQItem
              question="How do I post a job?"
              answer="Tap the '+' floating button on the home screen to start creating your job post."
            />
           
            <FAQItem
              question="How do I contact a worker?"
              answer="View the job details and use the 'Chat' or 'Call' buttons to connect directly."
            />
            <FAQItem
              question="How do I become a worker?"
              answer="Go to your Profile and tap 'Become a Worker' to set up your professional profile."
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>We're here to help you 24/7.</Text>
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
  contactSection: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  faqSection: {
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
