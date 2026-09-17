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
  StatusBar,
  Modal,
  FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobService } from '@/services/job.service';
import { categoryService, Category } from '@/services/category.service';
import { CustomInput } from '@/components/CustomInput';
import { AGE_MAX_DIGITS, AGE_MIN, commitAgeInput, finalizeAge, sanitizeAgeInput } from '@/utils/ageInput';
import {
  preventAndroidChipTextClip,
  preventAndroidListItemTextClip,
} from '@/utils/androidTextFix';

export default function EditJobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [genderRequirement, setGenderRequirement] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cats, job] = await Promise.all([
        categoryService.getCategories(),
        jobService.getJobById(id as string)
      ]);
      
      setCategories(cats);
      
      // Populate form
      setTitle(job.title);
      setDescription(job.description);
      setPrice(job.price.toString());
      setLocation(job.location?.address || '');
      setGenderRequirement((job.requirements?.gender as any) || 'Any');
      setMinAge(
        job.requirements?.minAge != null
          ? sanitizeAgeInput(String(job.requirements.minAge))
          : ''
      );
      setMaxAge(
        job.requirements?.maxAge != null
          ? sanitizeAgeInput(String(job.requirements.maxAge))
          : ''
      );
      
      if (job.categories && Array.isArray(job.categories)) {
        const currentCats = cats.filter(c => 
          job.categories.some((jc: any) => (typeof jc === 'object' ? jc._id : jc) === c._id)
        );
        setSelectedCategories(currentCats);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load job details');
      router.back();
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async () => {
    if (!title || selectedCategories.length === 0 || !location || !description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if ((minAge && Number(minAge) < AGE_MIN) || (maxAge && Number(maxAge) < AGE_MIN)) {
        Alert.alert('Invalid age', `Age must be ${AGE_MIN} or older.`);
        setLoading(false);
        return;
      }

      await jobService.updateJob(id as string, {
        title,
        description,
        categories: selectedCategories.map(c => c._id),
        price: Number(price),
        location: {
          address: location,
          city: '', 
          state: ''
        },
        requirements: {
          gender: genderRequirement,
          minAge: finalizeAge(minAge),
          maxAge: finalizeAge(maxAge),
        }
      });
      Alert.alert('Success', 'Job post updated successfully!');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Job Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>General Information</Text>
        
        <CustomInput
          label="Title *"
          placeholder="e.g. Need a Plumber for kitchen leak"
          value={title}
          onChangeText={setTitle}
        />

        {/* Requirements */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender Requirement</Text>
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
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the job in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
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
                    <Text style={styles.miniBadgeText}>{cat.name}</Text>
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

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <CustomInput
              label="Budget (₹)"
              placeholder="0"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <CustomInput
              label="Location *"
              placeholder="Area, Street"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Update Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalList}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  skillBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillBadgeSelected: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  skillText: {
    color: '#4B5563',
    fontSize: 14,
  },
  skillTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#FF9500',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: {
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
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 15,
    color: '#333',
  },
});
