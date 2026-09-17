import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryService, Category } from '@/services/category.service';
import { tokenStorage } from '@/services/tokenStorage';
import { Skeleton } from '@/components/Skeleton';
import { preventAndroidChipTextClip } from '@/utils/androidTextFix';

interface CategoryListProps {
  onSelectCategory: (id: string) => void;
  activeCategoryId: string;
}

export const CategoryList = ({ onSelectCategory, activeCategoryId }: CategoryListProps) => {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const data = await categoryService.getCategories();
        if (!cancelled) {
          setCategories([{ _id: 'all', name: 'All', icon: 'grid-outline' }, ...data]);
        }
      } catch (error) {
        console.error('Error fetching categories for list:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {loading ? (
        [1, 2, 3, 4, 5].map((_, i) => (
          <Skeleton key={i} width={100} height={40} borderRadius={20} />
        ))
      ) : categories.map((item) => (
        <TouchableOpacity
          key={item._id}
          style={[
            styles.chip,
            activeCategoryId === item._id && styles.activeChip
          ]}
          onPress={() => onSelectCategory(item._id)}
        >
          <Ionicons
            name={item.icon as any}
            size={15}
            color={activeCategoryId === item._id ? '#fff' : '#666'}
            style={styles.icon}
          />
          <Text style={[
            styles.chipText,
            preventAndroidChipTextClip(),
            activeCategoryId === item._id && styles.activeChipText
          ]}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeChip: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  icon: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeChipText: {
    color: '#fff',
  },
});
