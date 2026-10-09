import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { workerService } from '@/services/worker.service';
import { authService } from '@/services/auth.service';
import { categoryService, Category } from '@/services/category.service';
import { CustomInput } from '@/components/CustomInput';
import { SkillCategoryPicker } from '@/components/SkillCategoryPicker';
import { normalizeSkillId, parseSkillIds, filterValidSkillIds } from '@/utils/skillIds';
import {
  fetchLiveLocation,
  getLocationErrorMessage,
} from '@/services/location.service';
import { AGE_MAX_DIGITS, AGE_MIN, commitAgeInput, finalizeAge, sanitizeAgeInput } from '@/utils/ageInput';
import {
  preventAndroidLabelClip,
  preventAndroidListItemTextClip,
  preventAndroidTextClip,
} from '@/utils/androidTextFix';

const normalizeCategories = (items: Category[]): Category[] =>
  items.map((cat) => ({ ...cat, _id: normalizeSkillId(cat._id) }));

const TITLE_MAX = 21;
const EXPERIENCE_MAX = 2;
const RATE_MAX = 7;
const PINCODE_MAX = 8;

const sanitizeNoNumbers = (text: string, max?: number) => {
  const cleaned = String(text ?? '').replace(/[0-9]/g, '');
  return typeof max === 'number' ? cleaned.slice(0, max) : cleaned;
};

const digitsOnly = (text: string, max: number) =>
  String(text ?? '').replace(/[^0-9]/g, '').slice(0, max);

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

