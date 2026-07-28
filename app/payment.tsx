import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createPhonePeOrder,
  verifyPhonePeOrder,
} from '../services/subscription.service';

WebBrowser.maybeCompleteAuthSession();

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    plan?: string;
    amount?: string;
    merchantOrderId?: string;
  }>();
  const plan = params.plan;
  const [amount, setAmount] = useState(params.amount ? String(params.amount) : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState(
    params.merchantOrderId ? String(params.merchantOrderId) : ''
  );

  const finalizeSuccess = (orderId: string, paidAmount?: number) => {
    setTransactionId(orderId);
    if (paidAmount != null) setAmount(String(paidAmount));
    setIsSuccess(true);
  };

  const verifyOrder = useCallback(async (merchantOrderId: string, showPendingAlert = false) => {
    const result = await verifyPhonePeOrder(merchantOrderId);
    if (result.status === 'success') {
      finalizeSuccess(
        result.transaction?.transactionId || merchantOrderId,
        result.transaction?.amount
      );
      return true;
    }
    if (result.status === 'failed') {
      Alert.alert('Payment Failed', 'PhonePe reported this payment as failed. Please try again.');
      return false;
    }
    if (showPendingAlert) {
      Alert.alert(
        'Payment Pending',
        'We could not confirm the payment yet. If money was deducted, tap Verify Payment.'
      );
    }
    return false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const orderId = params.merchantOrderId ? String(params.merchantOrderId) : '';
      if (!orderId || isSuccess) return;
      setPendingOrderId(orderId);
      (async () => {
        try {
          setIsLoading(true);
          await verifyOrder(orderId, true);
        } catch (error: any) {
          Alert.alert('Verification Failed', String(error));
        } finally {
          setIsLoading(false);
        }
      })();
    }, [params.merchantOrderId, isSuccess, verifyOrder])
  );

  const openCheckout = async (checkoutUrl: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // WebBrowser is unreliable on web — go straight to PhonePe
      window.location.assign(checkoutUrl);
      return;
    }
    await WebBrowser.openBrowserAsync(checkoutUrl, {
      dismissButtonStyle: 'close',
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  const handlePay = async () => {
    if (!plan || plan === 'free') {
      Alert.alert('Select a plan', 'Please choose Pro or Business to continue.');
      return;
    }

    try {
      setIsLoading(true);

      const order = await createPhonePeOrder(String(plan));
      setAmount(String(order.amount));
      setPendingOrderId(order.merchantOrderId);

      if (!order.checkoutUrl) {
        throw new Error('No PhonePe checkout URL returned');
      }

      await openCheckout(order.checkoutUrl);

      // Native only: after in-app browser closes, verify.
      // Web navigates away to PhonePe and returns via redirect URL.
      if (Platform.OS !== 'web') {
        await verifyOrder(order.merchantOrderId, true);
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPending = async () => {
    if (!pendingOrderId) return;
    try {
      setIsLoading(true);
      await verifyOrder(pendingOrderId, true);
    } catch (error: any) {
      Alert.alert('Verification Failed', String(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={100} color="#00A300" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your {plan?.toString().toUpperCase()} plan is now active via PhonePe.
          </Text>

          <View style={styles.successCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid</Text>
              <Text style={styles.value}>₹{amount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order ID</Text>
              <Text style={[styles.value, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                {transactionId}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.replace('/subscription')}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PhonePe Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.phonePeBanner}>
          <Text style={styles.phonePeBannerText}>Secured by PhonePe · Sandbox</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Plan</Text>
            <Text style={styles.value}>{plan?.toString().toUpperCase()}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Gateway</Text>
            <Text style={styles.value}>PhonePe</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{amount || '—'}</Text>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <View style={styles.infoIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#00A300" />
          </View>
          <Text style={styles.infoText}>
            Tap Pay to open PhonePe. This is not a demo charge screen.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {pendingOrderId ? (
          <TouchableOpacity
            style={[styles.verifyBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleVerifyPending}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Payment</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.payBtn, isLoading && { opacity: 0.7 }]}
          activeOpacity={0.8}
          onPress={handlePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>
              {amount ? `Pay ₹${amount} with PhonePe` : 'Pay with PhonePe'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5f259f',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  phonePeBanner: {
    backgroundColor: '#5f259f',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  phonePeBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 24,
    color: '#00A300',
    fontWeight: '800',
  },
  paymentInfo: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  payBtn: {
    backgroundColor: '#5f259f',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifyBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  verifyBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconContainer: {
    marginBottom: 24,
    shadowColor: '#00A300',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  continueBtn: {
    width: '100%',
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
  continueBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
