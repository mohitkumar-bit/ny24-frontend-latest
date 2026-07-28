import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptionStatus } from '../services/subscription.service';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Skeleton } from '@/components/Skeleton';

type SubscriptionInfo = {
  plan?: 'free' | 'pro' | 'business';
  status?: 'active' | 'expired' | 'cancelled';
  endDate?: string;
  startDate?: string;
  billingCycle?: string;
};

const formatExpiryDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  price: string;
  priceLabel: string;
  features: string[];
  isPopular?: boolean;
  color: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'Free',
    priceLabel: 'Free',
    color: '#000',
    features: [
      '1 post per month',
      '3 chat slots only',
      'Basic search placement',
      'Standard support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹99',
    priceLabel: '₹99/month',
    isPopular: true,
    color: '#FF9500',
    features: [
      'Unlimited chat messaging',
      '1 featured post per month',
      'Priority placement',
      'Priority support',
      'Enhanced visibility in search results',
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: '₹599',
    priceLabel: '₹599/6-months',
    color: '#000',
    features: [
      'Unlimited chat messaging',
      '3 featured posts per month',
      'Top search placement',
      'Verified business account badge',
      'Advanced analytics dashboard',
      'Enhanced visibility in search results',
      'Priority support',

    ]
  }
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'business'>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);

  React.useEffect(() => {
    fetchStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  const fetchStatus = async () => {
    try {
      const { subscription } = await getSubscriptionStatus();
      setCurrentSubscription(subscription);
      const plan = subscription?.plan || 'free';
      setSelectedPlan(plan);
    } catch (error) {
      console.log('Error fetching status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const activePlan = PLANS.find(p => p.id === selectedPlan)!;
  const currentPlanId = currentSubscription?.plan ?? 'free';
  const isCurrentPlan = !statusLoading && selectedPlan === currentPlanId;
  const isPaidPlan = currentPlanId === 'pro' || currentPlanId === 'business';
  const expiryLabel = formatExpiryDate(currentSubscription?.endDate);
  const isActiveSubscription = currentSubscription?.status === 'active';

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      router.back();
      return;
    }

    const amount = selectedPlan === 'pro' ? 99 : 599;
    router.push({
      pathname: '/payment',
      params: {
        plan: selectedPlan,
        amount: String(amount),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#FFF8EE', '#FFFFFF']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroIconContainer}>
            <LinearGradient
              colors={['#FF9500', '#FFD200']}
              style={styles.heroIcon}
            >
              <Ionicons name="ribbon" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Choose Your Plan</Text>
          <Text style={styles.heroSubtitle}>Unlock priority placement, more ads, and Pro badge</Text>
        </View>

        {!statusLoading && isPaidPlan && expiryLabel ? (
          <View style={styles.expiryBanner}>
            <Ionicons name="calendar-outline" size={20} color="#FF9500" />
            <View style={styles.expiryBannerText}>
              <Text style={styles.expiryBannerTitle}>
                {currentPlanId === 'pro' ? 'Pro' : 'Business'} plan
              </Text>
              <Text style={styles.expiryBannerDate}>
                {isActiveSubscription
                  ? `Expires on ${expiryLabel}`
                  : `Expired on ${expiryLabel}`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {statusLoading ? (
            <>
              <View style={styles.planCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={80} height={18} borderRadius={4} />
                    <Skeleton width={120} height={26} borderRadius={4} />
                  </View>
                  <Skeleton width={24} height={24} borderRadius={12} />
                </View>
                <View style={styles.divider} />
                <View style={styles.featuresList}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.featureRow}>
                      <Skeleton width={20} height={20} borderRadius={10} />
                      <Skeleton width="75%" height={14} borderRadius={4} style={{ marginLeft: 12 }} />
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.planCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={60} height={18} borderRadius={4} />
                    <Skeleton width={140} height={26} borderRadius={4} />
                  </View>
                  <Skeleton width={24} height={24} borderRadius={12} />
                </View>
                <View style={styles.divider} />
                <View style={styles.featuresList}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={styles.featureRow}>
                      <Skeleton width={20} height={20} borderRadius={10} />
                      <Skeleton width="80%" height={14} borderRadius={4} style={{ marginLeft: 12 }} />
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : PLANS.filter(p => {
            const levels: Record<string, number> = { free: 0, pro: 1, business: 2 };
            return levels[p.id] >= levels[currentPlanId as string];
          }).map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  isSelected && { borderColor: plan.color, borderWidth: 2 }
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                {/* {plan.isPopular && plan.id !== currentPlanId && (
                  <View style={styles.popularBadgeInline}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                )} */}

                <View style={styles.cardHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.planName, isSelected && { color: plan.color }]}>{plan.name}</Text>
                      {plan.id === currentPlanId && (
                        <View style={styles.currentPlanBadge}>
                          <Text style={styles.currentPlanBadgeText}>CURRENT</Text>
                        </View>
                      )}
                      {/* {plan.isPopular && plan.id === currentPlanId && (
                        <View style={styles.popularBadgeInline}>
                          <Text style={styles.popularBadgeText}>POPULAR</Text>
                        </View>
                      )} */}
                    </View>
                    <Text style={[styles.planPrice, isSelected && { color: plan.color }]}>
                      {plan.priceLabel}
                    </Text>
                    {plan.id === currentPlanId && isPaidPlan && expiryLabel ? (
                      <Text style={styles.planExpiry}>
                        {isActiveSubscription ? 'Expires' : 'Expired'}: {expiryLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.radioCircle, isSelected && { borderColor: plan.color }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: plan.color }]} />}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#00A300" />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.footer}>
        {statusLoading ? (
          <Skeleton width="100%" height={56} borderRadius={16} />
        ) : (
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            (isLoading || isCurrentPlan) && { opacity: 0.7, backgroundColor: isCurrentPlan ? '#64748B' : '#00A300' }
          ]}
          activeOpacity={0.8}
          onPress={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeBtnText}>
              {isCurrentPlan
                ? 'Current Plan'
                : (currentPlanId === 'free'
                  ? (selectedPlan === 'free' ? 'Continue with Free' : `Subscribe to ${activePlan.name}`)
                  : `Upgrade to ${activePlan.name}`)
              }
            </Text>
          )}
        </TouchableOpacity>
        )}
        <Text style={styles.footerDisclaimer}>Cancel anytime • Secured by PhonePe</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    position: 'relative',
  },
  heroIconContainer: {
    marginBottom: 20,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: '80%',
    opacity: 0.8,
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FFEAD1',
  },
  expiryBannerText: {
    flex: 1,
  },
  expiryBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  expiryBannerDate: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 20,
    marginTop: 10,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadgeInline: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentPlanBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentPlanBadgeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  planExpiry: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 6,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 12,
    opacity: 0.8,
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subscribeBtn: {
    backgroundColor: '#00A300',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerDisclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '500',
  },
});
