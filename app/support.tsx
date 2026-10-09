import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const SUPPORT_EMAIL = 'supportgigseva@gmail.com';

export default function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
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
          <Text style={styles.headerTitle}>{t('support.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>{t('support.getInTouch')}</Text>
            <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
              <View style={[styles.iconCircle, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="mail" size={24} color="#0288D1" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{t('support.emailUs')}</Text>
                <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>{t('support.faqTitle')}</Text>
            <FAQItem
              question={t('support.faq.postJobQuestion')}
              answer={t('support.faq.postJobAnswer')}
            />
           
            <FAQItem
              question={t('support.faq.contactWorkerQuestion')}
              answer={t('support.faq.contactWorkerAnswer')}
            />
            <FAQItem
              question={t('support.faq.becomeWorkerQuestion')}
              answer={t('support.faq.becomeWorkerAnswer')}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('support.footer')}</Text>
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
