import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Platform,
  SafeAreaView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import type { TFunction } from 'i18next';
import { categoryService, Category } from '@/services/category.service';
import { AGE_MAX_DIGITS, commitAgeInput, finalizeAge, sanitizeAgeInput } from '@/utils/ageInput';
import { preventAndroidChipTextClip } from '@/utils/androidTextFix';

const RATE_MAX_DIGITS = 8;

const digitsOnly = (text: string, max: number) =>
  text.replace(/[^0-9]/g, '').slice(0, max);

const genderLabel = (value: string, t: TFunction) => {
  switch (value) {
    case 'Male':
      return t('filter.male');
    case 'Female':
      return t('filter.female');
    default:
      return value;
  }
};

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  showLongDistance?: boolean;
  onApply: (filters: { 
    category?: string; 
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    gender?: string;
    interestedInLongDistance?: boolean;
    minAge?: string;
    maxAge?: string;
    verifiedOnly?: boolean;
  }) => void;
  initialFilters?: { 
    category?: string; 
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    gender?: string;
    interestedInLongDistance?: boolean;
    minAge?: string;
    maxAge?: string;
    verifiedOnly?: boolean;
  };
}

export const FilterModal = ({ isVisible, onClose, onApply, initialFilters, showLongDistance = false }: FilterModalProps) => {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilters?.category || '');
  const [city, setCity] = useState(initialFilters?.city || '');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice || '');
  const [gender, setGender] = useState(initialFilters?.gender || '');
  const [longDistance, setLongDistance] = useState(initialFilters?.interestedInLongDistance || false);
  const [minAge, setMinAge] = useState(initialFilters?.minAge || '');
  const [maxAge, setMaxAge] = useState(initialFilters?.maxAge || '');
  const [verifiedOnly, setVerifiedOnly] = useState(initialFilters?.verifiedOnly || false);

  const TOP_CATEGORY_COUNT = 8;

  React.useEffect(() => {
    if (!isVisible) {
      setCategorySearch('');
      setShowAllCategories(false);
      return;
    }
    fetchCategories();
  }, [isVisible]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories for filter:', error);
    }
  };

  const filteredCategories = React.useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return null;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const topCategories = React.useMemo(() => {
    const top = categories.slice(0, TOP_CATEGORY_COUNT);
    if (!selectedCategory) return top;
    const selected = categories.find((c) => c._id === selectedCategory);
    if (selected && !top.some((c) => c._id === selected._id)) {
      return [selected, ...top.slice(0, TOP_CATEGORY_COUNT - 1)];
    }
    return top;
  }, [categories, selectedCategory]);

  const isSearching = categorySearch.trim().length > 0;
  const displayCategories = isSearching
    ? filteredCategories ?? []
    : showAllCategories
      ? categories
      : topCategories;
  const canViewAll =
    !isSearching && categories.length > TOP_CATEGORY_COUNT;

  const handleApply = () => {
    const finalizedMinAge = finalizeAge(minAge);
    const finalizedMaxAge = finalizeAge(maxAge);
    onApply({
      category: selectedCategory,
      city: city.trim(),
      minPrice,
      maxPrice,
      gender,
      interestedInLongDistance: longDistance,
      minAge: finalizedMinAge != null ? String(finalizedMinAge) : '',
      maxAge: finalizedMaxAge != null ? String(finalizedMaxAge) : '',
      verifiedOnly,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedCategory('');
    setCategorySearch('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setGender('');
    setLongDistance(false);
    setMinAge('');
    setMaxAge('');
    setVerifiedOnly(false);
    onApply({});
    onClose();
  };

  const renderCategoryChip = (cat: Category) => (
    <TouchableOpacity
      key={cat._id}
      style={[
        styles.categoryChip,
        selectedCategory === cat._id && styles.activeChip,
      ]}
      onPress={() =>
        setSelectedCategory(selectedCategory === cat._id ? '' : cat._id)
      }
    >
      <Ionicons
        name={cat.icon as any}
        size={16}
        color={selectedCategory === cat._id ? '#fff' : '#666'}
      />
      <Text
        style={[
          styles.categoryText,
          preventAndroidChipTextClip(),
          selectedCategory === cat._id && styles.activeCategoryText,
        ]}
      >
        {phonetic(cat.name)}
      </Text>
    </TouchableOpacity>
  );

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('filter.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces
          >
                {/* City Filter */}
                <Text style={styles.sectionTitle}>{t('filter.location')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    placeholder={t('filter.cityPlaceholder')}
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                {/* Category Filter */}
                <Text style={styles.sectionTitle}>{t('filter.category')}</Text>
                <View style={styles.categorySearchWrap}>
                  <Ionicons name="search" size={18} color="#999" style={styles.inputIcon} />
                  <TextInput
                    placeholder={t('filter.searchCategories')}
                    placeholderTextColor="#999"
                    style={styles.categorySearchInput}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {categorySearch.length > 0 ? (
                    <TouchableOpacity onPress={() => setCategorySearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#BBB" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categorySubLabel}>
                    {isSearching
                      ? t('filter.results')
                      : showAllCategories
                        ? t('filter.allCategories', { total: categories.length })
                        : t('filter.topCategories')}
                  </Text>
                  {canViewAll ? (
                    <TouchableOpacity
                      onPress={() => setShowAllCategories((v) => !v)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.viewAllText}>
                        {showAllCategories ? t('filter.showLess') : t('filter.viewAll')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {showAllCategories && !isSearching ? (
                  <ScrollView
                    style={styles.allCategoriesScroll}
                    contentContainerStyle={styles.categoriesContainer}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {displayCategories.length > 0 ? (
                      displayCategories.map(renderCategoryChip)
                    ) : (
                      <Text style={styles.categoryEmptyText}>{t('filter.noCategories')}</Text>
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.categoriesContainer}>
                    {displayCategories.length > 0 ? (
                      displayCategories.map(renderCategoryChip)
                    ) : (
                      <Text style={styles.categoryEmptyText}>{t('filter.noCategories')}</Text>
                    )}
                  </View>
                )}

                {/* Price Filter */}
                <Text style={styles.sectionTitle}>{t('filter.hourlyRate')}</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <TextInput
                      placeholder={t('filter.min')}
                      placeholderTextColor="#999"
                      style={styles.smallInput}
                      value={minPrice}
                      onChangeText={(text) => setMinPrice(digitsOnly(text, RATE_MAX_DIGITS))}
                      keyboardType="numeric"
                      maxLength={RATE_MAX_DIGITS}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <TextInput
                      placeholder={t('filter.max')}
                      placeholderTextColor="#999"
                      style={styles.smallInput}
                      value={maxPrice}
                      onChangeText={(text) => setMaxPrice(digitsOnly(text, RATE_MAX_DIGITS))}
                      keyboardType="numeric"
                      maxLength={RATE_MAX_DIGITS}
                    />
                  </View>
                </View>

                {/* Age Filter */}
                <Text style={styles.sectionTitle}>{t('filter.ageRange')}</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <TextInput
                      placeholder={t('filter.minAge')}
                      placeholderTextColor="#999"
                      style={styles.smallInput}
                      value={minAge}
                      onChangeText={(text) => setMinAge(sanitizeAgeInput(text))}
                      onBlur={() => setMinAge((v) => commitAgeInput(v))}
                      keyboardType="numeric"
                      maxLength={AGE_MAX_DIGITS}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <TextInput
                      placeholder={t('filter.maxAge')}
                      placeholderTextColor="#999"
                      style={styles.smallInput}
                      value={maxAge}
                      onChangeText={(text) => setMaxAge(sanitizeAgeInput(text))}
                      onBlur={() => setMaxAge((v) => commitAgeInput(v))}
                      keyboardType="numeric"
                      maxLength={AGE_MAX_DIGITS}
                    />
                  </View>
                </View>

                {/* Gender Filter */}
                <Text style={styles.sectionTitle}>{t('filter.gender')}</Text>
                <View style={styles.categoriesContainer}>
                  {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.categoryChip,
                        gender === g && styles.activeChip
                      ]}
                      onPress={() => setGender(gender === g ? '' : g)}
                    >
                      <Text style={[
                        styles.categoryText,
                        preventAndroidChipTextClip(),
                        gender === g && styles.activeCategoryText
                      ]}>{genderLabel(g, t)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Verified Filter */}
                <View style={styles.switchRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.switchLabel}>{t('filter.verifiedOnly')}</Text>
                    <Text style={styles.switchSubLabel}>{t('filter.verifiedOnlyHint')}</Text>
                  </View>
                  <Switch
                    value={verifiedOnly}
                    onValueChange={setVerifiedOnly}
                    trackColor={{ false: '#767577', true: '#00A300' }}
                    thumbColor={verifiedOnly ? '#fff' : '#f4f3f4'}
                  />
                </View>

                {/* Long Distance Filter (Workers only) */}
                {showLongDistance && (
                  <View style={styles.switchRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.switchLabel}>{t('filter.longDistance')}</Text>
                      <Text style={styles.switchSubLabel}>{t('filter.longDistanceHint')}</Text>
                    </View>
                    <Switch
                      value={longDistance}
                      onValueChange={setLongDistance}
                      trackColor={{ false: '#767577', true: '#FF9500' }}
                      thumbColor={longDistance ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>

              <SafeAreaView style={styles.footer}>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Text style={styles.clearBtnText}>{t('filter.clearAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                  <LinearGradient
                    colors={['#FF9500', '#FFD200']}
                    style={styles.applyGradient}
                  >
                    <Text style={styles.applyBtnText}>{t('filter.applyFilter')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </SafeAreaView>
            </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '60%',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeBtn: {
    padding: 5,
  },
  content: {
    flexGrow: 0,
    flexShrink: 1,
  },
  contentContainer: {
    padding: 25,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  categorySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categorySubLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9500',
  },
  allCategoriesScroll: {
    maxHeight: 220,
    marginBottom: 8,
  },
  categoryEmptyText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  activeChip: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  clearBtn: {
    flex: 1,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  clearBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    height: 55,
    borderRadius: 15,
    overflow: 'hidden',
  },
  applyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  flex1: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#333',
    textAlign: 'left',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
