import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '@/services/category.service';
import { filterValidSkillIds, normalizeSkillId } from '@/utils/skillIds';

const TOP_SKILL_COUNT = 8;

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
  const [search, setSearch] = useState('');

  const categoryIds = useMemo(
    () => categories.map((cat) => normalizeSkillId(cat._id)).filter(Boolean),
    [categories]
  );

  const selectedId = useMemo(() => {
    const valid = filterValidSkillIds(selectedIds, categoryIds);
    return valid[0] || null;
  }, [selectedIds, categoryIds]);

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

  const selectedName = useMemo(() => {
    if (!selectedId) return null;
    return categories.find((cat) => normalizeSkillId(cat._id) === selectedId)?.name ?? null;
  }, [categories, selectedId]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const topCategories = useMemo(() => {
    const top = categories.slice(0, TOP_SKILL_COUNT);
    if (!selectedId) return top;
    const selected = categories.find((c) => normalizeSkillId(c._id) === selectedId);
    if (selected && !top.some((c) => normalizeSkillId(c._id) === selectedId)) {
      return [selected, ...top.slice(0, TOP_SKILL_COUNT - 1)];
    }
    return top;
  }, [categories, selectedId]);

  const displayCategories = filteredCategories ?? topCategories;
  const isSearching = search.trim().length > 0;

  return (
    <View>
      <Text style={styles.hint}>Select one skill — tap another to switch</Text>
      {selectedName ? (
        <Text style={styles.count}>Selected: {selectedName}</Text>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#BBB" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.subLabel}>{isSearching ? 'Results' : 'Top skills'}</Text>

      <View style={styles.container}>
        {displayCategories.length > 0 ? (
          displayCategories.map((cat, index) => {
            const catId = normalizeSkillId(cat._id);
            const isSelected = catId ? selectedId === catId : false;

            return (
              <Pressable
                key={catId || `category-${index}`}
                style={({ pressed }) => [
                  styles.badge,
                  isSelected && styles.badgeSelected,
                  pressed && !disabled && styles.badgePressed,
                  disabled && styles.badgeDisabled,
                ]}
                onPress={() => selectSkill(catId)}
                disabled={disabled || !catId}
              >
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No skills found</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    color: '#00A300',
    fontWeight: '600',
    marginBottom: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    marginTop: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 8,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeSelected: {
    backgroundColor: '#00A300',
    borderColor: '#00A300',
  },
  badgePressed: {
    opacity: 0.85,
  },
  badgeDisabled: {
    opacity: 0.5,
  },
  badgeText: {
    color: '#4B5563',
    fontSize: 14,
  },
  badgeTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