export default function WorkerRegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const genderLabel = (value: string) => {
    switch (value) {
      case 'Male':
        return t('gender.male');
      case 'Female':
        return t('gender.female');
      case 'Other':
        return t('gender.other');
      default:
        return value;
    }
  };
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [interestedInLongDistance, setInterestedInLongDistance] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [formReady, setFormReady] = useState(false);

  const sanitizeDescription = (text: string) => {
    // Description must be max 26 chars and cannot contain numbers.
    return text.replace(/\d/g, '').slice(0, 26);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setFormReady(false);
      try {
        const cats = await categoryService.getCategories();
        const normalizedCats = normalizeCategories(cats);
        setCategories(normalizedCats);

        const user = await authService.getProfile();
        if (user.isWorker) {
          setIsEdit(true);
          const workerData = await workerService.getMyProfile();
          const profile = workerData.profile;

          setTitle(sanitizeNoNumbers(profile.title || '', TITLE_MAX));
          setDescription(sanitizeDescription(profile.description || ''));
          setSelectedSkills(
            filterValidSkillIds(parseSkillIds(profile.skills), normalizedCats.map((c) => c._id)).slice(0, 1)
          );
          setExperience(digitsOnly(String(profile.experience ?? ''), EXPERIENCE_MAX));
          setHourlyRate(digitsOnly(String(profile.hourlyRate ?? ''), RATE_MAX));
          setAddress(String(profile.location?.address || ''));
          setCity(profile.location?.city || '');
          setState(profile.location?.state || '');
          setCountry(profile.location?.country || '');
          setPincode(digitsOnly(profile.location?.pincode || '', PINCODE_MAX));
          if (
            Array.isArray(profile.location?.coordinates) &&
            profile.location.coordinates.length === 2
          ) {
            setCoordinates(profile.location.coordinates as [number, number]);
          }
          setAge(
            profile.age != null ? sanitizeAgeInput(String(profile.age)) : ''
          );
          setGender(profile.gender || '');
          setInterestedInLongDistance(!!profile.interestedInLongDistance);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setFormReady(true);
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSkillsChange = (ids: string[]) => {
    setSelectedSkills(ids.slice(0, 1));
  };

  const handleUseLiveLocation = async () => {
    setDetectingLocation(true);
    try {
      const resolved = await fetchLiveLocation();
      setAddress(String(resolved.address || resolved.city || ''));
      setCity(resolved.city || resolved.district || '');
      setState(resolved.state || '');
      setCountry(resolved.country || '');
      setPincode(digitsOnly(resolved.pincode || '', PINCODE_MAX));
      setCoordinates(resolved.coordinates);
    } catch (error) {
      Alert.alert(t('workerRegister.locationFailed'), getLocationErrorMessage(error));
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async () => {
    const cleanTitle = sanitizeNoNumbers(title.trim(), TITLE_MAX);

    if (!cleanTitle || !hourlyRate || selectedSkills.length === 0) {
      Alert.alert(t('common.error'), t('workerRegister.requiredFields'));
      return;
    }

    if (/\d/.test(title)) {
      Alert.alert(t('common.error'), t('workerRegister.titleNoNumbers'));
      return;
    }

    if (cleanTitle.length > TITLE_MAX) {
      Alert.alert(t('common.error'), t('workerRegister.titleMax', { max: TITLE_MAX }));
      return;
    }

    if (/\d/.test(description)) {
      Alert.alert(t('common.error'), t('workerRegister.descriptionNoNumbers'));
      return;
    }

    if (description.length > 26) {
      Alert.alert(t('common.error'), t('workerRegister.descriptionMax', { max: 26 }));
      return;
    }

    if (age && Number(age) < AGE_MIN) {
      Alert.alert(t('common.error'), t('workerRegister.ageMin', { min: AGE_MIN }));
      return;
    }

    const payload = {
      title: cleanTitle,
      description,
      skills: selectedSkills,
      experience: Number(experience) || 0,
      hourlyRate: Number(hourlyRate),
      location: {
        type: 'Point',
        address,
        city,
        state,
        country,
        pincode: digitsOnly(pincode, PINCODE_MAX),
        coordinates,
      },
      age: finalizeAge(age) ?? undefined,
      gender: gender || undefined,
      interestedInLongDistance
    };

    setLoading(true);
    try {
      if (isEdit) {
        await workerService.updateProfile(payload);
        Alert.alert(t('common.success'), t('workerRegister.profileUpdated'));
      } else {
        await workerService.createProfile(payload);
        Alert.alert(t('common.success'), t('workerRegister.profileCreated'));
      }
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('workerRegister.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? t('workerRegister.editTitle') : t('workerRegister.becomeWorker')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>{t('workerRegister.professionalInfo')}</Text>

        <CustomInput
          label={t('workerRegister.professionalTitle')}
          placeholder={t('workerRegister.titlePlaceholder')}
          value={title}
          onChangeText={(text) => setTitle(sanitizeNoNumbers(text, TITLE_MAX))}
          maxLength={TITLE_MAX}
        />
        <Text style={styles.charHint}>
          {t('workerRegister.charHint', { current: title.length, max: TITLE_MAX })}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('workerRegister.description')}</Text>
          <TextInput
            style={styles.textArea}
            placeholder={t('workerRegister.descriptionPlaceholder')}
            placeholderTextColor="#999"
            value={description}
            onChangeText={(text) => setDescription(sanitizeDescription(text))}
            multiline
            numberOfLines={4}
            maxLength={26}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('workerRegister.skillsCategories')}</Text>
        <SkillCategoryPicker
          categories={categories}
          selectedIds={selectedSkills}
          onChange={handleSkillsChange}
          disabled={!formReady || loading}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <CustomInput
              label={t('workerRegister.experience')}
              placeholder="0"
              value={experience}
              onChangeText={(text) => setExperience(digitsOnly(text, EXPERIENCE_MAX))}
              keyboardType="numeric"
              maxLength={EXPERIENCE_MAX}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput
              label={t('workerRegister.hourlyRate')}
              placeholder="0"
              value={hourlyRate}
              onChangeText={(text) => setHourlyRate(digitsOnly(text, RATE_MAX))}
              keyboardType="numeric"
              maxLength={RATE_MAX}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('workerRegister.location')}</Text>
        <View style={styles.inputGroup}>
          <View style={styles.addressLabelRow}>
            <Text style={[styles.label, preventAndroidLabelClip()]}>{t('workerRegister.address')}</Text>
            <TouchableOpacity
              style={[
                styles.liveLocationChip,
                detectingLocation && styles.liveLocationBtnDisabled,
              ]}
              onPress={handleUseLiveLocation}
              disabled={detectingLocation || loading}
            >
              {detectingLocation ? (
                <ActivityIndicator color="#00A300" size="small" />
              ) : (
                <>
                  <Ionicons name="navigate" size={14} color="#00A300" />
                  <Text style={styles.liveLocationChipText}>{t('workerRegister.liveLocation')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('workerRegister.addressPlaceholder')}
            placeholderTextColor="#999"
            value={address}
            onChangeText={setAddress}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <CustomInput
              label={t('workerRegister.city')}
              placeholder={t('workerRegister.cityPlaceholder')}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput
              label={t('workerRegister.pincode')}
              placeholder={t('workerRegister.pincodePlaceholder')}
              value={pincode}
              onChangeText={(text) => setPincode(digitsOnly(text, PINCODE_MAX))}
              keyboardType="numeric"
              maxLength={PINCODE_MAX}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <CustomInput
              label={t('workerRegister.state')}
              placeholder={t('workerRegister.statePlaceholder')}
              value={state}
              onChangeText={setState}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput
              label={t('workerRegister.country')}
              placeholder={t('workerRegister.countryPlaceholder')}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('workerRegister.personalDetails')}</Text>
        <View style={styles.row}>
          <View style={{ flex: 0.35, marginRight: 15 }}>
            <Text style={styles.label}>{t('workerRegister.age')}</Text>
            <TextInput
              placeholder={t('workerRegister.agePlaceholder')}
              placeholderTextColor="#999"
              value={age}
              style={styles.input}
              onChangeText={(text) => setAge(sanitizeAgeInput(text))}
              onBlur={() => setAge((v) => commitAgeInput(v))}
              keyboardType="numeric"
              maxLength={AGE_MAX_DIGITS}
            />
          </View>
          <View style={{ flex: 0.65 }}>
            <Text style={styles.label}>{t('workerRegister.gender')}</Text>
            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={[
                styles.dropdownText,
                !gender && { color: '#999' }
              ]}>
                {gender ? genderLabel(gender) : t('workerRegister.select')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showGenderModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGenderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowGenderModal(false)}
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('workerRegister.selectGender')}</Text>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionBtn}
                  onPress={() => {
                    setGender(option as any);
                    setShowGenderModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      preventAndroidListItemTextClip(),
                      gender === option && styles.optionTextSelected,
                    ]}
                  >
                    {genderLabel(option)}
                  </Text>
                  {gender === option ? (
                    <Ionicons name="checkmark" size={20} color="#00A300" />
                  ) : (
                    <View style={styles.optionCheckPlaceholder} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('workerRegister.longDistanceLabel')}</Text>
            <Text style={styles.toggleSubLabel}>{t('workerRegister.longDistanceHint')}</Text>
          </View>
          <Switch
            value={interestedInLongDistance}
            onValueChange={setInterestedInLongDistance}
            trackColor={{ false: '#767577', true: '#00A300' }}
            thumbColor={interestedInLongDistance ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{isEdit ? t('workerRegister.updateProfile') : t('workerRegister.createProfile')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  liveLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8E8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveLocationBtnDisabled: {
    opacity: 0.7,
  },
  liveLocationChipText: {
    color: '#00A300',
    fontSize: 12,
    fontWeight: '600',
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressLabel: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    ...preventAndroidTextClip(),
  },
  charHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    height: 100,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#00A300',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
    shadowColor: '#00A300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#666',
  },
  optionCheckPlaceholder: {
    width: 20,
    height: 20,
  },
  optionTextSelected: {
    color: '#00A300',
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
