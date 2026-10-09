import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pickImageFromCamera, pickImageFromLibrary } from '@/utils/pickImage';
import { authService } from '@/services/auth.service';
import { handleAuthFailure } from '@/services/authSession';
import { fetchLiveLocation, getLocationErrorMessage } from '@/services/location.service';

const BIO_MAX = 29;
const NAME_MAX = 25;
const PLACEHOLDER_COLOR = '#9CA3AF';
const sanitizeNoNumbers = (text: string, max?: number) => {
  const cleaned = String(text ?? '').replace(/[0-9]/g, '');
  return typeof max === 'number' ? cleaned.slice(0, max) : cleaned;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [showViewPhoto, setShowViewPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = await authService.getProfile();
      setName(sanitizeNoNumbers(user.name || '', NAME_MAX));
      setEmail(user.email);
      setPhone(user.phone || '');
      setBio(sanitizeNoNumbers(user.bio || '', BIO_MAX));
      setProfilePicture(user.profilePicture || null);
      setArea(sanitizeNoNumbers(user.locationDetails?.address || user.location || ''));
      if (user.locationDetails) {
        setCity(sanitizeNoNumbers(user.locationDetails.city || ''));
        setStateName(sanitizeNoNumbers(user.locationDetails.state || ''));
        setDistrict(user.locationDetails.district || '');
        setPincode(user.locationDetails.pincode || '');
        if (user.locationDetails.coordinates?.length === 2) {
          setCoordinates(user.locationDetails.coordinates);
        }
      }
    } catch (err) {
      const redirected = await handleAuthFailure(err);
      if (redirected) return;
      console.error('Error fetching profile:', err);
      setError(t('editProfile.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveLocationHandler = async () => {
    setFetchingLocation(true);
    setError(null);
    try {
      const result = await fetchLiveLocation();

      setArea(sanitizeNoNumbers(result.address));
      setCity(sanitizeNoNumbers(result.city));
      setStateName(sanitizeNoNumbers(result.state));
      setDistrict(result.district);
      setPincode(result.pincode);
      setCoordinates(result.coordinates);
    } catch (err) {
      console.error('Location error:', err);
      Alert.alert(t('editProfile.locationFailed'), getLocationErrorMessage(err));
    } finally {
      setFetchingLocation(false);
    }
  };

  const pickFromGallery = async () => {
    setShowPhotoOptions(false);
    const uri = await pickImageFromLibrary({ aspect: [1, 1], quality: 0.45 });
    if (uri) await uploadProfilePhoto(uri);
  };

  const pickFromCamera = async () => {
    setShowPhotoOptions(false);
    const uri = await pickImageFromCamera({ aspect: [1, 1], quality: 0.45 });
    if (uri) await uploadProfilePhoto(uri);
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    setError(null);
    try {
      const updatedUser = await authService.uploadProfilePicture(uri);
      setProfilePicture(updatedUser.profilePicture || null);
    } catch (err: any) {
      const status = err.response?.status;
      const raw = err.response?.data;
      const text = typeof raw === 'string' ? raw : raw?.message || err.message || '';
      if (status === 413 || /413|Request Entity Too Large/i.test(String(text))) {
        setError(t('editProfile.photoTooLarge'));
      } else {
        setError(
          (typeof raw === 'object' && raw?.message) ||
            (typeof text === 'string' && !String(text).includes('<html')
              ? text
              : t('editProfile.photoUpdateFailed'))
        );
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    setUploadingPhoto(true);
    setError(null);
    try {
      const updatedUser = await authService.removeProfilePicture();
      setProfilePicture(updatedUser.profilePicture || null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('editProfile.photoRemoveFailed'));
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cleanName = sanitizeNoNumbers(name.trim(), NAME_MAX);
      const cleanArea = sanitizeNoNumbers(area.trim());
      const cleanCity = sanitizeNoNumbers(city.trim());
      const cleanState = sanitizeNoNumbers(stateName.trim());
      const cleanBio = sanitizeNoNumbers(bio.trim(), BIO_MAX);

      if (!cleanName) {
        setError(t('editProfile.nameRequired'));
        setSaving(false);
        return;
      }
      if (/[0-9]/.test(name) || /[0-9]/.test(area) || /[0-9]/.test(city) || /[0-9]/.test(stateName) || /[0-9]/.test(bio)) {
        setError(t('editProfile.noNumbers'));
        setSaving(false);
        return;
      }
      if (cleanBio.length > BIO_MAX) {
        setError(t('editProfile.bioMax', { max: BIO_MAX }));
        setSaving(false);
        return;
      }

      const displayLocation = [cleanArea, cleanCity, cleanState].filter(Boolean).join(', ');
      const payload: Parameters<typeof authService.updateProfile>[0] = {
        name: cleanName,
        phone,
        bio: cleanBio,
        location: displayLocation,
      };

      if (coordinates || cleanArea || cleanCity || cleanState) {
        payload.locationData = {
          address: cleanArea,
          city: cleanCity,
          state: cleanState,
          district,
          pincode,
          coordinates: coordinates || undefined,
        };
      }

      await authService.updateProfile(payload);
      router.back();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || t('editProfile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
          <Text style={[styles.saveText, (saving || loading) && { opacity: 0.5 }]}>
            {saving ? '...' : t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={() => setShowPhotoOptions(true)}
              disabled={uploadingPhoto || loading}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={['#FF9500', '#FFD200']} style={styles.avatar}>
                  <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase() || 'U'}</Text>
                </LinearGradient>
              )}
              <View style={styles.cameraIconContainer}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>{t('editProfile.tapToChangePhoto')}</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.fullName')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#000" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(text) => setName(sanitizeNoNumbers(text, NAME_MAX))}
                  maxLength={NAME_MAX}
                  placeholder={t('editProfile.fullName')}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.email')}</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#999' }]}
                  value={email}
                  editable={false}
                  placeholder={t('editProfile.email')}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.phone')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#000" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('editProfile.phone')}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.bio')}</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Ionicons name="information-circle-outline" size={22} color="#000" style={styles.textAreaIcon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={(text) => setBio(sanitizeNoNumbers(text, BIO_MAX))}
                  placeholder={t('editProfile.bioPlaceholder')}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  maxLength={BIO_MAX}
                />
              </View>
              <Text style={styles.charHint}>
                {t('editProfile.charHint', { current: bio.length, max: BIO_MAX })}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('editProfile.location')}</Text>
                <TouchableOpacity
                  style={styles.liveLocationBtn}
                  onPress={fetchLiveLocationHandler}
                  disabled={fetchingLocation}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#FF9500" />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={14} color="#FF9500" />
                      <Text style={styles.liveLocationText}>{t('editProfile.useLiveLocation')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroupNested}>
                <Text style={styles.label}>{t('editProfile.area')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={area}
                    onChangeText={(text) => setArea(sanitizeNoNumbers(text))}
                    placeholder={t('editProfile.areaPlaceholder')}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                </View>
              </View>

              <View style={styles.inputGroupNested}>
                <Text style={styles.label}>{t('editProfile.city')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={(text) => setCity(sanitizeNoNumbers(text))}
                    placeholder={t('editProfile.city')}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                </View>
              </View>

              <View style={styles.inputGroupNested}>
                <Text style={styles.label}>{t('editProfile.state')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="map-outline" size={20} color="#000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={stateName}
                    onChangeText={(text) => setStateName(sanitizeNoNumbers(text))}
                    placeholder={t('editProfile.state')}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving || loading}
          >
            <Text style={styles.saveBtnText}>
              {saving ? t('editProfile.saving') : t('editProfile.saveChanges')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showRemovePhotoConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemovePhotoConfirm(false)}
      >
        <View style={styles.removeModalOverlay}>
          <View style={styles.removeModalCard}>
            <Ionicons name="trash-outline" size={40} color="#EF4444" />
            <Text style={styles.removeModalTitle}>{t('profile.removePhoto.title')}</Text>
            <Text style={styles.removeModalText}>
              {t('profile.removePhoto.message')}
            </Text>
            <View style={styles.removeConfirmActions}>
              <TouchableOpacity
                style={styles.removeCancelBtn}
                onPress={() => setShowRemovePhotoConfirm(false)}
                disabled={uploadingPhoto}
              >
                <Text style={styles.removeCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.removeConfirmBtn, uploadingPhoto && { opacity: 0.7 }]}
                onPress={confirmRemovePhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.removeConfirmText}>{t('common.remove')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPhotoOptions} transparent animationType="slide">
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalSheet}>
            <Text style={styles.photoModalTitle}>{t('profile.photoOptions.title')}</Text>
            {profilePicture ? (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleViewPhoto}>
                <Ionicons name="eye-outline" size={22} color="#FF9500" />
                <Text style={styles.photoOptionText}>{t('profile.photoOptions.view')}</Text>
              </TouchableOpacity>
            ) : null}
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={pickFromCamera}>
                <Ionicons name="camera-outline" size={22} color="#FF9500" />
                <Text style={styles.photoOptionText}>{t('profile.photoOptions.take')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.photoOptionBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={22} color="#FF9500" />
              <Text style={styles.photoOptionText}>{t('profile.photoOptions.gallery')}</Text>
            </TouchableOpacity>
            {profilePicture ? (
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleRemovePhoto}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.photoOptionText, styles.photoRemoveText]}>{t('profile.photoOptions.remove')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.photoCancelBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.photoCancelText}>{t('common.cancel')}</Text>
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
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.viewPhotoImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  saveText: { fontSize: 18, color: '#FF9500', fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 40 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: { fontSize: 50, fontWeight: 'bold', color: '#fff' },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    backgroundColor: '#FF9500',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: { fontSize: 14, color: '#999', marginTop: 5 },
  errorText: { color: '#FF4D4D', textAlign: 'center', marginBottom: 12 },
  form: { width: '100%', marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  inputGroupNested: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  label: { fontSize: 14, color: '#666', fontWeight: '500' },
  charHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  liveLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  liveLocationText: { fontSize: 12, color: '#FF9500', fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputDisabled: { backgroundColor: '#F0F0F0' },
  textAreaWrapper: { height: 100, alignItems: 'flex-start', paddingVertical: 15 },
  inputIcon: { marginRight: 10 },
  textAreaIcon: { marginRight: 10, marginTop: 2 },
  input: { flex: 1, fontSize: 16, color: '#111', fontWeight: '500' },
  textArea: { textAlignVertical: 'top', height: '100%' },
  saveBtn: {
    backgroundColor: '#00A300',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
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
  removeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  removeModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  removeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  removeModalText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
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
});
