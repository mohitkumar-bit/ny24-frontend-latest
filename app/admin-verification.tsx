import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminVerificationService } from '@/services/verification.service';

export default function AdminVerificationScreen() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<any[]>([]);

  const loadPending = async () => {
    if (!secret.trim()) {
      Alert.alert('Admin secret required');
      return;
    }
    setLoading(true);
    try {
      const list = await adminVerificationService.listPending(secret.trim());
      setPending(list);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, canApprove: boolean) => {
    if (!canApprove) {
      Alert.alert('Wait 24 hours', 'This submission must wait 24 hours before approval.');
      return;
    }
    try {
      await adminVerificationService.approve(userId, secret.trim());
      Alert.alert('Approved', 'User is now verified.');
      loadPending();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await adminVerificationService.reject(userId, secret.trim(), 'Aadhaar could not be verified');
      Alert.alert('Rejected', 'User was notified to resubmit.');
      loadPending();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin — Verifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Enter ADMIN_SECRET from server .env</Text>
        <TextInput
          style={styles.input}
          placeholder="Admin secret"
          secureTextEntry
          value={secret}
          onChangeText={setSecret}
        />
        <TouchableOpacity style={styles.loadBtn} onPress={loadPending}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loadBtnText}>Load pending</Text>
          )}
        </TouchableOpacity>

        {pending.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.meta}>
              Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '—'}
            </Text>
            <Text style={[styles.meta, item.canApprove ? styles.ready : styles.wait]}>
              {item.canApprove ? 'Ready to approve' : 'Waiting for 24h window'}
            </Text>
            {item.maskedAadhaar ? (
              <Text style={styles.meta}>Aadhaar: {item.maskedAadhaar}</Text>
            ) : null}
            {item.selfieUrl ? (
              <Image source={{ uri: item.selfieUrl }} style={styles.thumb} />
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.approveBtn, !item.canApprove && { opacity: 0.5 }]}
                onPress={() => handleApprove(item.id, item.canApprove)}
              >
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  loadBtn: {
    backgroundColor: '#FF9500',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  name: { fontSize: 16, fontWeight: '700' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  meta: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  ready: { color: '#00A300', fontWeight: '600' },
  wait: { color: '#FF9500', fontWeight: '600' },
  thumb: { width: '100%', height: 120, borderRadius: 8, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: {
    flex: 1,
    backgroundColor: '#00A300',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '700' },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectText: { color: '#DC2626', fontWeight: '700' },
});
