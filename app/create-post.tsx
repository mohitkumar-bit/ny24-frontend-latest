import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickImageFromCamera, pickImageFromLibrary } from '@/utils/pickImage';
import { CustomInput } from '@/components/CustomInput';
import { CustomButton } from '@/components/CustomButton';
import { jobService } from '@/services/job.service';
import { categoryService, Category } from '@/services/category.service';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { formatLocationDisplay } from '@/components/home/LocationBar';
import { getLocationErrorMessage } from '@/services/location.service';
import {
  AGE_MAX_DIGITS,
  AGE_MIN,
  commitAgeInput,
  finalizeAge,
  sanitizeAgeInput,
} from '@/utils/ageInput';
import {
  preventAndroidChipTextClip,
  preventAndroidLabelClip,
  preventAndroidListItemTextClip,
  preventAndroidTextClip,
} from '@/utils/androidTextFix';

const TITLE_MAX = 11;
const DESCRIPTION_MAX = 29;
const POST_SLOT_LIMIT_TITLE = 'Ad slots used';
const POST_SLOT_LIMIT_MESSAGE =
  'Your ads are used. Wait for the next 30 days for a new ad slot.';


/** Letters/spaces/punctuation only — strip digits and enforce max length */
const sanitizeNoNumbers = (text: string, max: number) =>
  text.replace(/[0-9]/g, '').slice(0, max);

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location: appLocation, loading: locationLoading, detectLocation } = useAppLocation();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationEdited, setLocationEdited] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [description, setDescription] = useState('');
  const [genderRequirement, setGenderRequirement] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState(POST_SLOT_LIMIT_MESSAGE);
  const [limitPlan, setLimitPlan] = useState<'free' | 'pro' | 'business' | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [formError, setFormError] = useState('');
  const [quota, setQuota] = useState<{
    plan: 'free' | 'pro' | 'business';
    postCount: number;
    featuredCount: number;
    postLimit: number;
    featuredLimit: number;
    extraPostPrice: number;
    extraFeaturePrice: number;
    canPostFree: boolean;
    canFeatureFree: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (formError) setFormError('');
  }, [title, selectedCategories, location, description, minAge, maxAge]);

  React.useEffect(() => {
    fetchCategories();
    jobService.getQuota().then((data) => {
      setQuota(data);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (locationEdited || !appLocation?.display) return;
    setLocation(formatLocationDisplay(appLocation));
    setLocationCity(appLocation.city || '');
    setLocationState(appLocation.state || '');
  }, [appLocation, locationEdited]);

  const handleUseCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      const detected = await detectLocation();
      if (detected) {
        setLocation(formatLocationDisplay(detected));
        setLocationCity(detected.city || '');
        setLocationState(detected.state || '');
        setLocationEdited(false);
      }
    } catch (error) {
      Alert.alert(
        'Location failed',
        error instanceof Error ? error.message : getLocationErrorMessage(error)
      );
    } finally {
      setDetectingLocation(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
      if (data.length > 0) setSelectedCategories([data[0]]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setFetchingCategories(false);
    }
  };

  const filteredCategories = React.useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategorySearch('');
  };

  const pickFromGallery = async () => {
    const uri = await pickImageFromLibrary({
      aspect: [4, 3],
      quality: 0.8,
    });
    if (uri) setPhotoUri(uri);
  };

  const pickFromCamera = async () => {
    const uri = await pickImageFromCamera({
      aspect: [4, 3],
      quality: 0.8,
    });
    if (uri) setPhotoUri(uri);
  };

  const handlePhotoPress = () => {
    setShowPhotoOptions(true);
  };

  const getPublishError = (
    cleanTitle: string,
    cleanDescription: string
  ) => {
    const missing: string[] = [];
    if (!cleanTitle) missing.push('Title');
    if (selectedCategories.length === 0) missing.push('Category');
    if (!location.trim()) missing.push('Location');
    if (!cleanDescription) missing.push('Description');
    if (missing.length > 0) {
      return `Please fill: ${missing.join(', ')}`;
    }
    if (cleanTitle.length > TITLE_MAX) {
      return `Title must be at most ${TITLE_MAX} characters.`;
    }
    if (cleanDescription.length > DESCRIPTION_MAX) {
      return `Description must be at most ${DESCRIPTION_MAX} characters.`;
    }
    if (/[0-9]/.test(title) || /[0-9]/.test(description)) {
      return 'Title and description cannot contain numbers.';
    }
    if ((minAge && Number(minAge) < AGE_MIN) || (maxAge && Number(maxAge) < AGE_MIN)) {
      return `Age must be ${AGE_MIN} or older.`;
    }
    return '';
  };

  const handlePublish = async (options?: { skipPhoto?: boolean }) => {
    if (loading) return;

    const cleanTitle = sanitizeNoNumbers(title.trim(), TITLE_MAX);
    const cleanDescription = sanitizeNoNumbers(description.trim(), DESCRIPTION_MAX);
    const error = getPublishError(cleanTitle, cleanDescription);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError('');

    setLoading(true);
    let imageUrls: string[] = [];
    try {

      if (photoUri && !options?.skipPhoto) {
        setUploadingPhoto(true);
        try {
          const imageUrl = await jobService.uploadImage(photoUri);
          imageUrls = [imageUrl];
        } catch (uploadErr: any) {
          setLoading(false);
          setUploadingPhoto(false);
          const serverMsg = uploadErr.response?.data?.message;
          setFormError(
            serverMsg ||
              'Could not upload the photo. Remove it or try again.'
          );
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      const jobBody = {
        title: cleanTitle,
        categories: selectedCategories.map(c => c._id),
        price: Number(price) || 0,
        location: {
          address: location.trim(),
          city: locationCity || location.split(',')[0]?.trim() || '',
          state: locationState,
        },
        description: cleanDescription,
        images: imageUrls,
        requirements: {
          gender: genderRequirement,
          minAge: finalizeAge(minAge),
          maxAge: finalizeAge(maxAge),
        }
      };

      const needsExtraPostPay =
        (quota?.plan === 'business' || quota?.plan === 'pro') && !quota.canPostFree;

      if (needsExtraPostPay) {
        setLimitMessage(POST_SLOT_LIMIT_MESSAGE);
        setShowLimitModal(true);
        return;
      }

      await jobService.createJob(jobBody);
      Alert.alert('Success', 'Post published successfully!');
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err.response?.status === 402) {
        setLimitMessage(POST_SLOT_LIMIT_MESSAGE);
        setShowLimitModal(true);
      } else if (err.response?.status === 403) {
        const data = err.response?.data || {};
        setLimitMessage(POST_SLOT_LIMIT_MESSAGE);
        setLimitPlan(
          data.plan === 'pro' || data.plan === 'business' || data.plan === 'free'
            ? data.plan
            : null
        );
        setShowLimitModal(true);
      } else {
        setFormError(err.response?.data?.message || 'Failed to publish post');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Upload Area */}
          <TouchableOpacity
            style={[styles.uploadArea, photoUri && styles.uploadAreaFilled]}
            activeOpacity={0.7}
            onPress={handlePhotoPress}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setPhotoUri(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={28} color="#FF3B30" />
                </TouchableOpacity>
                <View style={styles.changePhotoOverlay}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={styles.changePhotoText}>Change photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.uploadInner}>
                <Ionicons name="image-outline" size={40} color="#FF9500" />
                <Text style={styles.uploadTitle}>Add Photo (Optional)</Text>
                <Text style={styles.uploadSub}>Camera or Gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Photo options sheet */}
          <Modal
            visible={showPhotoOptions}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowPhotoOptions(false)}
          >
            <View style={styles.photoOptionsOverlay}>
              <View style={styles.photoOptionsSheet}>
                <View style={styles.photoOptionsHeader}>
                  <Text style={styles.photoOptionsTitle}>Add Photo (Optional)</Text>
                  <TouchableOpacity
                    style={styles.photoOptionsCloseBtn}
                    onPress={() => setShowPhotoOptions(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color="#334155" />
                  </TouchableOpacity>
                </View>

                <View style={styles.photoOptionsBody}>
                  <TouchableOpacity
                    style={styles.photoOptionBtn}
                    onPress={async () => {
                      setShowPhotoOptions(false);
                      await pickFromCamera();
                    }}
                  >
                    <Ionicons name="camera-outline" size={18} color="#FF9500" />
                    <Text style={styles.photoOptionText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoOptionBtn}
                    onPress={async () => {
                      setShowPhotoOptions(false);
                      await pickFromGallery();
                    }}
                  >
                    <Ionicons name="images-outline" size={18} color="#FF9500" />
                    <Text style={styles.photoOptionText}>Choose from Gallery</Text>
                  </TouchableOpacity>

                  {photoUri && (
                    <TouchableOpacity
                      style={styles.photoOptionBtnDanger}
                      onPress={() => {
                        setPhotoUri(null);
                        setShowPhotoOptions(false);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                      <Text style={[styles.photoOptionText, { color: '#FF3B30' }]}>
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.photoOptionsCancelBtn}
                  onPress={() => setShowPhotoOptions(false)}
                >
                  <Text style={styles.photoOptionsCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Form Fields */}
          <View style={styles.form}>
            <CustomInput
              label="Title *"
              placeholder="E.g. Need plumber"
              value={title}
              onChangeText={(text) => setTitle(sanitizeNoNumbers(text, TITLE_MAX))}
              icon="text-outline"
              maxLength={TITLE_MAX}
            />
            <Text style={styles.charHint}>
              {title.length}/{TITLE_MAX} · letters only, no numbers
            </Text>
            {/* Requirements */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, preventAndroidLabelClip()]}>Gender Requirement</Text>
              <View style={styles.chipRow}>
                {(['Any', 'Male', 'Female'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.reqChip, genderRequirement === g && styles.reqChipActive]}
                    onPress={() => setGenderRequirement(g)}
                  >
                    <Text style={[styles.reqChipText, preventAndroidChipTextClip(), genderRequirement === g && styles.reqChipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age Requirement</Text>
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <TextInput
                    placeholder="Min (Any)"
                    placeholderTextColor="#999"
                    style={styles.smallInput}
                    value={minAge}
                    onChangeText={(t) => setMinAge(sanitizeAgeInput(t))}
                    onBlur={() => setMinAge((v) => commitAgeInput(v))}
                    keyboardType="numeric"
                    maxLength={AGE_MAX_DIGITS}
                  />
                </View>
                <View style={styles.flex1}>
                  <TextInput
                    placeholder="Max (Any)"
                    placeholderTextColor="#999"
                    style={styles.smallInput}
                    value={maxAge}
                    onChangeText={(t) => setMaxAge(sanitizeAgeInput(t))}
                    onBlur={() => setMaxAge((v) => commitAgeInput(v))}
                    keyboardType="numeric"
                    maxLength={AGE_MAX_DIGITS}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categories *</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons name="shapes-outline" size={22} color="#666" style={styles.inputIcon} />
                <View style={styles.selectedTagsContainer}>
                  {selectedCategories.length > 0 ? (
                    selectedCategories.map(cat => (
                      <View key={cat._id} style={styles.miniBadge}>
                        <Text style={[styles.miniBadgeText, preventAndroidListItemTextClip()]}>{cat.name}</Text>
                        <TouchableOpacity
                          onPress={() => setSelectedCategories(selectedCategories.filter(c => c._id !== cat._id))}
                          style={styles.removeIcon}
                        >
                          <Ionicons name="close-circle" size={16} color="#FF9500" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.pickerText}>Select Categories</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <CustomInput
              label="Price (₹) — leave blank for Free"
              placeholder="Enter amount"
              value={price}
              onChangeText={setPrice}
              icon="cash-outline"
              keyboardType="numeric"
            />

            <View style={styles.inputGroup}>
              <View style={styles.locationLabelRow}>
                <Text style={styles.label}>Location *</Text>
                <TouchableOpacity
                  style={styles.useLocationBtn}
                  onPress={handleUseCurrentLocation}
                  disabled={detectingLocation || locationLoading}
                >
                  {detectingLocation || locationLoading ? (
                    <Text style={styles.useLocationText}>Detecting...</Text>
                  ) : (
                    <>
                      <Ionicons name="navigate" size={14} color="#00A300" />
                      <Text style={styles.useLocationText}>Use current location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <CustomInput
                placeholder="e.g. Bistupur, Jamshedpur"
                value={location}
                onChangeText={(text) => {
                  setLocationEdited(true);
                  setLocation(text);
                }}
                icon="location-outline"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <View style={styles.textAreaContainer}>
                <Ionicons name="document-text-outline" size={22} color="#666" style={styles.textAreaIcon} />
                <TextInput
                  style={styles.textArea}
                  placeholder="Short description (no numbers)..."
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={(text) =>
                    setDescription(sanitizeNoNumbers(text, DESCRIPTION_MAX))
                  }
                  multiline
                  numberOfLines={4}
                  maxLength={DESCRIPTION_MAX}
                />
              </View>
              <Text style={styles.charHint}>
                {description.length}/{DESCRIPTION_MAX} · letters only, no numbers
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={closeCategoryModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.categorySearchWrap}>
              <Ionicons name="search" size={18} color="#999" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#999"
                value={categorySearch}
                onChangeText={setCategorySearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {categorySearch.length > 0 && Platform.OS !== 'ios' ? (
                <TouchableOpacity onPress={() => setCategorySearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#BBB" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.categoryEmptyText}>No categories found</Text>
              }
              renderItem={({ item }) => {
                const isSelected = selectedCategories.some(c => c._id === item._id);
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c._id !== item._id));
                      } else {
                        setSelectedCategories([...selectedCategories, item]);
                      }
                    }}
                  >
                    <View style={styles.categoryIconContainer}>
                      <Ionicons name={item.icon as any} size={20} color="#FF9500" />
                    </View>
                    <Text style={[styles.categoryItemText, preventAndroidListItemTextClip()]}>{item.name}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#00A300" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Post Limit Modal */}
      <Modal
        visible={showLimitModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
            <View style={styles.limitModalBody}>
              <View style={styles.limitIconContainer}>
                <Ionicons name="lock-closed" size={50} color="#FF9500" />
              </View>
              
              <Text style={styles.limitTitle}>{POST_SLOT_LIMIT_TITLE}</Text>
              <Text style={styles.limitDescription}>
                {limitMessage || POST_SLOT_LIMIT_MESSAGE}
              </Text>

              <TouchableOpacity 
                style={styles.maybeLaterBtn}
                onPress={() => setShowLimitModal(false)}
              >
                <Text style={styles.maybeLaterText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        {formError ? (
          <View style={styles.formErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.publishBtn, loading && { opacity: 0.7 }]}
          activeOpacity={0.8}
          onPress={() => handlePublish()}
          disabled={loading}
        >
          <Text style={styles.publishBtnText}>
            {uploadingPhoto
              ? 'Uploading photo...'
              : loading
                ? 'Publishing...'
                : 'Publish Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    padding: 20,
    paddingBottom: 40,
  },
  uploadArea: {
    width: '100%',
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFD79D',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadAreaFilled: {
    borderStyle: 'solid',
    borderColor: '#FFE0CC',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadInner: {
    alignItems: 'center',
  },
  photoOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  photoOptionsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 14,
  },
  photoOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoOptionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoOptionsCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  photoOptionsBody: {
    gap: 10,
    marginTop: 6,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFE5CC',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingVertical: 14,
  },
  photoOptionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFD6D1',
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    paddingVertical: 14,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
  },
  photoOptionsCancelBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoOptionsCancelText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 14,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
    marginTop: 10,
  },
  uploadSub: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  form: {
    gap: 15,
  },
  inputGroup: {
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
    ...preventAndroidTextClip(),
  },
  charHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 14,
    marginLeft: 4,
  },
  locationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  useLocationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A300',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  selectedTagsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    backgroundColor: '#FFF5E6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    gap: 4,
  },
  miniBadgeText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  removeIcon: {
    padding: 2,
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 15,
    minHeight: 120,
  },
  textAreaIcon: {
    marginRight: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  formErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  publishBtn: {
    backgroundColor: '#00A300', // Green
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '70%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  categorySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  categorySearchIcon: {
    marginRight: 8,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  categoryEmptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    paddingVertical: 32,
  },
  modalList: {
    padding: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  limitModalBody: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  limitIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF8EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  limitTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  limitDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  upgradeBtn: {
    backgroundColor: '#FF9500',
    width: '100%',
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  maybeLaterBtn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maybeLaterText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reqChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
    alignItems: 'center',
  },
  reqChipActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  reqChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  reqChipTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 15,
    color: '#333',
    textAlign: 'left',
  },
});
