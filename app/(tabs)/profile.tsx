import React from 'react';
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
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '@/services/auth.service';
import { handleAuthFailure } from '@/services/authSession';
import { Skeleton } from '@/components/Skeleton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { LimitModal } from '@/components/LimitModal';
import type { User } from '@/types';

const ProfileMenuItem = ({
  icon,
  title,
  onPress,
  textColor = '#000',
  iconColor = '#000'
}: {
  icon: keyof typeof Ionicons.glyphMap,
  title: string,
  onPress: () => void,
  textColor?: string,
  iconColor?: string
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      <Ionicons name={icon} size={22} color={iconColor} style={styles.menuIcon} />
      <Text style={[styles.menuTitle, { color: textColor }]}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = React.useState(false);
  const [showVerifyUpgradeModal, setShowVerifyUpgradeModal] = React.useState(false);
  const [showVerifyPendingModal, setShowVerifyPendingModal] = React.useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = React.useState(false);
  const [showViewPhoto, setShowViewPhoto] = React.useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = React.useState(false);
  const [showDeleteAccountSuccess, setShowDeleteAccountSuccess] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (error) {
      const redirected = await handleAuthFailure(error);
      if (!redirected) {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const pickFromGallery = async () => {
    setShowPhotoOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    setShowPhotoOptions(false);
    if (Platform.OS === 'web') {
      Alert.alert('Camera unavailable', 'Please choose a photo from your gallery on web.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const updatedUser = await authService.uploadProfilePicture(uri);
      setUser(updatedUser);
      Alert.alert('Success', 'Profile picture updated.');
    } catch (err: any) {
      const raw = err.response?.data;
      const status = err.response?.status;
      const asText = typeof raw === 'string' ? raw : raw?.message || err.message || '';
      const isTooLarge =
        status === 413 ||
        /413|Request Entity Too Large|too large/i.test(String(asText));

      Alert.alert(
        'Upload failed',
        isTooLarge
          ? 'Photo is too large for the server. Try a smaller image or lower quality photo.'
          : (typeof raw === 'object' && raw?.message) ||
              (typeof asText === 'string' && !asText.includes('<html')
                ? asText
                : 'Could not update profile picture. Try again.')
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const updatedUser = await authService.removeProfilePicture();
      setUser(updatedUser);
    } catch (err: any) {
      Alert.alert(
        'Remove failed',
        err.response?.data?.message || 'Could not remove profile picture. Try again.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoOptions(false);
    setShowRemovePhotoConfirm(true);
  };

  const handleViewPhoto = () => {
    setShowPhotoOptions(false);
    setShowViewPhoto(true);
  };

  const confirmRemovePhoto = () => {
    setShowRemovePhotoConfirm(false);
    removeProfilePhoto();
  };

  const confirmDeleteAccount = () => {
    setShowDeleteAccountConfirm(false);
    setShowDeleteAccountSuccess(true);
  };

  const handleVerifyPress = () => {
    if (user?.isVerified) return;

    if (user?.verificationStatus === 'pending') {
      setShowVerifyPendingModal(true);
      return;
    }

    if (user?.canVerify) {
      router.push('/verify' as any);
      return;
    }

    setShowVerifyUpgradeModal(true);
  };

  const currentPlanLabel =
    user?.subscription?.plan === 'business'
      ? 'Business'
      : user?.subscription?.plan === 'pro'
        ? 'Pro'
        : 'Free';

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FF9500', '#FFFFFF', '#FFFFFF']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* User Section */}
          <View style={styles.userSection}>
            {loading ? (
              <>
                <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 15 }} />
                <Skeleton width={160} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
                <Skeleton width={200} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={140} height={14} borderRadius={4} style={{ marginBottom: 20 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.avatarWrap}
                  onPress={() => setShowPhotoOptions(true)}
                  disabled={uploadingPhoto}
                  activeOpacity={0.85}
                >
                  {user?.profilePicture ? (
                    <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient
                      colors={['#FF9500', '#FFD200']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.cameraBadge}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoHint}>Tap photo to update</Text>

                <View style={styles.nameRow}>
                  <Text style={styles.name}>{user?.name}</Text>
                  {user?.isVerified ? (
                    <VerifiedBadge size={20} />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.verifyChip,
                        user?.verificationStatus === 'pending' && styles.verifyChipPending,
                      ]}
                      onPress={handleVerifyPress}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="shield-checkmark" size={12} color="#fff" />
                      <Text style={styles.verifyChipText}>
                        {user?.verificationStatus === 'pending' ? 'Pending' : 'Verify'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.email}>{user?.email}</Text>

                <View style={styles.locationContainer}>
                  <Ionicons name="location-sharp" size={16} color="#ccc" />
                  <Text style={styles.locationText}>
                    {user?.location || 'Location not set'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/edit-profile' as any)}
                >
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                {!user?.isWorker && (
                  <TouchableOpacity
                    style={styles.workerBtn}
                    onPress={() => router.push('/worker-register' as any)}
                  >
                    <LinearGradient
                      colors={['#FF9500', '#FFB800']}
                      style={styles.workerBtnGradient}
                    >
                      <Ionicons name="briefcase" size={20} color="#fff" />
                      <Text style={styles.workerBtnText}>Become a Worker</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>My Ads</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Worker Profile Detail Section */}

          {/* Menu Section */}
          <View style={styles.menuSection}>
            <ProfileMenuItem
              icon="megaphone-outline"
              title="My Ads"
              onPress={() => router.push('/my-ads' as any)}
            />
            {!loading && user?.isWorker && (
              <ProfileMenuItem
                icon="briefcase-outline"
                title="Working Profile"
                onPress={() => router.push('/worker-profile' as any)}
              />
            )}
            <ProfileMenuItem
              icon="star-outline"
              title="Subscription"
              onPress={() => router.push('/subscription' as any)}
            />
            <ProfileMenuItem
              icon="bookmark-outline"
              title="Saved Jobs"
              onPress={() => router.push('/saved' as any)}
            />
            <ProfileMenuItem
              icon="lock-closed-outline"
              title="Change Password"
              onPress={() => router.push('/change-password' as any)}
            />

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionSubtitle}>Support & Legal</Text>

            <ProfileMenuItem
              icon="information-circle-outline"
              title="About Us"
              onPress={() => router.push('/about' as any)}
            />
            <ProfileMenuItem
              icon="help-buoy-outline"
              title="Help & Support"
              onPress={() => router.push('/support' as any)}
            />
            <ProfileMenuItem
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => router.push('/terms' as any)}
            />
            <ProfileMenuItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={() => router.push('/privacy' as any)}
            />

            <View style={styles.sectionDivider} />
            <ProfileMenuItem
              icon="trash-outline"
              title="Delete Account"
              textColor="#FF4D4D"
              onPress={() => setShowDeleteAccountConfirm(true)}
              iconColor="#FF4D4D"
            />
            <ProfileMenuItem
              icon="log-out-outline"
              title="Logout"
              onPress={handleLogout}
              textColor="#FF4D4D"
              iconColor="#FF4D4D"
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <LimitModal
        visible={showVerifyUpgradeModal}
        onClose={() => setShowVerifyUpgradeModal(false)}
        onUpgrade={() => {
          setShowVerifyUpgradeModal(false);
          router.push('/subscription' as any);
        }}
        title="Get Verified"
        message="Upgrade to the Business plan to submit verification documents and get a verified badge on your profile."
        plan={currentPlanLabel}
        icon="shield-checkmark-outline"
      />

      <Modal
        visible={showVerifyPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerifyPendingModal(false)}
      >
        <View style={styles.pendingModalOverlay}>
          <View style={styles.pendingModalCard}>
            <Ionicons name="time-outline" size={40} color="#64748B" />
            <Text style={styles.pendingModalTitle}>Verification pending</Text>
            <Text style={styles.pendingModalText}>
              Your documents are under review. We will notify you once approved.
            </Text>
            <TouchableOpacity
              style={styles.pendingModalBtn}
              onPress={() => setShowVerifyPendingModal(false)}
            >
              <Text style={styles.pendingModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteAccountConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountConfirm(false)}
      >
        <View style={styles.pendingModalOverlay}>
          <View style={styles.pendingModalCard}>
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
            <Text style={styles.pendingModalTitle}>Delete account?</Text>
            <Text style={styles.pendingModalText}>
              Are you sure you want to delete your account? This action cannot be undone.
            </Text>
            <View style={styles.removeConfirmActions}>
              <TouchableOpacity
                style={styles.removeCancelBtn}
                onPress={() => setShowDeleteAccountConfirm(false)}
              >
                <Text style={styles.removeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeConfirmBtn}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.removeConfirmText}>Yes, delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteAccountSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountSuccess(false)}
      >
        <View style={styles.pendingModalOverlay}>
          <View style={styles.pendingModalCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#22C55E" />
            <Text style={styles.pendingModalTitle}>Request submitted</Text>
            <Text style={styles.pendingModalText}>
              Your account deletion request has been submitted. It will be processed within 2 to 3 working days.
            </Text>
            <TouchableOpacity
              style={styles.pendingModalBtn}
              onPress={() => setShowDeleteAccountSuccess(false)}
            >
              <Text style={styles.pendingModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemovePhotoConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemovePhotoConfirm(false)}
      >
        <View style={styles.pendingModalOverlay}>
          <View style={styles.pendingModalCard}>
            <Ionicons name="trash-outline" size={40} color="#EF4444" />
            <Text style={styles.pendingModalTitle}>Remove profile photo?</Text>
            <Text style={styles.pendingModalText}>
              Your profile will show your initial instead.
            </Text>
            <View style={styles.removeConfirmActions}>
              <TouchableOpacity
                style={styles.removeCancelBtn}
                onPress={() => setShowRemovePhotoConfirm(false)}
                disabled={uploadingPhoto}
              >
                <Text style={styles.removeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.removeConfirmBtn, uploadingPhoto && { opacity: 0.7 }]}
                onPress={confirmRemovePhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.removeConfirmText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPhotoOptions} transparent animationType="slide">
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalSheet}>
            <Text style={styles.photoModalTitle}>Update profile photo</Text>
            {user?.profilePicture ? (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleViewPhoto}>
                <Ionicons name="eye-outline" size={22} color="#FF9500" />
                <Text style={styles.photoOptionText}>View Photo</Text>
              </TouchableOpacity>
            ) : null}
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={pickFromCamera}>
                <Ionicons name="camera-outline" size={22} color="#FF9500" />
                <Text style={styles.photoOptionText}>Take Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.photoOptionBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={22} color="#FF9500" />
              <Text style={styles.photoOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {user?.profilePicture ? (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleRemovePhoto}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.photoOptionText, styles.photoRemoveText]}>Remove Photo</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.photoCancelBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.photoCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showViewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewPhoto(false)}
      >
        <View style={styles.viewPhotoOverlay}>
          <TouchableOpacity
            style={styles.viewPhotoBackdrop}
            activeOpacity={1}
            onPress={() => setShowViewPhoto(false)}
          />
          <TouchableOpacity
            style={styles.viewPhotoCloseBtn}
            onPress={() => setShowViewPhoto(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.viewPhotoImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 120
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  verifyChipPending: {
    backgroundColor: '#64748B',
  },
  verifyChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 5,
  },
  editBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
    backgroundColor: 'white',
    width: '100%',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: 'bold',
  },
  workerBtn: {
    marginTop: 15,
    width: '100%',
  },
  workerBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  workerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 25,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF9500',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  menuSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 10,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 15,
    marginBottom: 5,
    marginHorizontal: 15,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    textTransform: 'uppercase',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 5,
    letterSpacing: 1,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  photoModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  photoOptionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  photoRemoveText: {
    color: '#EF4444',
  },
  photoCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoCancelText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  pendingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pendingModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  pendingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  pendingModalText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  pendingModalBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pendingModalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  removeConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  removeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  removeCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  removeConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  removeConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  viewPhotoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewPhotoBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewPhotoCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewPhotoImage: {
    width: '92%',
    height: '72%',
    maxWidth: 420,
    borderRadius: 12,
  },
});
