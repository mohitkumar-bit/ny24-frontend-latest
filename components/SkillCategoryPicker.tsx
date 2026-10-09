import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePhonetic } from '@/hooks/usePhonetic';
import type { Category } from '@/services/category.service';
import { filterValidSkillIds, normalizeSkillId } from '@/utils/skillIds';
import {
  preventAndroidListItemTextClip,
  preventAndroidTextClip,
} from '@/utils/androidTextFix';

type Props = {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function SkillCategoryPicker({
  categories,
  selectedIds,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const phonetic = usePhonetic();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const categoryIds = useMemo(
    () => categories.map((cat) => normalizeSkillId(cat._id)).filter(Boolean),
    [categories]
  );

  const selectedId = useMemo(() => {
    const valid = filterValidSkillIds(selectedIds, categoryIds);
    return valid[0] || null;
  }, [selectedIds, categoryIds]);

  const selectedCategory = useMemo(
    () => categories.find((cat) => normalizeSkillId(cat._id) === selectedId) || null,
    [categories, selectedId]
  );

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const closeModal = () => {
    setModalOpen(false);
    setSearch('');
  };

  const selectSkill = useCallback(
    (rawId: string) => {
      if (disabled) return;
      const skillId = normalizeSkillId(rawId);
      if (!skillId || !categoryIds.includes(skillId)) return;

      if (selectedId === skillId) {
        onChange([]);
      } else {
        onChange([skillId]);
      }
    },
    [disabled, categoryIds, selectedId, onChange]
  );

  return (
    <View>
      <TouchableOpacity
        style={[styles.pickerTrigger, disabled && styles.pickerDisabled]}
        onPress={() => !disabled && setModalOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="shapes-outline" size={22} color="#666" style={styles.inputIcon} />
        {selectedCategory ? (
          <View style={styles.miniBadge}>
            <Ionicons name={(selectedCategory.icon as any) || 'briefcase-outline'} size={14} color="#FF9500" />
            <Text style={[styles.miniBadgeText, preventAndroidListItemTextClip()]}>{phonetic(selectedCategory.name)}</Text>
            <TouchableOpacity
              onPress={() => !disabled && onChange([])}
              style={styles.removeIcon}
              hitSlop={8}
              disabled={disabled}
            >
              <Ionicons name="close-circle" size={16} color="#FF9500" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.pickerText, preventAndroidTextClip()]}>{t('skillPicker.selectCategory')}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('skillPicker.selectCategory')}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.categorySearchWrap}>
              <Ionicons name="search" size={18} color="#999" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                placeholder={t('skillPicker.searchPlaceholder')}
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && Platform.OS !== 'ios' ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
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
                <Text style={styles.categoryEmptyText}>{t('skillPicker.noResults')}</Text>
              }
              renderItem={({ item }) => {
                const catId = normalizeSkillId(item._id);
                const isSelected = Boolean(catId && selectedId === catId);
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => selectSkill(catId)}
                  >
                    <View style={styles.categoryIconContainer}>
                      <Ionicons name={(item.icon as any) || 'briefcase-outline'} size={20} color="#FF9500" />
                    </View>
                    <Text style={[styles.categoryItemText, preventAndroidListItemTextClip()]}>{phonetic(item.name)}</Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color="#00A300" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    minHeight: 60,
    marginBottom: 10,
  },
  pickerDisabled: {
    opacity: 0.5,
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
  miniBadge: {
    flex: 1,
    backgroundColor: '#FFF5E6',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    gap: 6,
  },
  miniBadgeText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
  removeIcon: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
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
    borderRadius: 10,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
});
