import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { verificationService, VerificationInfo } from '@/services/verification.service';

type DocKey = 'selfie' | 'aadhaar' | 'pan';

const DOC_LABELS: Record<DocKey, { title: string; hint: string }> = {
  selfie: { title: 'Live selfie', hint: 'Take a photo with your camera (face clearly visible)' },
  aadhaar: { title: 'Aadhaar card', hint: 'Capture your Aadhaar card with camera' },
  pan: { title: 'PAN card', hint: 'Capture your PAN card with camera' },
};

export default function VerifyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState<VerificationInfo | null>(null);
  const [photos, setPhotos] = useState<Record<DocKey, string | null>>({
    selfie: null,
    aadhaar: null,
    pan: null,
  });

  const loadEligibility = async () => {
    try {
      setLoading(true);
      const data = await verificationService.getEligibility();
      setEligible(data.eligible);
      setMessage(data.message);
      setVerification(data.verification);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEligibility();
    }, [])
  );

  const capturePhoto = async (key: DocKey) => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera only', 'Please use the mobile app to capture verification photos.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to capture documents.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotos((prev) => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!photos.selfie || !photos.aadhaar || !photos.pan) {
      Alert.alert('Missing documents', 'Please capture all three photos using the camera.');
      return;
    }

    setSubmitting(true);
    try {
      await verificationService.submitDocuments(
        photos.selfie,
        photos.aadhaar,
        photos.pan
      );
      Alert.alert(
        'Submitted',
        'Your documents were submitted. An admin will review them within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to submit documents';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = verification?.status === 'pending';
  const isVerified = verification?.isVerified;
  const isRejected = verification?.status === 'rejected';
  const canSubmit = eligible && verification?.canSubmit && !isPending && !isVerified;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={28} color="#FF9500" />
          <Text style={styles.infoTitle}>Business plan verification</Text>
          <Text style={styles.infoText}>
            Available only for Business plan (₹599) subscribers. Use your camera to capture
            documents — gallery upload is not allowed.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF9500" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.statusMessage}>{message}</Text>

            {isVerified && (
              <View style={styles.statusCard}>
                <Ionicons name="checkmark-circle" size={48} color="#00A300" />
                <Text style={styles.statusCardTitle}>You are verified</Text>
              </View>
            )}

            {isPending && (
              <View style={styles.statusCard}>
                <Ionicons name="time" size={48} color="#FF9500" />
                <Text style={styles.statusCardTitle}>Under review</Text>
                <Text style={styles.statusCardSub}>
                  Please wait up to 24 hours for admin approval.
                  {verification?.hoursUntilReview
                    ? ` (~${verification.hoursUntilReview}h remaining)`
                    : ''}
                </Text>
              </View>
            )}

            {isRejected && (
              <View style={[styles.statusCard, styles.rejectedCard]}>
                <Ionicons name="close-circle" size={48} color="#FF4D4D" />
                <Text style={styles.statusCardTitle}>Verification rejected</Text>
                {verification?.rejectionReason ? (
                  <Text style={styles.statusCardSub}>{verification.rejectionReason}</Text>
                ) : null}
              </View>
            )}

            {canSubmit && (
              <>
                {(Object.keys(DOC_LABELS) as DocKey[]).map((key) => (
                  <View key={key} style={styles.docSection}>
                    <Text style={styles.docTitle}>{DOC_LABELS[key].title}</Text>
                    <Text style={styles.docHint}>{DOC_LABELS[key].hint}</Text>
                    <TouchableOpacity
                      style={styles.captureBtn}
                      onPress={() => capturePhoto(key)}
                    >
                      <Ionicons name="camera" size={22} color="#FF9500" />
                      <Text style={styles.captureBtnText}>
                        {photos[key] ? 'Retake photo' : 'Open camera'}
                      </Text>
                    </TouchableOpacity>
                    {photos[key] && (
                      <Image source={{ uri: photos[key]! }} style={styles.preview} />
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit for verification</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {!eligible && !isVerified && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => router.push('/subscription' as any)}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Business plan</Text>
              </TouchableOpacity>
            )}
          </>
        )}
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
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 12,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  infoBox: {
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, color: '#000' },
  infoText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  statusMessage: { fontSize: 14, color: '#475569', marginBottom: 16, textAlign: 'center' },
  statusCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 20,
  },
  rejectedCard: { backgroundColor: '#FFF5F5' },
  statusCardTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  statusCardSub: { fontSize: 13, color: '#64748B', marginTop: 8, textAlign: 'center' },
  docSection: { marginBottom: 20 },
  docTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  docHint: { fontSize: 12, color: '#94A3B8', marginBottom: 10 },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  captureBtnText: { color: '#FF9500', fontWeight: '600' },
  preview: { width: '100%', height: 160, borderRadius: 12, marginTop: 10 },
  submitBtn: {
    backgroundColor: '#00A300',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  upgradeBtn: {
    backgroundColor: '#FF9500',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
