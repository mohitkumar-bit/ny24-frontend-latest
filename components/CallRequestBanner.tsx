import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  callRequestService,
  CallRequestItem,
} from '@/services/callRequest.service';

interface CallRequestBannerProps {
  requests: CallRequestItem[];
  onUpdate: () => void;
}

export const CallRequestBanner = ({ requests, onUpdate }: CallRequestBannerProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!requests.length) return null;

  const handleCall = async (request: CallRequestItem) => {
    setLoadingId(request._id);
    try {
      const { phone, requesterName } = await callRequestService.accept(request._id);
      onUpdate();
      Linking.openURL(`tel:${phone}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not start call');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await callRequestService.decline(requestId);
      onUpdate();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not decline request');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Call requests</Text>
      {requests.map((request) => (
        <View key={request._id} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="call" size={20} color="#FF9500" />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{request.requester.name} wants to call you</Text>
            {request.sourceTitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                via {request.sourceTitle}
              </Text>
            ) : null}
            <Text style={styles.hint}>Phone number hidden until you tap Call</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(request)}
              disabled={loadingId === request._id}
            >
              {loadingId === request._id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.callBtnText}>Call</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleDecline(request._id)}
              disabled={loadingId === request._id}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  hint: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00A300',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    justifyContent: 'center',
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  declineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
